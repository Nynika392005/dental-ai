import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../../lib/api';

export default function ChatListScreen() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data);
    } catch (e) {
      console.log('Failed to fetch conversations', e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.chatCard}
      onPress={() => router.push(`/chat/${item.id}` as any)}
    >
      <View style={styles.chatIconContainer}>
        <Icon name="chat-outline" size={24} color="#1A7FD4" />
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.chatTitle} numberOfLines={1}>{item.title || 'New Conversation'}</Text>
        <Text style={styles.chatDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversations</Text>
        <TouchableOpacity onPress={() => router.push('/chat/new' as any)} style={styles.newBtn}>
          <Icon name="plus" size={20} color="#fff" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator color="#1A7FD4" style={{ marginTop: 40 }} />
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="chat-sleep-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start asking DentAI about your oral health!</Text>

          <View style={styles.suggestions}>
            <Text style={styles.suggestionTitle}>Suggested Topics:</Text>
            {['Tooth Sensitivity', 'Best Brushing Techniques', 'Wisdom Teeth Pain'].map(topic => (
              <TouchableOpacity key={topic} style={styles.suggestionChip} onPress={() => router.push(`/chat/new?q=${encodeURIComponent(topic)}` as any)}>
                <Text style={styles.suggestionText}>{topic}</Text>
                <Icon name="arrow-right-thin" size={16} color="#1A7FD4" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
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
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  newBtn: {
    backgroundColor: '#1A7FD4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4 },
  listContent: { padding: 16 },
  chatCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  chatInfo: { flex: 1 },
  chatTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  chatDate: { fontSize: 12, color: '#64748B' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  suggestions: { width: '100%', marginTop: 20 },
  suggestionTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  suggestionChip: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  suggestionText: { color: '#1A7FD4', fontWeight: '500' },
});
