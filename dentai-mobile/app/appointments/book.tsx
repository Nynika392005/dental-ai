import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';

export default function BookAppointmentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState<any[]>([]);
  const [dentists, setDentists] = useState<any[]>([]);
  const [step, setStep] = useState(1); // 1: Clinic, 2: Dentist, 3: Date
  
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [selectedDentist, setSelectedDentist] = useState<any>(null);

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments/clinics');
      setClinics(res.data);
    } catch (e) {
      console.log('Error loading clinics', e);
    } finally {
      setLoading(false);
    }
  };

  const loadDentists = async (clinicId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/appointments/dentists/${clinicId}`);
      setDentists(res.data);
      setStep(2);
    } catch (e) {
      console.log('Error loading dentists', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    setLoading(true);
    try {
      // Mocking a date for now, in a real app we'd have a date picker
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 7); // Next week
      
      await api.post('/appointments/', {
        clinic_id: selectedClinic.id,
        dentist_id: selectedDentist.id,
        scheduled_at: scheduledAt.toISOString(),
        reason: "General Checkup"
      });
      
      Alert.alert("Success", "Your appointment has been booked!", [
        { text: "OK", onPress: () => router.replace('/(tabs)/appointments') }
      ]);
    } catch (e) {
      console.log('Error booking', e);
      Alert.alert("Error", "Could not book appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
          <Icon name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Book Visit</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading && <ActivityIndicator size="large" color="#1A7FD4" style={{ marginTop: 40 }} />}

        {!loading && step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Select a Clinic</Text>
            {clinics.map((clinic) => (
              <TouchableOpacity 
                key={clinic.id} 
                style={styles.card}
                onPress={() => {
                  setSelectedClinic(clinic);
                  loadDentists(clinic.id);
                }}
              >
                <View>
                  <Text style={styles.cardTitle}>{clinic.name}</Text>
                  <Text style={styles.cardSubtext}>{clinic.address}</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Select a Dentist at {selectedClinic?.name}</Text>
            {dentists.map((dentist) => (
              <TouchableOpacity 
                key={dentist.id} 
                style={styles.card}
                onPress={() => {
                  setSelectedDentist(dentist);
                  setStep(3);
                }}
              >
                <View>
                  <Text style={styles.cardTitle}>{dentist.full_name}</Text>
                  <Text style={styles.cardSubtext}>{dentist.specialization}</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Confirm Booking</Text>
            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <Icon name="hospital-building" size={20} color="#64748B" />
                <Text style={styles.confirmLabel}>Clinic:</Text>
                <Text style={styles.confirmValue}>{selectedClinic?.name}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Icon name="account-tie" size={20} color="#64748B" />
                <Text style={styles.confirmLabel}>Dentist:</Text>
                <Text style={styles.confirmValue}>{selectedDentist?.full_name}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Icon name="calendar-clock" size={20} color="#64748B" />
                <Text style={styles.confirmLabel}>Suggested Date:</Text>
                <Text style={styles.confirmValue}>Next Monday, 10:00 AM</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
              <Text style={styles.bookBtnText}>Confirm Appointment</Text>
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  content: { padding: 20 },
  stepTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748B', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  cardSubtext: { fontSize: 14, color: '#64748B', marginTop: 4 },
  confirmCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  confirmLabel: { marginLeft: 8, fontSize: 14, color: '#64748B', width: 100 },
  confirmValue: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', flex: 1 },
  bookBtn: { backgroundColor: '#1A7FD4', padding: 18, borderRadius: 12, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
