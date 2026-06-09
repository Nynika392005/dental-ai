import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';

const QUICK_REPLIES = [
  "How do I brush properly?",
  "What causes tooth sensitivity?",
  "Is a root canal painful?",
  "Signs I need to see a dentist urgently",
  "How often should I floss?",
  "What are signs of gum disease?",
  "How to care for my child's teeth?",
  "What causes bad breath?",
  "Foods that are bad for teeth",
  "What is teeth whitening?"
];

export default function ActiveChatScreen() {
  const { id } = useLocalSearchParams();
  const isNew = id === 'new';
  const router = useRouter();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load existing messages if !isNew
  useEffect(() => {
    if (!isNew && id) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [id]);

  const loadMessages = async () => {
    setFetchingHistory(true);
    try {
      const response = await api.get(`/chat/conversations/${id}`);
      if (response.data && response.data.messages) {
        const loadedMessages = response.data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content
        }));
        setMessages(loadedMessages);
      }
    } catch (e) {
      console.log('Failed to load messages', e);
    } finally {
      setFetchingHistory(false);
    }
  };
  
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    const aiMsgId = Date.now().toString() + 'ai';
    const aiMsg = { id: aiMsgId, role: 'assistant', content: '' };
    setMessages(prev => [...prev, aiMsg]);

    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessages(prev => 
          prev.map(m => m.id === aiMsgId ? { ...m, content: "You are not logged in. Please go back and log in again." } : m)
        );
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${api.defaults.baseURL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          conversation_id: isNew ? null : id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Dynamic conversation routing update using headers if returned
      const headerConvId = response.headers.get('X-Conversation-Id') || response.headers.get('x-conversation-id');
      if (isNew && headerConvId) {
        router.setParams({ id: headerConvId });
      }

      // Fallback for environments without streaming body support
      if (!response.body) {
        const fullText = await response.text();
        // If not streaming, just show the whole thing (better than error)
        const lines = fullText.split('\n');
        let finalContent = '';
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              // Dynamic conversation routing update using data chunk
              if (data.conversation_id && isNew) {
                router.setParams({ id: data.conversation_id });
              }
              const text = data.token || data.content;
              if (text) {
                const tokenStr = typeof text === 'string' ? text : JSON.stringify(text);
                finalContent += tokenStr.replace(/\*/g, '');
              }
            } catch (e) {}
          }
        }
        setMessages(prev => 
          prev.map(m => m.id === aiMsgId ? { ...m, content: finalContent } : m)
        );
        setLoading(false);
        return;
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              // Dynamic conversation routing update using data chunk
              if (data.conversation_id && isNew) {
                router.setParams({ id: data.conversation_id });
              }
              const text = data.token || data.content;
              if (text) {
                const tokenStr = typeof text === 'string' ? text : JSON.stringify(text);
                fullContent += tokenStr.replace(/\*/g, '');
                setMessages(prev => 
                  prev.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m)
                );
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.log('Send error', e);
      setMessages(prev => 
        prev.map(m => m.id === aiMsgId ? { ...m, content: "Sorry, I couldn't process your request. Please check your connection and API key." } : m)
      );
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DentAI Assistant</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {messages.length === 0 && (
        <View style={styles.quickRepliesContainer}>
          <Text style={styles.quickRepliesTitle}>Suggested Topics</Text>
          <ScrollView contentContainerStyle={styles.chipsContent}>
            {QUICK_REPLIES.map((reply, idx) => (
              <TouchableOpacity key={idx} style={styles.chip} onPress={() => sendMessage(reply)}>
                <Text style={styles.chipText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {fetchingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A7FD4" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask DentAI anything..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || loading}
          >
            <Icon name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  chatList: { padding: 16, paddingBottom: 32 },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#1A7FD4',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: { fontSize: 16, lineHeight: 24 },
  userText: { color: '#fff' },
  aiText: { color: '#1E293B' },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A7FD4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  quickRepliesContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  quickRepliesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 12,
  },
  chipsContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  chipText: {
    color: '#1D4ED8',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 16,
  },
});
