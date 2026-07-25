import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import * as Speech from 'expo-speech';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

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
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const flatListRef = useRef<FlatList>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const recordingRef = useRef<boolean>(false);
  useEffect(() => { recordingRef.current = isListening; }, [isListening]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        Speech.stop();
        if (recordingRef.current) audioRecorder.stop().catch(() => {});
      };
    }, [])
  );

  useEffect(() => {
    if (!isNew && id) loadMessages();
    else setMessages([]);
  }, [id]);

  const loadMessages = async () => {
    setFetchingHistory(true);
    try {
      const response = await api.get(`/chat/conversations/${id}`);
      if (response.data?.messages) {
        setMessages(response.data.messages.map((m: any) => ({
          id: m.id, role: m.role, content: m.content,
        })));
      }
    } catch (e) {
      console.log('Failed to load messages', e);
    } finally {
      setFetchingHistory(false);
    }
  };

  const startRecording = async () => {
    try {
      if (Platform.OS !== 'web') {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) { alert("Please allow microphone access."); return; }
        
        // Enable recording mode for iOS and Android
        try {
          await AudioModule.setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
          });
        } catch (e) {
          console.warn('AudioModule.setAudioModeAsync warning:', e);
        }
      } else {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (micErr) {
            console.warn('Web microphone permission check warning:', micErr);
          }
        }
      }

      Speech.stop();
      await new Promise(r => setTimeout(r, 600));
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsListening(true);
      setIsVoiceMode(true);
    } catch (err) { console.error('Failed to start recording', err); }
  };

  const stopRecording = async () => {
    if (!isListening) return;
    setIsListening(false);
    setIsTranscribing(true);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) { setIsTranscribing(false); return; }
      
      // Try mobile-transcribe endpoint with base64 (bypasses network blocking)
      try {
        console.log('📤 Converting audio to base64 for mobile-transcribe...');
        
        let audioBase64: string;
        let fileExt = 'm4a';

        const isWebUri = Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('http');

        if (isWebUri) {
          console.log('🌐 Web platform detected, converting blob URL to base64...');
          const blobRes = await fetch(uri);
          const blob = await blobRes.blob();

          if (blob.type.includes('webm')) fileExt = 'webm';
          else if (blob.type.includes('mp4') || blob.type.includes('m4a')) fileExt = 'm4a';
          else if (blob.type.includes('wav')) fileExt = 'wav';
          else if (blob.type.includes('ogg')) fileExt = 'ogg';

          audioBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64 = result.includes(',') ? result.split(',')[1] : result;
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          audioBase64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        
        console.log('📤 Sending to /mobile-transcribe endpoint...');
        // Use mobile-transcribe endpoint with JSON
        const res = await api.post('/mobile-transcribe', {
          audio_base64: audioBase64,
          file_ext: fileExt
        });
        
        console.log('✅ Mobile transcribe successful!');
        const transcribedText: string = res.data?.text?.trim() ?? '';
        if (transcribedText) setInputText(transcribedText);
        else { alert("Couldn't catch that. Please try again."); setIsVoiceMode(false); }
        
      } catch (err) {
        console.error('❌ Mobile transcribe failed, trying multipart fallback', err);
        
        // Fallback: Try original multipart endpoint
        try {
          const formData = new FormData();
          const isWebUri = Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('http');
          if (isWebUri) {
            const blobRes = await fetch(uri);
            const blob = await blobRes.blob();
            formData.append('file', blob, `voice.m4a`);
          } else {
            // @ts-ignore
            formData.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' });
          }
          const res = await api.post('/chat/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const transcribedText: string = res.data?.text?.trim() ?? '';
          if (transcribedText) setInputText(transcribedText);
          else { alert("Couldn't catch that. Please try again."); setIsVoiceMode(false); }
        } catch (fallbackErr) {
          console.error('❌ Multipart fallback also failed', fallbackErr);
          throw fallbackErr; // Re-throw to trigger outer catch
        }
      }
      
    } catch (err) {
      console.error('Transcription failed', err);
      alert("Voice service unavailable. Try again.");
      setIsVoiceMode(false);
    } finally { setIsTranscribing(false); }
  };

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'en', pitch: 1.0, rate: 1.0 });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    const aiMsgId = Date.now().toString() + 'ai';
    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: "You are not logged in." } : m));
        return;
      }
      const response = await fetch(`${api.defaults.baseURL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: text, conversation_id: isNew ? null : id }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      const headerConvId = response.headers.get('X-Conversation-Id') || response.headers.get('x-conversation-id');
      if (isNew && headerConvId) router.setParams({ id: headerConvId });
      if (!response.body) {
        const fullText = await response.text();
        let finalContent = '';
        for (const line of fullText.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.conversation_id && isNew) router.setParams({ id: data.conversation_id });
            const t = data.token || data.content;
            if (t) finalContent += (typeof t === 'string' ? t : JSON.stringify(t)).replace(/\*/g, '');
          } catch {}
        }
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: finalContent } : m));
        if (isVoiceMode) setIsVoiceMode(false);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.conversation_id && isNew) router.setParams({ id: data.conversation_id });
            const t = data.token || data.content;
            if (t) {
              fullContent += (typeof t === 'string' ? t : JSON.stringify(t)).replace(/\*/g, '');
              setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m));
            }
          } catch {}
        }
      }
      setIsVoiceMode(false);
    } catch (e) {
      console.log('Send error', e);
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: "Sorry, couldn't process your request." } : m));
    } finally { setLoading(false); }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>{item.content}</Text>
        {!isUser && (
          <TouchableOpacity style={styles.replayBtn} onPress={() => speak(item.content)}>
            <Icon name="volume-high" size={16} color="#1A7FD4" />
            <Text style={styles.replayText}>Listen Again</Text>
          </TouchableOpacity>
        )}
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
        {isListening && (
          <View style={styles.recordingOverlay}>
            <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]}>
              <Icon name="microphone" size={32} color="#fff" />
            </Animated.View>
            <Text style={styles.recordingText}>Listening… tap ✓ when done</Text>
            <TouchableOpacity style={styles.tickBtn} onPress={stopRecording}>
              <Icon name="check" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        {isTranscribing && (
          <View style={styles.transcribingRow}>
            <ActivityIndicator size="small" color="#1A7FD4" />
            <Text style={styles.transcribingText}>Converting speech to text…</Text>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[styles.voiceBtn, isListening && styles.voiceBtnActive]}
            onPress={isListening ? stopRecording : startRecording}
            disabled={isTranscribing}
          >
            <Icon name={isListening ? "microphone-off" : "microphone"} size={24} color={isListening ? "#fff" : "#64748B"} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Ask DentAI anything…"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || loading) && { opacity: 0.5 }]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  chatList: { padding: 16, paddingBottom: 32 },
  messageBubble: { maxWidth: '80%', padding: 16, borderRadius: 20, marginBottom: 12 },
  userBubble: { backgroundColor: '#1A7FD4', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  messageText: { fontSize: 16, lineHeight: 24 },
  userText: { color: '#fff' },
  aiText: { color: '#1E293B' },
  replayBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  replayText: { fontSize: 12, color: '#1A7FD4', fontWeight: 'bold', marginLeft: 4 },
  recordingOverlay: { backgroundColor: '#EFF6FF', paddingVertical: 20, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#BFDBFE' },
  pulseDot: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center' },
  recordingText: { flex: 1, marginLeft: 16, color: '#1E3A5F', fontWeight: '600', fontSize: 15 },
  tickBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#16A34A', justifyContent: 'center', alignItems: 'center' },
  transcribingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  transcribingText: { marginLeft: 10, color: '#475569', fontSize: 14 },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'center' },
  voiceBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  voiceBtnActive: { backgroundColor: '#DC2626' },
  input: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, fontSize: 16, maxHeight: 100 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1A7FD4', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  quickRepliesContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  quickRepliesTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  chipsContent: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  chipText: { color: '#1D4ED8', fontSize: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 16 },
});
