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
  Volume2
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Speech Recognition Setup
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
        // Automatically send after voice capture
        if (text.trim()) {
          handleSendMessage(text);
        }
      };

      rec.onerror = () => {
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [activeConvId]);

  // Handle URL Query Params
  useEffect(() => {
    if (queryParam) {
      handleSendMessage(queryParam);
    }
    if (voiceParam === 'true') {
      triggerVoiceInstruction();
    }
  }, [queryParam, voiceParam]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const triggerVoiceInstruction = () => {
    setVoiceEnabled(true);
    const instruction = "I am ready. Please click the microphone icon and tell me your question. I will read the answer back to you.";
    speak(instruction);
  };

  const toggleVoiceListening = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser. Please try Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis.cancel();
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: ''
    };
    setMessages(prev => [...prev, assistantPlaceholder]);

    try {
      const baseURL = api.defaults.baseURL;
      const response = await fetch(`${baseURL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: text,
          conversation_id: activeConvId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to communicate with AI server');
      }

      // Check header for conversation ID
      const headerConvId = response.headers.get('X-Conversation-Id') || response.headers.get('x-conversation-id');
      if (headerConvId && !activeConvId) {
        setActiveConvId(headerConvId);
      }

      if (!response.body) {
        // Fallback for non-streaming response body
        const rawText = await response.text();
        const lines = rawText.split('\n');
        let parsedContent = '';
        
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.conversation_id && !activeConvId) {
                setActiveConvId(data.conversation_id);
              }
              const chunk = data.token || data.content;
              if (chunk) {
                parsedContent += chunk;
              }
            } catch (e) {}
          }
        }
        
        const finalCleanContent = parsedContent.replace(/\*/g, '');
        setMessages(prev => 
          prev.map(m => m.id === assistantMsgId ? { ...m, content: finalCleanContent } : m)
        );
        if (voiceEnabled) {
          speak(finalCleanContent);
        }
        setLoading(false);
        return;
      }

      // Read from event stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.conversation_id && !activeConvId) {
                setActiveConvId(data.conversation_id);
              }
              const textChunk = data.token || data.content;
              if (textChunk) {
                streamedContent += textChunk;
                const cleanStreamed = streamedContent.replace(/\*/g, '');
                setMessages(prev => 
                  prev.map(m => m.id === assistantMsgId ? { ...m, content: cleanStreamed } : m)
                );
              }
            } catch (e) {}
          }
        }
      }

      if (voiceEnabled) {
        speak(streamedContent.replace(/\*/g, ''));
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => 
        prev.map(m => m.id === assistantMsgId ? { ...m, content: "Error contacting DentAI server. Please verify your Render configuration." } : m)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewChat = () => {
    setMessages([]);
    setActiveConvId(null);
    window.speechSynthesis.cancel();
  };

  return (
    <div className="page-container" style={{ padding: '20px 40px' }}>
      <div className="chat-window">
        {/* Chat Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--bg-light-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 800, fontSize: '18px' }}>DentAI Chat Room</span>
            <button 
              className={`voice-btn ${voiceEnabled ? 'listening' : ''}`}
              style={{ width: '30px', height: '30px', border: 'none', padding: 0 }}
              onClick={() => {
                if (voiceEnabled) {
                  setVoiceEnabled(false);
                  window.speechSynthesis.cancel();
                } else {
                  triggerVoiceInstruction();
                }
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

        {/* Message Panel */}
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
                  <button 
                    key={index} 
                    className="suggestion-chip"
                    onClick={() => handleSendMessage(reply)}
                  >
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

        {/* Listening Status overlay */}
        {isListening && (
          <div className="voice-overlay animate-fade-in">
            <Mic size={24} className="animate-float" color="var(--danger)" />
            <span className="voice-text">Listening to your voice... Speak now</span>
          </div>
        )}

        {/* Input Panel */}
        <div className="chat-input-panel">
          <button 
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleVoiceListening}
            title="Speak your query"
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          <div className="chat-input-wrapper">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask DentAI anything..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage(inputText);
              }}
              disabled={loading}
            />
          </div>

          <button 
            className="send-btn"
            onClick={() => handleSendMessage(inputText)}
            disabled={loading || !inputText.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
