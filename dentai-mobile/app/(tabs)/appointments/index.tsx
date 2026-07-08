import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  scheduled:  { bg: '#FEF3C7', text: '#D97706' },
  confirmed:  { bg: '#DBEAFE', text: '#1D4ED8' },
  completed:  { bg: '#DCFCE7', text: '#16A34A' },
  cancelled:  { bg: '#FEE2E2', text: '#DC2626' },
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isDentist = user?.role === 'dentist';

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Reload whenever the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [])
  );

  const loadAppointments = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await api.get('/appointments/');
      setAppointments(res.data || []);
    } catch (e) {
      console.log('Error loading appointments', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      loadAppointments();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not update status.');
    }
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => handleStatusUpdate(id, 'cancelled') },
      ]
    );
  };

  const filters = ['all', 'scheduled', 'confirmed', 'completed', 'cancelled'];

  const filtered = filter === 'all'
    ? appointments
    : appointments.filter(a => a.status === filter);

  // ── Dentist card ───────────────────────────────────────────────────────────
  const renderDentistCard = (apt: any) => {
    const sc = STATUS_COLOR[apt.status] || STATUS_COLOR.scheduled;
    return (
      <View key={apt.id} style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Icon name="account" size={22} color="#1A7FD4" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{apt.patient_name || 'Patient'}</Text>
            <Text style={styles.cardSub}>
              {new Date(apt.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{apt.status}</Text>
          </View>
        </View>

        {apt.reason ? <Text style={styles.reason}><Text style={styles.label}>Reason: </Text>{apt.reason}</Text> : null}
        {apt.notes  ? <Text style={styles.notes}><Text style={styles.label}>Notes: </Text>{apt.notes}</Text>   : null}

        {/* Action buttons */}
        {apt.status === 'scheduled' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => handleStatusUpdate(apt.id, 'confirmed')}>
              <Icon name="check-circle-outline" size={16} color="#16A34A" />
              <Text style={styles.confirmTxt}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(apt.id)}>
              <Icon name="close-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.cancelTxt}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
        {apt.status === 'confirmed' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.completeBtn} onPress={() => handleStatusUpdate(apt.id, 'completed')}>
              <Icon name="check-all" size={16} color="#1D4ED8" />
              <Text style={styles.completeTxt}>Mark Completed</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ── Patient card ───────────────────────────────────────────────────────────
  const renderPatientCard = (apt: any) => {
    const sc = STATUS_COLOR[apt.status] || STATUS_COLOR.scheduled;
    const canCancel = apt.status === 'scheduled' || apt.status === 'confirmed';
    return (
      <View key={apt.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatarCircle, { backgroundColor: '#F0FDFA' }]}>
            <Icon name="tooth-outline" size={22} color="#0D9488" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{apt.dentist_name || 'Dentist'}</Text>
            <Text style={styles.cardSub}>{apt.clinic_name || ''}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{apt.status}</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Icon name="calendar-clock" size={14} color="#64748B" />
          <Text style={styles.dateText}>
            {new Date(apt.scheduled_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
          </Text>
        </View>

        {apt.reason ? <Text style={styles.reason}><Text style={styles.label}>Reason: </Text>{apt.reason}</Text> : null}

        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(apt.id)}>
            <Icon name="close-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.cancelTxt}>Cancel Appointment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{isDentist ? 'Patient Requests' : 'My Appointments'}</Text>
          <Text style={styles.subtitle}>
            {isDentist ? 'Manage your incoming bookings' : 'Your scheduled dental visits'}
          </Text>
        </View>
        {!isDentist && (
          <TouchableOpacity style={styles.bookBtn} onPress={() => router.push('/appointments/book')}>
            <Icon name="calendar-plus" size={18} color="#fff" />
            <Text style={styles.bookBtnText}>Book</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && appointments.filter(a => a.status === f).length > 0
                ? ` (${appointments.filter(a => a.status === f).length})`
                : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#1A7FD4" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAppointments(true)} tintColor="#1A7FD4" />}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="calendar-blank-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                {filter === 'all' ? 'No appointments yet' : `No ${filter} appointments`}
              </Text>
              <Text style={styles.emptySubtext}>
                {isDentist
                  ? 'Appointments booked with you will appear here'
                  : 'Tap "Book" to schedule your first visit'}
              </Text>
            </View>
          ) : (
            filtered.map(apt => isDentist ? renderDentistCard(apt) : renderPatientCard(apt))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8FAFC' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title:        { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  subtitle:     { fontSize: 12, color: '#64748B', marginTop: 2 },
  bookBtn:      { backgroundColor: '#1A7FD4', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, gap: 4 },
  bookBtnText:  { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  filterScroll:  { maxHeight: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filterChip:    { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#1A7FD4', borderColor: '#1A7FD4' },
  filterText:    { fontSize: 13, color: '#64748B', fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  list:         { padding: 16, paddingBottom: 40 },
  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },

  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  patientName:  { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  cardSub:      { fontSize: 12, color: '#64748B', marginTop: 1 },
  badge:        { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText:    { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  dateRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  dateText:     { fontSize: 13, color: '#475569' },

  reason:       { fontSize: 13, color: '#475569', marginBottom: 4 },
  notes:        { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginBottom: 8 },
  label:        { fontWeight: '700', color: '#1E293B' },

  actionRow:    { flexDirection: 'row', gap: 10, marginTop: 12 },
  confirmBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 9, borderRadius: 10, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  confirmTxt:   { color: '#16A34A', fontWeight: '700', fontSize: 13 },
  cancelBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 9, borderRadius: 10, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECACA', marginTop: 10 },
  cancelTxt:    { color: '#DC2626', fontWeight: '700', fontSize: 13 },
  completeBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 9, borderRadius: 10, backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#BFDBFE' },
  completeTxt:  { color: '#1D4ED8', fontWeight: '700', fontSize: 13 },

  emptyState:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText:    { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, paddingHorizontal: 30 },
});
