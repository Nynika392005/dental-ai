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
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('General Checkup');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const reasons = [
    "General Checkup",
    "Tooth Cleaning",
    "Toothache / Emergency",
    "Braces Consultation",
    "Teeth Whitening",
    "Filling / Cavity"
  ];

  // Generate next 14 days for selection (exclude past dates)
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i); // Start from today
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
      value: d.toISOString().split('T')[0],
      isToday: i === 0
    };
  });

  useEffect(() => {
    loadClinics();
  }, []);

  useEffect(() => {
    if (selectedDentist && selectedDate) {
      loadSlots();
    }
  }, [selectedDentist, selectedDate]);

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

  const loadSlots = async () => {
    try {
      const res = await api.get(`/appointments/slots`, {
        params: { dentist_id: selectedDentist.id, date: selectedDate }
      });
      setAvailableSlots(res.data);
    } catch (e) {
      console.log('Error loading slots', e);
    }
  };

  const handleBook = async () => {
    if (!selectedTime) {
      Alert.alert("Error", "Please select a time slot");
      return;
    }

    setLoading(true);
    try {
      // Create a local datetime object from the selected date and time
      const [hours, minutes] = selectedTime.split(':');
      const localDateTime = new Date(selectedDate);
      localDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Convert to ISO string (this will be in UTC)
      const scheduledAt = localDateTime.toISOString();
      
      await api.post('/appointments/', {
        clinic_id: selectedClinic.id,
        dentist_id: selectedDentist.id,
        scheduled_at: scheduledAt,
        reason: selectedReason
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
        {loading && step < 3 && <ActivityIndicator size="large" color="#1A7FD4" style={{ marginTop: 40 }} />}

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
            <Text style={styles.stepTitle}>Select a Dentist</Text>
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

        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Reason for Visit</Text>
            <View style={styles.reasonContainer}>
              {reasons.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonChip, selectedReason === r && styles.activeChip]}
                  onPress={() => setSelectedReason(r)}
                >
                  <Text style={[styles.reasonText, selectedReason === r && styles.activeText]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.stepTitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateList}>
              {dates.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.dateChip, selectedDate === d.value && styles.activeChip]}
                  onPress={() => setSelectedDate(d.value)}
                >
                  <Text style={[styles.dateText, selectedDate === d.value && styles.activeText]}>
                    {d.isToday ? 'Today' : d.label.split(',')[0]}
                  </Text>
                  <Text style={[styles.dateValue, selectedDate === d.value && styles.activeText]}>
                    {d.label.split(',')[1]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.stepTitle}>Available Slots</Text>
            {availableSlots.length === 0 ? (
              <View style={styles.noSlotsContainer}>
                <Icon name="clock-alert-outline" size={48} color="#CBD5E1" />
                <Text style={styles.noSlotsText}>No available slots</Text>
                <Text style={styles.noSlotsSubtext}>
                  All slots are booked for this date. Please select a different date.
                </Text>
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {availableSlots.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.slotChip, selectedTime === s && styles.activeChip]}
                    onPress={() => setSelectedTime(s)}
                  >
                    <Text style={[styles.slotText, selectedTime === s && styles.activeText]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.bookBtn, (!selectedTime || availableSlots.length === 0) && { opacity: 0.5 }]}
              onPress={handleBook}
              disabled={loading || !selectedTime || availableSlots.length === 0}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>Confirm Appointment</Text>}
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
  stepTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12, marginTop: 10 },
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
  reasonContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  reasonChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  dateList: { marginBottom: 16 },
  dateChip: { padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 10, alignItems: 'center', minWidth: 80 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  slotChip: { width: '22%', paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  activeChip: { backgroundColor: '#1A7FD4', borderColor: '#1A7FD4' },
  activeText: { color: '#fff' },
  reasonText: { color: '#64748B', fontSize: 13 },
  dateText: { fontSize: 12, color: '#64748B' },
  dateValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  slotText: { color: '#1E293B', fontWeight: '500' },
  bookBtn: { backgroundColor: '#1A7FD4', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  bookBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  noSlotsContainer: { alignItems: 'center', padding: 32, marginBottom: 20 },
  noSlotsText: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginTop: 12 },
  noSlotsSubtext: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
