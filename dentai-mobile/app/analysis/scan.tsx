import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../lib/api';

export default function SmartScanScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: 'medicine' | 'tooth' | 'food' }>();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const config = {
    medicine: { title: 'Scan Medicine Strip', icon: 'pill', description: 'Extract dosage, warnings, and purpose.' },
    tooth: { title: 'Tooth Analysis', icon: 'tooth-outline', description: 'AI check for plaque, cavities, or inflammation.' },
    food: { title: 'Food Analyzer', icon: 'food-apple-outline', description: 'Analyze food impact on dental health.' }
  }[type || 'tooth'];

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleScan = async () => {
    if (!image) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('task_type', type || 'tooth');
      // @ts-ignore
      formData.append('file', {
        uri: image,
        name: 'scan.jpg',
        type: 'image/jpeg',
      });

      const res = await api.post('/analysis/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (e) {
      console.log('Scan error', e);
      Alert.alert("Error", "Could not analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
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

      <ScrollView contentContainerStyle={styles.content}>
        {!result ? (
          <View style={styles.uploadSection}>
            <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.previewImage} />
              ) : (
                <View style={styles.placeholderContent}>
                  <Icon name={config.icon} size={64} color="#CBD5E1" />
                  <Text style={styles.placeholderText}>Upload Image</Text>
                  <Text style={styles.placeholderSubtext}>{config.description}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scanBtn, !image && { opacity: 0.5 }]}
              disabled={!image || loading}
              onPress={handleScan}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanBtnText}>Run AI Analysis</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Icon name="check-circle" size={32} color="#16A34A" />
              <Text style={styles.resultTitle}>Analysis Complete</Text>
            </View>

            {type === 'medicine' && (
              <View style={styles.resCard}>
                <Text style={styles.resLabel}>Medicine:</Text>
                <Text style={styles.resValue}>{result.name}</Text>
                <Text style={styles.resLabel}>Purpose:</Text>
                <Text style={styles.resValue}>{result.purpose}</Text>
                <Text style={styles.resLabel}>Dosage:</Text>
                <Text style={styles.resValue}>{result.dosage}</Text>
                <Text style={[styles.resLabel, { color: '#DC2626' }]}>Warnings:</Text>
                <Text style={styles.resValue}>{result.warnings}</Text>
              </View>
            )}

            {type === 'tooth' && (
              <View style={styles.resCard}>
                <Text style={styles.resLabel}>Findings:</Text>
                <Text style={styles.resValue}>{result.findings}</Text>
                <Text style={styles.resLabel}>Recommendations:</Text>
                <Text style={styles.resValue}>{result.recommendations}</Text>
                <View style={[styles.urgencyBadge, { backgroundColor: result.urgency === 'soon' ? '#FEF3C7' : '#DCFCE7' }]}>
                  <Text style={{ color: result.urgency === 'soon' ? '#B45309' : '#16A34A', fontWeight: 'bold' }}>
                    Urgency: {result.urgency.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}

            {type === 'food' && (
              <View style={styles.resCard}>
                <View style={styles.scoreRow}>
                  <Text style={styles.resLabel}>Dental Impact Score:</Text>
                  <Text style={[styles.scoreText, { color: result.impact_score > 7 ? '#16A34A' : '#DC2626' }]}>
                    {result.impact_score}/10
                  </Text>
                </View>
                <Text style={styles.resLabel}>Analysis:</Text>
                <Text style={styles.resValue}>{result.analysis}</Text>
                <Text style={styles.resLabel}>Advice:</Text>
                <Text style={styles.resValue}>{result.advice}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.resetBtn} onPress={() => setResult(null)}>
              <Text style={styles.resetBtnText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  content: { padding: 20 },
  uploadSection: { alignItems: 'center' },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 32,
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderContent: { alignItems: 'center', padding: 20 },
  placeholderText: { fontSize: 18, fontWeight: 'bold', color: '#64748B', marginTop: 16 },
  placeholderSubtext: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
  scanBtn: { backgroundColor: '#1A7FD4', width: '100%', padding: 18, borderRadius: 12, alignItems: 'center' },
  scanBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resultSection: { },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  resultTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginLeft: 12 },
  resCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 },
  resLabel: { fontSize: 14, fontWeight: 'bold', color: '#64748B', marginTop: 12, marginBottom: 4 },
  resValue: { fontSize: 16, color: '#1E293B', lineHeight: 24 },
  urgencyBadge: { padding: 10, borderRadius: 8, marginTop: 16, alignItems: 'center' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreText: { fontSize: 24, fontWeight: 'bold' },
  resetBtn: { padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1A7FD4' },
  resetBtnText: { color: '#1A7FD4', fontWeight: 'bold' },
});
