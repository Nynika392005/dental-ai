import { Tabs } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';

export default function TabLayout() {
  const { user } = useAuthStore();
  const isDentist = user?.role === 'dentist';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A7FD4',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      {/* ── Shared: Home ───────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home-outline" size={24} color={color} />,
        }}
      />

      {/* ── Patient only: AI Chat ───────────────────── */}
      <Tabs.Screen
        name="chat/index"
        options={{
          title: 'AI Chat',
          href: isDentist ? null : undefined,
          tabBarIcon: ({ color }) => <Icon name="chat-outline" size={24} color={color} />,
        }}
      />

      {/* ── Shared: Learn ──────────────────────────── */}
      <Tabs.Screen
        name="education/index"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color }) => <Icon name="book-open-outline" size={24} color={color} />,
        }}
      />

      {/* ── Shared: Appointments (label changes by role) */}
      <Tabs.Screen
        name="appointments/index"
        options={{
          title: isDentist ? 'Requests' : 'Book',
          tabBarIcon: ({ color }) => (
            <Icon
              name={isDentist ? 'calendar-check-outline' : 'calendar-month-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* ── Patient only: Symptom Checker ──────────── */}
      <Tabs.Screen
        name="symptom-checker/index"
        options={{
          title: 'Symptoms',
          href: isDentist ? null : undefined,
          tabBarIcon: ({ color }) => <Icon name="medical-bag" size={24} color={color} />,
        }}
      />

      {/* ── Shared: Profile (was "explore") ────────── */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Icon name="account-circle-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
