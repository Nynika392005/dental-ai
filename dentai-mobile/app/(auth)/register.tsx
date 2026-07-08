import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

const SPECIALIZATIONS = [
  'General Dentistry', 'Orthodontist', 'Periodontist',
  'Endodontist', 'Oral Surgeon', 'Pediatric Dentist',
  'Cosmetic Dentist', 'Prosthodontist',
];

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuthStore();

  // Role
  const [role, setRole] = useState<'patient' | 'dentist'>('patient');

  // Common fields
  const [fullName,         setFullName]         = useState('');
  const [email,            setEmail]            = useState('');
  const [phone,            setPhone]            = useState('');
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');

  // Dentist-only fields
  const [clinicName,       setClinicName]       = useState('');
  const [clinicAddress,    setClinicAddress]    = useState('');
  const [specialization,   setSpecialization]   = useState('General Dentistry');
  const [bio,              setBio]              = useState('');
  const [showSpecPicker,   setShowSpecPicker]   = useState(false);

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    if (role === 'dentist' && (!clinicName || !clinicAddress)) {
      Alert.alert('Error', 'Please fill in your clinic name and address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        full_name: fullName,
        email,
        phone,
        password,
        role,
        ...(role === 'dentist' && {
          clinic_name:    clinicName,
          clinic_address: clinicAddress,
          specialization,
          bio,
        }),
      });

      // Auto-login so the user lands directly in the app
      const loginRes = await api.post('/auth/login', { email, password });
      const { access_token } = loginRes.data;

      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      await login(access_token, meRes.data);
      router.replace('/(tabs)');

    } catch (error: any) {
      let msg = 'Registration failed. Please try again.';
      if (error.response?.data?.detail) {
        msg = typeof error.response.data.detail === 'string'
          ? error.response.data.detail
          : JSON.stringify(error.response.data.detail);
      }
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join DentAI today</Text>

        {/* ── Role selector ──────────────────────────────── */}
        <Text style={styles.sectionLabel}>I am a</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'patient' && styles.roleBtnActive]}
            onPress={() => setRole('patient')}
          >
            <Icon name="account" size={22} color={role === 'patient' ? '#fff' : '#64748B'} />
            <Text style={[styles.roleTxt, role === 'patient' && styles.roleTxtActive]}>Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'dentist' && styles.roleBtnActive]}
            onPress={() => setRole('dentist')}
          >
            <Icon name="tooth-outline" size={22} color={role === 'dentist' ? '#fff' : '#64748B'} />
            <Text style={[styles.roleTxt, role === 'dentist' && styles.roleTxtActive]}>Dentist</Text>
          </TouchableOpacity>
        </View>

        {/* ── Common fields ──────────────────────────────── */}
        <TextInput
          style={styles.input}
          placeholder={role === 'dentist' ? 'Full Name (e.g. Dr. Jane Smith)' : 'Full Name'}
          placeholderTextColor="#94A3B8"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#94A3B8"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {/* ── Dentist-only fields ────────────────────────── */}
        {role === 'dentist' && (
          <View style={styles.dentistSection}>
            <Text style={styles.dentistSectionTitle}>Clinic & Professional Details</Text>

            <TextInput
              style={styles.input}
              placeholder="Clinic Name *"
              placeholderTextColor="#94A3B8"
              value={clinicName}
              onChangeText={setClinicName}
            />
            <TextInput
              style={styles.input}
              placeholder="Clinic Address *"
              placeholderTextColor="#94A3B8"
              value={clinicAddress}
              onChangeText={setClinicAddress}
            />

            {/* Specialization picker */}
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowSpecPicker(!showSpecPicker)}>
              <Text style={styles.pickerBtnText}>{specialization}</Text>
              <Icon name={showSpecPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#64748B" />
            </TouchableOpacity>
            {showSpecPicker && (
              <View style={styles.pickerList}>
                {SPECIALIZATIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pickerItem, specialization === s && styles.pickerItemActive]}
                    onPress={() => { setSpecialization(s); setShowSpecPicker(false); }}
                  >
                    <Text style={[styles.pickerItemText, specialization === s && styles.pickerItemTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Short bio (optional)"
              placeholderTextColor="#94A3B8"
              multiline
              value={bio}
              onChangeText={setBio}
            />
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Create Account</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.linkContainer}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8FAFC' },
  content:    { padding: 24, paddingVertical: 40 },
  title:      { fontSize: 30, fontWeight: 'bold', color: '#1E293B', marginBottom: 6 },
  subtitle:   { fontSize: 15, color: '#64748B', marginBottom: 24 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  roleRow:        { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E2E8F0' },
  roleBtnActive:  { backgroundColor: '#1A7FD4', borderColor: '#1A7FD4' },
  roleTxt:        { fontSize: 15, fontWeight: '700', color: '#64748B' },
  roleTxtActive:  { color: '#fff' },

  input: {
    backgroundColor: '#fff', padding: 15, borderRadius: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0',
    fontSize: 15, color: '#1E293B',
  },

  dentistSection:      { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 20, marginTop: 4, marginBottom: 4 },
  dentistSectionTitle: { fontSize: 12, fontWeight: '800', color: '#1A7FD4', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },

  pickerBtn:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 4 },
  pickerBtnText:  { fontSize: 15, color: '#1E293B' },
  pickerList:     { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14, overflow: 'hidden' },
  pickerItem:     { padding: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerItemActive:     { backgroundColor: '#EFF6FF' },
  pickerItemText:       { fontSize: 14, color: '#1E293B' },
  pickerItemTextActive: { color: '#1A7FD4', fontWeight: '700' },

  button:       { backgroundColor: '#1A7FD4', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText:   { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkContainer:{ marginTop: 24, alignItems: 'center' },
  linkText:     { color: '#1A7FD4', fontSize: 15 },
});
