import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  Volume2,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const QUICK_REPLIES = [
  "How do I brush properly?",
  "What causes tooth sensitivity?",
  "Is a root canal painful?",
  "Signs I need to see a dentist urgently",
  "How often should I floss?"
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  messages: Message[];
}

export const Chat: React.FC = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q');
  const voiceParam = searchParams.get('voice');

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Conversation history
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const didAutoSend = useRef(false);

  // Stop speech when leaving the chat page
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation history
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoadingConvs(true);
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data || []);
    } catch (e) {
      console.error('Failed to fetch conversations', e);
    } finally {
      setLoadingConvs(false);
    }
  };

  const loadConversation = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content
    })));
    window.speechSynthesis?.cancel();
  };

  // Speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setInputText(text);
        setIsListening(false);
        if (text.trim()) handleSendMessage(text);
      };
      rec.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, [activeConvId]);

  // Handle URL params — run once
  useEffect(() => {
    if (didAutoSend.current) return;
    if (queryParam) {
      didAutoSend.current = true;
      handleSendMessage(queryParam);
    }
    if (voiceParam === 'true') {
      triggerVoiceInstruction();
    }
  }, [queryParam, voiceParam]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const triggerVoiceInstruction = () => {
    setVoiceEnabled(true);
    speak("I am ready. Please click the microphone icon and tell me your question. I will read the answer back to you.");
  };

  const startMediaRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size === 0) return;

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            const base64 = base64data.includes(',') ? base64data.split(',')[1] : base64data;
            try {
              const res = await api.post('/mobile-transcribe', {
                audio_base64: base64,
                file_ext: 'webm'
              });
              const text = res.data?.text?.trim();
              if (text) {
                setInputText(text);
                handleSendMessage(text);
              }
            } catch (err) {
              console.error('MediaRecorder transcription failed', err);
              alert("Voice service unavailable. Please try again.");
            }
          };
        } catch (e) {
          console.error('Error processing recorded audio', e);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      window.speechSynthesis?.cancel();
    } catch (err) {
      console.error('Failed to get microphone access', err);
      alert("Could not access microphone. Please allow microphone access.");
    }
  };

  const toggleVoiceListening = () => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      } else if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    if (recognitionRef.current) {
      try {
        window.speechSynthesis?.cancel();
        setIsListening(true);
        recognitionRef.current.start();
      } catch (err) {
        console.warn('SpeechRecognition failed to start, falling back to MediaRecorder', err);
        startMediaRecorderFallback();
      }
    } else {
      startMediaRecorderFallback();
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

    try {
      const baseURL = api.defaults.baseURL;
      const response = await fetch(`${baseURL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: text, conversation_id: activeConvId })
      });

      if (!response.ok) throw new Error('Failed to communicate with AI server');

      const headerConvId = response.headers.get('X-Conversation-Id') || response.headers.get('x-conversation-id');
      if (headerConvId && !activeConvId) {
        setActiveConvId(headerConvId);
      }

      let streamedContent = '';

      if (!response.body) {
        const rawText = await response.text();
        for (const line of rawText.split('\n')) {
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.conversation_id && !activeConvId) setActiveConvId(data.conversation_id);
              const chunk = data.token || data.content;
              if (chunk) streamedContent += chunk;
            } catch (e) {}
          }
        }
        const clean = streamedContent.replace(/\*/g, '');
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: clean } : m));
        if (voiceEnabled) speak(clean);
        setLoading(false);
        fetchConversations();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.conversation_id && !activeConvId) setActiveConvId(data.conversation_id);
              const textChunk = data.token || data.content;
              if (textChunk) {
                streamedContent += textChunk;
                const clean = streamedContent.replace(/\*/g, '');
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: clean } : m));
              }
            } catch (e) {}
          }
        }
      }

      if (voiceEnabled) speak(streamedContent.replace(/\*/g, ''));
      // Refresh history list after reply
      fetchConversations();
    } catch (error: any) {
      setMessages(prev =>
        prev.map(m => m.id === assistantMsgId ? { ...m, content: "Error contacting DentAI server. Please check your connection." } : m)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewChat = () => {
    setMessages([]);
    setActiveConvId(null);
    window.speechSynthesis?.cancel();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="page-container" style={{ padding: '20px 40px' }}>
      <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)', minHeight: '500px' }}>

        {/* History Sidebar */}
        <div style={{
          width: historyOpen ? '260px' : '0px',
          minWidth: historyOpen ? '260px' : '0px',
          transition: 'all 0.25s ease',
          overflow: 'hidden',
          backgroundColor: '#fff',
          borderRadius: '16px',
          border: historyOpen ? '1px solid var(--bg-light-border)' : 'none',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {historyOpen && (
            <>
              <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--bg-light-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>Chat History</span>
                <button
                  onClick={handleStartNewChat}
                  style={{ background: 'var(--primary)', border: 'none', borderRadius: '8px', padding: '5px 10px', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={12} /> New
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {loadingConvs ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Loading...</div>
                ) : conversations.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No conversations yet</div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        backgroundColor: activeConvId === conv.id ? 'var(--primary-light)' : 'transparent',
                        border: `1px solid ${activeConvId === conv.id ? 'rgba(26,127,212,0.2)' : 'transparent'}`,
                        marginBottom: '4px',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.title || 'New Conversation'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', color: '#94a3b8', fontSize: '11px' }}>
                        <Clock size={10} />
                        <span>{formatDate(conv.created_at)}</span>
                        <span style={{ marginLeft: 'auto' }}>{conv.messages?.length || 0} msgs</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Toggle History Button */}
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          style={{
            alignSelf: 'flex-start',
            marginTop: '16px',
            width: '24px',
            height: '24px',
            border: '1px solid var(--bg-light-border)',
            borderRadius: '50%',
            backgroundColor: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#64748b'
          }}
          title={historyOpen ? 'Hide history' : 'Show history'}
        >
          {historyOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Main Chat Window */}
        <div className="chat-window" style={{ flex: 1 }}>
          {/* Chat Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--bg-light-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 800, fontSize: '18px' }}>DentAI Chat Room</span>
              <button
                className={`voice-btn ${voiceEnabled ? 'listening' : ''}`}
                style={{ width: '30px', height: '30px', border: 'none', padding: 0 }}
                onClick={() => {
                  if (voiceEnabled) { setVoiceEnabled(false); window.speechSynthesis?.cancel(); }
                  else triggerVoiceInstruction();
                }}
                title="Toggle Text-to-Speech narration"
              >
                <Volume2 size={16} color={voiceEnabled ? 'var(--primary)' : 'var(--text-secondary)'} />
              </button>
            </div>

            <button
              className="landing-btn-outline"
              style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              onClick={handleStartNewChat}
            >
              <Plus size={14} />
              <span>New Chat</span>
            </button>
          </div>

          {/* Messages */}
          <div className="chat-history">
            {messages.length === 0 ? (
              <div className="chat-welcome animate-fade-in">
                <div className="chat-welcome-icon">
                  <MessageSquare size={32} />
                </div>
                <h3>Ask DentAI</h3>
                <p>Get answers to common hygiene queries, medication questions, and pain assessments.</p>
                <div className="suggestion-chips">
                  {QUICK_REPLIES.map((reply, index) => (
                    <button key={index} className="suggestion-chip" onClick={() => handleSendMessage(reply)}>
                      <span>{reply}</span>
                      <Sparkles size={14} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`message-bubble-wrapper ${msg.role}`}>
                  <div className="message-bubble">
                    {msg.content || (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '6px 0' }}>
                        <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span>
                        <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }}></span>
                        <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }}></span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Listening overlay */}
          {isListening && (
            <div className="voice-overlay animate-fade-in">
              <Mic size={24} className="animate-float" color="var(--danger)" />
              <span className="voice-text">Listening to your voice... Speak now</span>
            </div>
          )}

          {/* Input */}
          <div className="chat-input-panel">
            <button className={`voice-btn ${isListening ? 'listening' : ''}`} onClick={toggleVoiceListening} title="Speak your query">
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                placeholder="Ask DentAI anything..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(inputText); }}
                disabled={loading}
              />
            </div>
            <button className="send-btn" onClick={() => handleSendMessage(inputText)} disabled={loading || !inputText.trim()}>
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
