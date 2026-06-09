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

        {/* Health Score Card - UNIQUE FEATURE */}
        <TouchableOpacity style={styles.healthScoreCard}>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>Oral Health Score</Text>
            <Text style={styles.scoreSubtitle}>Based on your last checkup</Text>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreValue}>85</Text>
              <Text style={styles.scoreTotal}>/100</Text>
            </View>
          </View>
          <View style={styles.scoreGraph}>
             <Icon name="chart-donut" size={80} color="#1A7FD4" />
          </View>
        </TouchableOpacity>

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

        {/* SMART AI SCAN - NEW FEATURE */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Smart AI Tools</Text>
          <Icon name="auto-fix" size={20} color="#1A7FD4" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolScroll}>
          <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/analysis/scan?type=medicine')}>
            <View style={[styles.toolIcon, { backgroundColor: '#F0FDFA' }]}>
              <Icon name="pill" size={24} color="#0D9488" />
            </View>
            <Text style={styles.toolLabel}>Scan Meds</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/analysis/scan?type=tooth')}>
            <View style={[styles.toolIcon, { backgroundColor: '#F5F3FF' }]}>
              <Icon name="tooth-outline" size={24} color="#7C3AED" />
            </View>
            <Text style={styles.toolLabel}>Tooth Check</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/analysis/scan?type=food')}>
            <View style={[styles.toolIcon, { backgroundColor: '#FFF7ED' }]}>
              <Icon name="food-apple-outline" size={24} color="#EA580C" />
            </View>
            <Text style={styles.toolLabel}>Food Impact</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/analysis/scan?type=habit')}>
            <View style={[styles.toolIcon, { backgroundColor: '#FDF2F8' }]}>
              <Icon name="shield-search" size={24} color="#DB2777" />
            </View>
            <Text style={styles.toolLabel}>Habit Sentinel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/(tabs)/chat/new?voice=true')}>
            <View style={[styles.toolIcon, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="microphone" size={24} color="#2563EB" />
            </View>
            <Text style={styles.toolLabel}>Voice Assist</Text>
          </TouchableOpacity>
        </ScrollView>

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
  healthScoreCard: {
    backgroundColor: '#1A7FD4',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    shadowColor: '#1A7FD4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  scoreInfo: { flex: 1 },
  scoreTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', opacity: 0.9 },
  scoreSubtitle: { color: '#fff', fontSize: 12, opacity: 0.7, marginBottom: 12 },
  scoreBadge: { flexDirection: 'row', alignItems: 'baseline' },
  scoreValue: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  scoreTotal: { color: '#fff', fontSize: 16, opacity: 0.8 },
  scoreGraph: { marginLeft: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 50, padding: 8 },
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginRight: 8 },
  toolScroll: { marginBottom: 32 },
  toolCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    width: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  toolIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  toolLabel: { fontSize: 12, fontWeight: '600', color: '#475569', textAlign: 'center' },
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
