import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export default function SmartScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const type = (params.type as string || 'tooth').toLowerCase();

  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const config = {
    medicine: { title: 'Medicine Strip', icon: 'pill', description: 'Extract dosage and warnings.' },
    tooth: { title: 'Tooth Analysis', icon: 'tooth-outline', description: 'AI check for cavities.' },
    food: { title: 'Food Analyzer', icon: 'food-apple-outline', description: 'Check dental impact.' },
    habit: { title: 'Habit Sentinel', icon: 'shield-search', description: 'Detect grinding signs.' }
  }[type] || { title: 'AI Scanner', icon: 'auto-fix', description: 'Analyze your image.' };

  const pickImage = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5
    });
    if (!res.canceled) setImage(res.assets[0].uri);
  };

  const testConnectivity = async () => {
    try {
      console.log('Testing basic connectivity...');
      const response = await api.get('/mobile-test');
      console.log('✅ Basic connectivity test passed:', response.data);
      
      // Test JSON base64 upload directly with a tiny test image
      console.log('Testing JSON base64 upload...');
      
      // Create a minimal 1x1 PNG in base64
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      const testResponse = await api.post('/mobile-scan', {
        task_type: 'medicine',
        image_base64: testImageBase64,
        filename: 'test.png'
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      
      console.log('✅ JSON upload test passed:', testResponse.data);
      Alert.alert(
        'Success!', 
        `✅ Network connectivity working!\n✅ JSON upload working!\n✅ AI analysis: ${testResponse.data.service || 'Ready'}\n\nYour scanner should work perfectly now.`
      );
      return true;
    } catch (error: any) {
      console.error('❌ Connectivity test failed:', error);
      Alert.alert(
        'Connection Test Failed', 
        `❌ Error: ${error.response?.data?.detail || error.message || 'Unknown error'}\n\nThis will help diagnose the issue.`
      );
      return false;
    }
  };

  const handleScan = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);
    
    console.log('🚀 Starting image upload process...');
    
    // Skip multipart attempt - go straight to JSON method that works
    try {
      console.log('🔄 Converting image to base64...');
      
      // Fetch and convert image to base64
      const response = await fetch(image);
      const blob = await response.blob();
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (result && result.includes(',')) {
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          } else {
            reject(new Error('Failed to convert image to base64'));
          }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
      
      console.log('✅ Base64 conversion complete, uploading via JSON...');
      
      const jsonRes = await api.post('/mobile-scan', {
        task_type: type,
        image_base64: base64,
        filename: 'photo.jpg'
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      
      console.log('🎉 SUCCESS: Mobile scan worked!');
      
      // Filter response based on scan type - each has different relevant fields
      let cleanResult;
      
      if (type === 'medicine') {
        cleanResult = {
          name: jsonRes.data.name,
          medical_purpose: jsonRes.data.medical_purpose,
          dosage_instructions: jsonRes.data.dosage_instructions,
          safety_warnings: jsonRes.data.safety_warnings,
          ai_analysis: jsonRes.data.ai_analysis || jsonRes.data.ai_response || jsonRes.data.analysis || "Analysis completed",
          confidence: jsonRes.data.confidence
        };
      } else if (type === 'tooth') {
        cleanResult = {
          findings: jsonRes.data.findings,
          professional_recommendations: jsonRes.data.professional_recommendations,
          urgency: jsonRes.data.urgency,
          ai_analysis: jsonRes.data.ai_analysis || jsonRes.data.ai_response || jsonRes.data.analysis || "Analysis completed",
          confidence: jsonRes.data.confidence
        };
      } else if (type === 'food') {
        cleanResult = {
          impact_score: jsonRes.data.impact_score,
          dental_analysis: jsonRes.data.dental_analysis,
          preventative_advice: jsonRes.data.preventative_advice,
          ai_analysis: jsonRes.data.ai_analysis || jsonRes.data.ai_response || jsonRes.data.analysis || "Analysis completed",
          confidence: jsonRes.data.confidence
        };
      } else if (type === 'habit') {
        cleanResult = {
          detected_habit: jsonRes.data.detected_habit,
          confidence_score: jsonRes.data.confidence_score,
          long_term_risks: jsonRes.data.long_term_risks,
          clinical_advice: jsonRes.data.clinical_advice,
          ai_analysis: jsonRes.data.ai_analysis || jsonRes.data.ai_response || jsonRes.data.analysis || "Analysis completed"
        };
      } else {
        // Fallback - show all fields
        cleanResult = jsonRes.data;
      }
      
      setResult(cleanResult);
      
    } catch (jsonError: any) {
      console.error('💥 Upload failed:');
      console.error('Error details:', {
        message: jsonError.message,
        status: jsonError.response?.status,
        data: jsonError.response?.data
      });
      
      let errorMessage = 'Upload failed';
      if (jsonError.response?.status === 401) {
        errorMessage = 'Please log out and log back in.';
      } else if (jsonError.response?.data?.detail) {
        errorMessage = jsonError.response.data.detail;
      } else if (jsonError.message) {
        errorMessage = jsonError.message;
      }
      
      Alert.alert("Upload Failed", `Image analysis failed: ${errorMessage}`);
    }
    
    setLoading(false);
  };

  // Helper to render any value (String, Number, Object, or Array)
  const renderValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined) return <Text style={styles.itemText}>N/A</Text>;

    if (Array.isArray(val)) {
      return (
        <View style={styles.listContainer}>
          {val.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Icon name="circle-small" size={20} color="#1A7FD4" />
              <Text style={styles.itemText}>{String(item)}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (typeof val === 'object') {
      return (
        <View style={styles.nestedBox}>
          {Object.entries(val).map(([k, v]) => (
            <View key={k} style={styles.nestedRow}>
              <Text style={styles.nestedKey}>{k.replace(/_/g, ' ')}:</Text>
              <Text style={styles.nestedValue}>{String(v)}</Text>
            </View>
          ))}
        </View>
      );
    }

    return <Text style={styles.itemText}>{String(val)}</Text>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>{config.title}</Text>
        <TouchableOpacity onPress={testConnectivity}>
          <Icon name="network" size={24} color="#1A7FD4" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {!result ? (
          <View>
            <TouchableOpacity style={styles.placeholder} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.imagePreview} />
              ) : (
                <View style={styles.placeholderInner}>
                  <Icon name={config.icon} size={64} color="#CBD5E1" />
                  <Text style={styles.placeholderText}>Tap to upload photo</Text>
                  <Text style={styles.placeholderSub}>{config.description}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, (!image || loading) && styles.btnDisabled]}
              onPress={handleScan}
              disabled={!image || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Analyze Now</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {result.warning ? (
              <View style={styles.warningCard}>
                <Icon name="alert-decagram" size={48} color="#D97706" style={{ marginBottom: 12 }} />
                <Text style={styles.warningTitle}>Invalid Image</Text>
                <Text style={styles.warningText}>{result.warning}</Text>
              </View>
            ) : (
              <View>
                <View style={styles.completeHeader}>
                  <Icon name="check-circle" size={32} color="#16A34A" />
                  <Text style={styles.completeTitle}>AI Analysis Results</Text>
                </View>

                <View style={styles.card}>
                  {Object.entries(result).map(([key, val]) => (
                    <View key={key} style={styles.resultItem}>
                      <Text style={styles.label}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                      {renderValue(val)}
                    </View>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.reset} onPress={() => { setResult(null); setImage(null); }}>
              <Text style={styles.resetText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  placeholder: { width: '100%', height: 300, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderInner: { alignItems: 'center' },
  placeholderText: { fontSize: 16, fontWeight: '600', color: '#64748B', marginTop: 12 },
  placeholderSub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  btn: { backgroundColor: '#1A7FD4', padding: 18, borderRadius: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#94A3B8' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  resultItem: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 15 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#1A7FD4', marginBottom: 8, letterSpacing: 1 },
  itemText: { fontSize: 16, color: '#1E293B', lineHeight: 24 },
  listContainer: { marginTop: 4 },
  listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  nestedBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginTop: 4 },
  nestedRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  nestedKey: { fontSize: 13, color: '#64748B', fontWeight: '600', textTransform: 'capitalize' },
  nestedValue: { fontSize: 13, color: '#1E293B', fontWeight: 'bold' },
  completeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'center' },
  completeTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginLeft: 10 },
  reset: { marginTop: 24, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#1A7FD4', borderRadius: 16 },
  resetText: { color: '#1A7FD4', fontWeight: 'bold' },
  warningCard: { backgroundColor: '#FFFBEB', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A', alignItems: 'center' },
  warningTitle: { fontSize: 18, fontWeight: 'bold', color: '#B45309', marginBottom: 8 },
  warningText: { fontSize: 14, color: '#92400E', textAlign: 'center', lineHeight: 20 },
});
