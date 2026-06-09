import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../../lib/api';

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments/');
      setAppointments(res.data);
    } catch (e) {
      console.log('Error loading appointments', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Appointments</Text>
        <TouchableOpacity style={styles.bookBtn} onPress={() => router.push('/appointments/book')}>
          <Icon name="calendar-plus" size={20} color="#fff" />
          <Text style={styles.bookBtnText}>Book New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1A7FD4" style={{ marginTop: 40 }} />
      ) : appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="calendar-blank-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>No Upcoming Appointments</Text>
          <Text style={styles.emptySubtext}>Book a visit to see your scheduled appointments here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {appointments.map((apt) => (
            <View key={apt.id} style={styles.aptCard}>
              <View style={styles.aptHeader}>
                <Text style={styles.aptDate}>{new Date(apt.scheduled_at).toLocaleDateString()}</Text>
                <Text style={styles.aptStatus}>{apt.status}</Text>
              </View>
              <Text style={styles.aptReason}>{apt.reason}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  bookBtn: {
    backgroundColor: '#1A7FD4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8 },
  list: { padding: 16 },
  aptCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aptHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  aptDate: { fontWeight: 'bold', color: '#1E293B' },
  aptStatus: { fontSize: 12, color: '#1A7FD4', textTransform: 'uppercase', fontWeight: 'bold' },
  aptReason: { color: '#64748B' },
});
