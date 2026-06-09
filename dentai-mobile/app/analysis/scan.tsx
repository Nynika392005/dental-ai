import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../lib/api';

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
    let res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5 });
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
      const res = await api.post('/analysis/scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      console.log('SCAN RESULT:', res.data);
      setResult(res.data);
    } catch (e) {
      Alert.alert("Error", "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Icon name="arrow-left" size={24} /></TouchableOpacity>
        <Text style={styles.title}>{config.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {!result ? (
          <View>
            <TouchableOpacity style={styles.placeholder} onPress={pickImage}>
              {image ? <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} /> : <Icon name={config.icon} size={64} color="#CBD5E1" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={handleScan} disabled={!image || loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Analyze Now</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {result.error ? (
              <View style={styles.card}><Text style={{ color: 'red' }}>{result.error}</Text></View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.label}>AI Result:</Text>
                {Object.entries(result).map(([key, val]: [string, any]) => (
                  <View key={key} style={{ marginTop: 10 }}>
                    <Text style={{ fontWeight: 'bold', color: '#64748B', textTransform: 'capitalize' }}>{key.replace('_', ' ')}:</Text>
                    <Text style={{ fontSize: 16, color: '#1E293B' }}>{String(val)}</Text>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.reset} onPress={() => setResult(null)}><Text>Scan Another</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold' },
  placeholder: { width: '100%', height: 300, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0', overflow: 'hidden' },
  btn: { backgroundColor: '#1A7FD4', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#1A7FD4', marginBottom: 5 },
  reset: { marginTop: 20, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#1A7FD4', borderRadius: 10 },
});
