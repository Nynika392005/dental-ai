import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../../lib/api';

export default function SymptomCheckerScreen() {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<any>(null);

  const availableSymptoms = [
    "Toothache", "Bleeding Gums", "Swelling", "Sensitivity to Cold/Hot",
    "Bad Breath", "Jaw Pain", "Loose Tooth", "Fever", "Difficulty Swallowing"
  ];

  const toggleSymptom = (symptom: string) => {
    if (symptoms.includes(symptom)) {
      setSymptoms(symptoms.filter(s => s !== symptom));
    } else {
      setSymptoms([...symptoms, symptom]);
    }
  };

  const analyzeSymptoms = async () => {
    if (symptoms.length === 0) return;
    setLoading(true);
    try {
      // Mocked endpoint call
      const res = await api.post('/symptoms/analyze', { symptoms });
      setAssessment(res.data);
    } catch (e) {
      console.log('Error analyzing symptoms', e);
      // Fallback mock
      setAssessment({
        ai_assessment: "Based on your symptoms, this could be a sign of a dental infection or advanced decay. Please consult a dentist.",
        urgency_level: "soon"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Symptom Checker</Text>
      </View>
      
      {!assessment ? (
        <View style={styles.content}>
          <Text style={styles.subtitle}>Select what you're experiencing:</Text>
          <View style={styles.grid}>
            {availableSymptoms.map((sym, idx) => {
              const isSelected = symptoms.includes(sym);
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleSymptom(sym)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{sym}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <TouchableOpacity 
            style={[styles.btn, symptoms.length === 0 && { opacity: 0.5 }]} 
            onPress={analyzeSymptoms}
            disabled={symptoms.length === 0 || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Analyze Symptoms</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={[styles.resultCard, assessment.urgency_level === 'urgent' ? styles.urgentCard : styles.normalCard]}>
            <View style={styles.resultHeader}>
              <Icon 
                name={assessment.urgency_level === 'urgent' ? 'alert-octagon' : 'information'} 
                size={24} 
                color={assessment.urgency_level === 'urgent' ? '#DC2626' : '#1A7FD4'} 
              />
              <Text style={[styles.urgencyText, assessment.urgency_level === 'urgent' && { color: '#DC2626' }]}>
                Urgency: {assessment.urgency_level.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.assessmentText}>{assessment.ai_assessment}</Text>
          </View>
          
          <TouchableOpacity style={styles.btnOutline} onPress={() => setAssessment(null)}>
            <Text style={styles.btnOutlineText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  content: { padding: 20 },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 32 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    marginRight: 12,
    marginBottom: 12,
  },
  chipSelected: { backgroundColor: '#1A7FD4', borderColor: '#1A7FD4' },
  chipText: { color: '#475569', fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  btn: { backgroundColor: '#1A7FD4', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnOutline: { borderWidth: 1, borderColor: '#1A7FD4', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnOutlineText: { color: '#1A7FD4', fontWeight: 'bold', fontSize: 16 },
  resultCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  urgentCard: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  normalCard: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  urgencyText: { marginLeft: 8, fontWeight: 'bold', fontSize: 16, color: '#1A7FD4' },
  assessmentText: { fontSize: 16, color: '#1E293B', lineHeight: 24 },
});
