import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// Backend URLs - automatically switches between development and production
const BACKEND_URLS = [
  'http://172.23.52.69:8000',            // LOCAL DEV - Current Wi-Fi IP
  'https://dental-ai-8qr1.onrender.com',  // PRODUCTION - Render deployment
  'http://172.20.10.2:8000',              // LOCAL DEV - Primary IP
  'http://172.19.112.1:8000',             // LOCAL DEV - Alternative IP
  'http://192.168.1.100:8000',            // LOCAL DEV - Common local network IP
  'http://localhost:8000',                // LOCAL DEV - Localhost (emulator only)
];

let currentBackendUrl = BACKEND_URLS[0];
let failureCount = 0;
const MAX_FAILURES = 10; // Stop trying after 10 failures

export const api = axios.create({
  baseURL: currentBackendUrl,
  timeout: 15000, // 15 second timeout
  // Don't set default Content-Type - let axios handle it based on request data
});

// Extend the config interface to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: { startTime: number };
  }
}

// Auto-retry with different backend URLs on network failure
api.interceptors.request.use(
  async (config) => {
    // console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    const start = Date.now();
    config.metadata = { startTime: start };
    
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Only set JSON content type for non-FormData requests
    if (!(config.data instanceof FormData) && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error: unknown) => {
    // console.error('📡 Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    const duration = Date.now() - (response.config.metadata?.startTime || 0);
    // console.log(`✅ API Response: ${response.status} in ${duration}ms`);
    
    // Reset failure count on success
    failureCount = 0;
    
    return response;
  },
  async (error: any) => {
    const duration = Date.now() - (error.config?.metadata?.startTime || 0);
    const statusCode = error.response?.status;
    
    // Handle 409 Conflict as a warning (expected business logic, not an error)
    if (statusCode === 409) {
      // console.warn(`⚠️  API Conflict: ${statusCode} in ${duration}ms - ${error.response?.data?.detail || 'Resource conflict'}`);
      return Promise.reject(error);
    }
    
    // Log other errors normally (keep for debugging critical issues)
    // console.error(`❌ API Error: ${statusCode || 'Network'} in ${duration}ms`);
    
    // Don't retry on authentication errors or client errors (4xx)
    if (statusCode === 401) {
      // console.log('🔐 Authentication required - user may need to login');
      return Promise.reject(error);
    }
    
    // Don't retry on other client errors (400-499) - these are not network issues
    if (statusCode >= 400 && statusCode < 500) {
      // console.error('❌ Client error - no retry needed');
      return Promise.reject(error);
    }
    
    // Only retry on actual network errors (no response received)
    const isNetworkError = error.code === 'ECONNREFUSED' || 
                          error.message === 'Network Error' || 
                          !error.response;
                          
    if (!isNetworkError) {
      // console.error('❌ Server error (not network) - no retry needed');
      return Promise.reject(error);
    }
    
    // Increment failure count only for network errors
    failureCount++;
    
    // Circuit breaker - stop retrying after too many failures
    if (failureCount >= MAX_FAILURES) {
      // console.error(`🚨 Circuit breaker activated: ${failureCount} consecutive failures. Stopping all retries.`);
      return Promise.reject(new Error(`Network circuit breaker activated after ${failureCount} failures. Please check your internet connection and restart the app.`));
    }
    
    // Prevent infinite retry loops
    if (error.config._retryCount === undefined) {
      error.config._retryCount = 0;
    }
    
    // Only retry network errors and only if we haven't tried all backends yet
    if (error.config._retryCount < BACKEND_URLS.length - 1) {
      error.config._retryCount++;
      
      const currentIndex = BACKEND_URLS.indexOf(currentBackendUrl);
      const nextIndex = (currentIndex + 1) % BACKEND_URLS.length;
      
      currentBackendUrl = BACKEND_URLS[nextIndex];
      api.defaults.baseURL = currentBackendUrl;
      // console.log(`🔄 Trying backup backend ${error.config._retryCount}/${BACKEND_URLS.length - 1}: ${currentBackendUrl}`);
      
      // Update the config for retry
      error.config.baseURL = currentBackendUrl;
      
      // Retry the request with new URL
      return api.request(error.config);
    }
    
    // All backends tried - stop retrying
    // console.error('❌ All backends failed or non-network error. Stopping retries.');
    // console.error('Error details:', error.message || 'Unknown error');
    return Promise.reject(error);
  }
);

// Test backend connectivity
export const testBackendConnection = async () => {
  try {
    const response = await api.get('/mobile-test');
    // console.log('✅ Backend connected:', response.data);
    return true;
  } catch (error: any) {
    // console.error('❌ Backend connection failed:', error?.message || 'Unknown error');
    return false;
  }
};

// Reset circuit breaker manually
export const resetCircuitBreaker = () => {
  failureCount = 0;
  // console.log('🔄 Circuit breaker reset. Retries enabled.');
};

// Get current failure count
export const getFailureCount = () => failureCount;
