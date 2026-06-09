import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../lib/api';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<any[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      Alert.alert("Error", "Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/verify-otp', {
        email: email,
        otp: code
      });
      Alert.alert("Success", "Account verified successfully! Please log in.", [
        { text: "OK", onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (e: any) {
      console.log('Verification error', e);
      let errorMessage = 'Invalid verification code.';
      if (e.response?.data?.detail) {
        if (typeof e.response.data.detail === 'string') {
          errorMessage = e.response.data.detail;
        } else if (Array.isArray(e.response.data.detail)) {
          errorMessage = e.response.data.detail.map((err: any) => {
            const field = err.loc ? err.loc.slice(1).join('.') : '';
            return `${field ? field + ': ' : ''}${err.msg}`;
          }).join('\n');
        } else {
          errorMessage = JSON.stringify(e.response.data.detail);
        }
      } else if (e.message) {
        errorMessage = e.message;
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Text style={styles.title}>Verify Account</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to{"\n"}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => (inputs.current[idx] = ref)}
              style={styles.otpInput}
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={(val) => handleOtpChange(val, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.verifyBtn, otp.join('').length < 6 && { opacity: 0.5 }]} 
          onPress={handleVerify}
          disabled={loading || otp.join('').length < 6}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnText}>Verify & Activate</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendBtn} onPress={() => Alert.alert("Sent", "A new code has been sent.")}>
          <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendLink}>Resend</Text></Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 32, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#64748B', lineHeight: 24, marginBottom: 40 },
  emailText: { color: '#1E293B', fontWeight: 'bold' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  verifyBtn: { backgroundColor: '#1A7FD4', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 24 },
  verifyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resendBtn: { alignItems: 'center' },
  resendText: { color: '#64748B', fontSize: 14 },
  resendLink: { color: '#1A7FD4', fontWeight: 'bold' },
});
