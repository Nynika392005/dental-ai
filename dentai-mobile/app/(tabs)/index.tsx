import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../lib/api';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [dailyTip, setDailyTip] = useState<any>(null);
  const [loadingTip, setLoadingTip] = useState(true);

  useEffect(() => {
    fetchDailyTip();
  }, []);

  const fetchDailyTip = async () => {
    try {
      const res = await api.get('/education/daily-tip');
      setDailyTip(res.data);
    } catch (e) {
      console.log('Failed to fetch daily tip', e);
    } finally {
      setLoadingTip(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{user?.full_name || 'Patient'}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#E0F2FE' }]} onPress={() => router.push('/(tabs)/chat')}>
            <Icon name="chat-processing" size={32} color="#0284C7" />
            <Text style={styles.actionText}>Chat with AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#DCFCE7' }]} onPress={() => router.push('/(tabs)/appointments')}>
            <Icon name="calendar-plus" size={32} color="#16A34A" />
            <Text style={styles.actionText}>Book Visit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#FEE2E2' }]} onPress={() => router.push('/(tabs)/symptom-checker')}>
            <Icon name="alert-plus" size={32} color="#DC2626" />
            <Text style={styles.actionText}>Check Symptoms</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#F3E8FF' }]} onPress={() => router.push('/(tabs)/education')}>
            <Icon name="book-open-page-variant" size={32} color="#9333EA" />
            <Text style={styles.actionText}>Learn</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Tip */}
        <View style={styles.tipSection}>
          <View style={styles.tipHeader}>
            <Icon name="lightbulb-on" size={24} color="#F59E0B" />
            <Text style={styles.tipTitle}>Daily Oral Health Tip</Text>
          </View>
          <View style={styles.tipCard}>
            {loadingTip ? (
              <ActivityIndicator color="#1A7FD4" />
            ) : (
              <Text style={styles.tipText}>
                {dailyTip?.tip_text || "Brush your teeth twice a day for two minutes each time using fluoride toothpaste."}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 16, color: '#64748B' },
  name: { fontSize: 28, fontWeight: 'bold', color: '#1E293B' },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  actionCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionText: {
    marginTop: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  tipSection: {
    marginTop: 8,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginLeft: 8,
  },
  tipCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tipText: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
  },
});
