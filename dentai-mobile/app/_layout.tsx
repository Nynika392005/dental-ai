import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '../lib/api';

function warmUpBackend() {
  api.get('/').catch(() => {});
}

export default function RootLayout() {
  const { isLoading, token, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    warmUpBackend();
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!token && !inAuthGroup) router.replace('/(auth)/login');
    else if (token && inAuthGroup) router.replace('/(tabs)');
  }, [token, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1A7FD4" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)"        options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
        {/* Stack screens — NOT shown as tabs */}
        <Stack.Screen name="chat/[id]"     options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="analysis/scan" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="appointments/book" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="education/[slug]"  options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
