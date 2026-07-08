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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Icon name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: 'AI Chat',
          tabBarIcon: ({ color }) => (
            <Icon name="chat-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="education/index"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color }) => (
            <Icon name="book-open-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments/index"
        options={{
          title: isDentist ? 'Requests' : 'Book',
          tabBarIcon: ({ color }) => (
            <Icon name={isDentist ? 'calendar-check-outline' : 'calendar-month-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="symptom-checker/index"
        options={{
          title: 'Symptoms',
          tabBarIcon: ({ color }) => (
            <Icon name="medical-bag" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
