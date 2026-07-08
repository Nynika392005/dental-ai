import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const isDentist = user?.role === 'dentist';

  const [editing, setEditing]     = useState(false);
  const [fullName, setFullName]   = useState(user?.full_name || '');
  const [saving,  setSaving]      = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      await api.patch('/auth/update-profile', { full_name: fullName });
      Alert.alert('Saved', 'Profile updated successfully.');
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const roleLabel  = isDentist ? 'Dentist' : 'Patient';
  const roleColor  = isDentist ? '#0D9488' : '#1A7FD4';
  const roleBg     = isDentist ? '#F0FDFA' : '#EFF6FF';
  const roleIcon   = isDentist ? 'tooth-outline' : 'account';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: roleBg }]}>
            <Icon name={roleIcon} size={48} color={roleColor} />
          </View>
          {editing ? (
            <TextInput
              style={styles.nameInput}
              value={fullName}
              onChangeText={setFullName}
              autoFocus
            />
          ) : (
            <Text style={styles.name}>{user?.full_name}</Text>
          )}
          <View style={[styles.roleBadge, { backgroundColor: roleBg }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>

          <View style={styles.infoRow}>
            <Icon name="email-outline" size={18} color="#64748B" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Icon name="account-circle-outline" size={18} color="#64748B" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* Edit / Save */}
        {editing ? (
          <View style={styles.rowBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setFullName(user?.full_name || ''); }}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveTxt}>Save</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Icon name="pencil-outline" size={18} color="#1A7FD4" />
            <Text style={styles.editTxt}>Edit Name</Text>
          </TouchableOpacity>
        )}

        {/* Quick links */}
        <View style={styles.card} >
          <Text style={styles.cardTitle}>Quick Access</Text>
          {[
            { icon: 'book-open-outline',      label: 'Education Hub',      onPress: () => router.push('/(tabs)/education') },
            { icon: 'calendar-month-outline', label: isDentist ? 'Patient Requests' : 'My Appointments', onPress: () => router.push('/(tabs)/appointments') },
            ...(isDentist ? [] : [
              { icon: 'medical-bag',           label: 'Symptom Checker',    onPress: () => router.push('/(tabs)/symptom-checker') },
              { icon: 'chat-outline',          label: 'AI Chat',            onPress: () => router.push('/(tabs)/chat') },
            ]),
          ].map((item, i, arr) => (
            <View key={item.label}>
              <TouchableOpacity style={styles.linkRow} onPress={item.onPress}>
                <Icon name={item.icon as any} size={20} color="#1A7FD4" />
                <Text style={styles.linkLabel}>{item.label}</Text>
                <Icon name="chevron-right" size={20} color="#CBD5E1" />
              </TouchableOpacity>
              {i < arr.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Log out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="logout" size={20} color="#DC2626" />
          <Text style={styles.logoutTxt}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8FAFC' },
  header:       { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title:        { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  content:      { padding: 20, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar:        { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  name:          { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  nameInput:     { fontSize: 20, fontWeight: 'bold', color: '#1E293B', borderBottomWidth: 2, borderBottomColor: '#1A7FD4', marginBottom: 8, minWidth: 200, textAlign: 'center', paddingBottom: 4 },
  roleBadge:     { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20 },
  roleText:      { fontSize: 13, fontWeight: '700' },

  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle:    { fontSize: 13, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },

  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  infoText:     { flex: 1 },
  infoLabel:    { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue:    { fontSize: 15, color: '#1E293B', fontWeight: '500', marginTop: 2 },
  divider:      { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },

  rowBtns:    { flexDirection: 'row', gap: 12, marginBottom: 16 },
  cancelBtn:  { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  cancelTxt:  { color: '#64748B', fontWeight: '700' },
  saveBtn:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#1A7FD4', alignItems: 'center' },
  saveTxt:    { color: '#fff', fontWeight: '700' },
  editBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 16 },
  editTxt:    { color: '#1A7FD4', fontWeight: '700' },

  linkRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  linkLabel:  { flex: 1, fontSize: 15, color: '#1E293B', fontWeight: '500' },

  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECACA', marginTop: 8 },
  logoutTxt:  { color: '#DC2626', fontWeight: '700', fontSize: 15 },
});
