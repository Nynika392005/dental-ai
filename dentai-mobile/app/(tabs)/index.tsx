import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function PatientDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [dailyTip, setDailyTip] = useState<any>(null);
  const [loadingTip, setLoadingTip] = useState(false);

  useEffect(() => { fetchDailyTip(); }, []);

  const fetchDailyTip = async () => {
    setLoadingTip(true);
    try { const res = await api.get('/education/daily-tip'); setDailyTip(res.data); }
    catch (e) { console.log('tip error', e); }
    finally { setLoadingTip(false); }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.name}>{user?.full_name || 'Patient'}</Text>
      </View>



      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        {[
          { label: 'Chat with AI',    icon: 'chat-processing',        bg: '#E0F2FE', color: '#0284C7', route: '/(tabs)/chat' },
          { label: 'Book Visit',      icon: 'calendar-plus',          bg: '#DCFCE7', color: '#16A34A', route: '/(tabs)/appointments' },
          { label: 'Check Symptoms',  icon: 'alert-plus',             bg: '#FEE2E2', color: '#DC2626', route: '/(tabs)/symptom-checker' },
          { label: 'Learn',           icon: 'book-open-page-variant',  bg: '#F3E8FF', color: '#9333EA', route: '/(tabs)/education' },
        ].map(a => (
          <TouchableOpacity key={a.label} style={[styles.actionCard, { backgroundColor: a.bg }]}
            onPress={() => router.push(a.route as any)}>
            <Icon name={a.icon as any} size={32} color={a.color} />
            <Text style={styles.actionText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Smart AI Tools */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Smart AI Tools</Text>
        <Icon name="auto-fix" size={20} color="#1A7FD4" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolScroll}>
        {[
          { label: 'Scan Meds',     icon: 'pill',              bg: '#F0FDFA', color: '#0D9488', route: '/analysis/scan?type=medicine' },
          { label: 'Tooth Check',   icon: 'tooth-outline',     bg: '#F5F3FF', color: '#7C3AED', route: '/analysis/scan?type=tooth' },
          { label: 'Food Impact',   icon: 'food-apple-outline', bg: '#FFF7ED', color: '#EA580C', route: '/analysis/scan?type=food' },
          { label: 'Habit Sentinel',icon: 'shield-search',     bg: '#FDF2F8', color: '#DB2777', route: '/analysis/scan?type=habit' },
          { label: 'Voice Assist',  icon: 'microphone',        bg: '#EFF6FF', color: '#2563EB', route: '/chat/new?voice=true' },
        ].map(t => (
          <TouchableOpacity key={t.label} style={styles.toolCard} onPress={() => router.push(t.route as any)}>
            <View style={[styles.toolIcon, { backgroundColor: t.bg }]}>
              <Icon name={t.icon as any} size={24} color={t.color} />
            </View>
            <Text style={styles.toolLabel}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Daily Tip */}
      <View style={styles.tipSection}>
        <View style={styles.tipHeader}>
          <Icon name="lightbulb-on" size={24} color="#F59E0B" />
          <Text style={styles.tipTitle}>Daily Oral Health Tip</Text>
        </View>
        <View style={styles.tipCard}>
          {loadingTip
            ? <ActivityIndicator color="#1A7FD4" />
            : <Text style={styles.tipText}>{dailyTip?.tip_text || 'Brush twice daily for two minutes using fluoride toothpaste.'}</Text>
          }
        </View>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DENTIST DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  scheduled:  { bg: '#FEF3C7', text: '#D97706' },
  confirmed:  { bg: '#DBEAFE', text: '#1D4ED8' },
  completed:  { bg: '#DCFCE7', text: '#16A34A' },
  cancelled:  { bg: '#FEE2E2', text: '#DC2626' },
};

function DentistDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [profile,      setProfile]      = useState<any>(null);
  const [tip,          setTip]          = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const fetchAll = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [apptRes, profRes, tipRes] = await Promise.all([
        api.get('/appointments/'),
        api.get('/auth/dentist-profile').catch(() => ({ data: null })),
        api.get('/education/daily-tip').catch(() => ({ data: null })),
      ]);
      setAppointments(apptRes.data || []);
      setProfile(profRes.data);
      setTip(tipRes.data);
    } catch (e) { console.log('dentist fetch error', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleStatus = async (id: string, status: string) => {
    try { await api.patch(`/appointments/${id}/status`, { status }); fetchAll(); }
    catch (e) { console.log('status error', e); }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const today       = new Date().toDateString();
  const todayCount  = appointments.filter(a => new Date(a.scheduled_at).toDateString() === today).length;
  const pendingCount = appointments.filter(a => a.status === 'scheduled').length;
  const totalPatients = new Set(appointments.map(a => a.patient_id)).size;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor="#1A7FD4" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.name}>Dr. {user?.full_name}</Text>
        {profile && <Text style={styles.dentistSpec}>{profile.specialization} · {profile.clinic_name}</Text>}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: "Today",    value: todayCount,    icon: 'calendar-today',   bg: '#E0F2FE', color: '#0284C7' },
          { label: "Pending",  value: pendingCount,  icon: 'clock-outline',    bg: '#FEF3C7', color: '#D97706' },
          { label: "Patients", value: totalPatients, icon: 'account-group',    bg: '#F5F3FF', color: '#7C3AED' },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
            <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
              <Icon name={s.icon as any} size={20} color={s.color} />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Upcoming appointments */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/appointments' as any)}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#1A7FD4" style={{ marginVertical: 24 }} />
      ) : appointments.length === 0 ? (
        <View style={styles.emptyBox}>
          <Icon name="calendar-blank-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No appointments yet</Text>
          <Text style={styles.emptySubtext}>Patients will appear here once they book with you</Text>
        </View>
      ) : (
        appointments.slice(0, 4).map(apt => {
          const sc = STATUS_COLOR[apt.status] || STATUS_COLOR.scheduled;
          return (
            <View key={apt.id} style={styles.aptCard}>
              <View style={styles.aptCardHeader}>
                <View style={styles.avatarCircle}>
                  <Icon name="account" size={20} color="#1A7FD4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aptPatient}>{apt.patient_name}</Text>
                  <Text style={styles.aptTime}>
                    {new Date(apt.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{apt.status}</Text>
                </View>
              </View>
              {apt.reason ? <Text style={styles.aptReason}>Reason: {apt.reason}</Text> : null}
              {apt.status === 'scheduled' && (
                <View style={styles.aptActions}>
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => handleStatus(apt.id, 'confirmed')}>
                    <Icon name="check-circle-outline" size={14} color="#16A34A" />
                    <Text style={styles.confirmTxt}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => handleStatus(apt.id, 'cancelled')}>
                    <Icon name="close-circle-outline" size={14} color="#DC2626" />
                    <Text style={styles.declineTxt}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
              {apt.status === 'confirmed' && (
                <TouchableOpacity style={styles.completeBtn} onPress={() => handleStatus(apt.id, 'completed')}>
                  <Icon name="check-all" size={14} color="#1D4ED8" />
                  <Text style={styles.completeTxt}>Mark Completed</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}

      {/* Quick actions for dentist */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>
      <View style={styles.actionsGrid}>
        {[
          { label: 'All Requests', icon: 'calendar-check-outline', bg: '#FEF3C7', color: '#D97706', route: '/(tabs)/appointments' },
          { label: 'Tooth Scan',   icon: 'tooth-outline',          bg: '#F5F3FF', color: '#7C3AED', route: '/analysis/scan?type=tooth' },
          { label: 'Med Scan',     icon: 'pill',                   bg: '#F0FDFA', color: '#0D9488', route: '/analysis/scan?type=medicine' },
          { label: 'Learn Hub',    icon: 'book-open-page-variant',  bg: '#F3E8FF', color: '#9333EA', route: '/(tabs)/education' },
        ].map(a => (
          <TouchableOpacity key={a.label} style={[styles.actionCard, { backgroundColor: a.bg }]}
            onPress={() => router.push(a.route as any)}>
            <Icon name={a.icon as any} size={30} color={a.color} />
            <Text style={styles.actionText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Clinical Tip */}
      <View style={styles.tipSection}>
        <View style={styles.tipHeader}>
          <Icon name="lightbulb-on" size={22} color="#F59E0B" />
          <Text style={styles.tipTitle}>Clinical Tip of the Day</Text>
        </View>
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>
            {tip?.tip_text || 'Educate patients on proper flossing technique at every routine checkup to improve compliance.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — picks which dashboard to render
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user } = useAuthStore();
  const isDentist = user?.role === 'dentist';

  return (
    <SafeAreaView style={styles.container}>
      {isDentist ? <DentistDashboard /> : <PatientDashboard />}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8FAFC' },
  content:      { padding: 20, paddingBottom: 40 },

  header:       { marginBottom: 20 },
  greeting:     { fontSize: 15, color: '#64748B' },
  name:         { fontSize: 26, fontWeight: 'bold', color: '#1E293B' },
  dentistSpec:  { fontSize: 13, color: '#1A7FD4', fontWeight: '600', marginTop: 2 },

  // ── Patient health card ──
  healthScoreCard: {
    backgroundColor: '#1A7FD4', borderRadius: 20, padding: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 28, elevation: 8,
    shadowColor: '#1A7FD4', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  scoreInfo:    { flex: 1 },
  scoreTitle:   { color: '#fff', fontSize: 17, fontWeight: 'bold', opacity: 0.9 },
  scoreSubtitle:{ color: '#fff', fontSize: 12, opacity: 0.7, marginBottom: 12 },
  scoreBadge:   { flexDirection: 'row', alignItems: 'baseline' },
  scoreValue:   { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  scoreTotal:   { color: '#fff', fontSize: 16, opacity: 0.8 },
  scoreGraph:   { marginLeft: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 50, padding: 8 },

  // ── Stats row (dentist) ──
  statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard:     { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: '#E2E8F0' },
  statIcon:     { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue:    { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  statLabel:    { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },

  // ── Actions grid ──
  actionsGrid:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 28 },
  actionCard:   { width: '48%', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  actionText:   { marginTop: 10, fontWeight: '600', color: '#1E293B', fontSize: 13, textAlign: 'center' },

  // ── Section header ──
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
  seeAll:       { fontSize: 13, color: '#1A7FD4', fontWeight: '700' },

  // ── AI tools (patient) ──
  toolScroll:   { marginBottom: 28 },
  toolCard:     { backgroundColor: '#fff', padding: 14, borderRadius: 16, marginRight: 12, alignItems: 'center', width: 95, borderWidth: 1, borderColor: '#E2E8F0' },
  toolIcon:     { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  toolLabel:    { fontSize: 11, fontWeight: '600', color: '#475569', textAlign: 'center' },

  // ── Appointment card (dentist) ──
  aptCard:      { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  aptCardHeader:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  aptPatient:   { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  aptTime:      { fontSize: 11, color: '#64748B', marginTop: 1 },
  badge:        { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  badgeText:    { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  aptReason:    { fontSize: 12, color: '#64748B', marginBottom: 8, marginLeft: 48 },
  aptActions:   { flexDirection: 'row', gap: 8, marginTop: 4 },
  confirmBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, borderRadius: 8, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  confirmTxt:   { color: '#16A34A', fontWeight: '700', fontSize: 12 },
  declineBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, borderRadius: 8, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECACA' },
  declineTxt:   { color: '#DC2626', fontWeight: '700', fontSize: 12 },
  completeBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, borderRadius: 8, backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#BFDBFE', marginTop: 4 },
  completeTxt:  { color: '#1D4ED8', fontWeight: '700', fontSize: 12 },

  // ── Empty state ──
  emptyBox:     { alignItems: 'center', padding: 32, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#E2E8F0', marginBottom: 20 },
  emptyText:    { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6 },

  // ── Tip ──
  tipSection:   { marginTop: 8 },
  tipHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tipTitle:     { fontSize: 17, fontWeight: 'bold', color: '#1E293B', marginLeft: 8 },
  tipCard:      { backgroundColor: '#fff', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  tipText:      { fontSize: 15, color: '#475569', lineHeight: 24 },
});
