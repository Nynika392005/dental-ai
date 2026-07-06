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

  const handleScan = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('task_type', type);
      // @ts-ignore
      formData.append('file', { uri: image, name: 'photo.jpg', type: 'image/jpeg' });

      // Explicitly include the auth token — passing a custom headers object can shadow
      // the Authorization header injected by the axios interceptor on some RN/axios versions.
      const token = useAuthStore.getState().token;

      const res = await api.post('/analysis/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      console.log('SCAN RESULT:', res.data);
      setResult(res.data);
    } catch (e: any) {
      console.error('Scan error:', e);
      Alert.alert("Error", e.response?.data?.detail || "Server connection failed.");
    } finally {
      setLoading(false);
    }
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
        <View style={{ width: 24 }} />
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
});
