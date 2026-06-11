import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, 
  CalendarPlus, 
  ShieldAlert, 
  BookOpen, 
  Pill, 
  Award, 
  ChevronRight, 
  Flame, 
  Sparkles,
  Smile,
  Mic,
  Activity
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const smartTools = [
    { 
      name: 'Scan Meds', 
      icon: <Pill size={20} color="#0d9488" />, 
      bg: '#f0fdfa',
      prompt: 'Can you help me analyze the oral side effects of my current medications?'
    },
    { 
      name: 'Tooth Check', 
      icon: <Sparkles size={20} color="#7c3aed" />, 
      bg: '#f5f3ff',
      prompt: 'I want to perform a self-assessment on my teeth. What should I look for?' 
    },
    { 
      name: 'Food Impact', 
      icon: <Flame size={20} color="#ea580c" />, 
      bg: '#fff7ed',
      prompt: 'What are the best and worst foods for enamel health and staining?' 
    },
    { 
      name: 'Habit Sentinel', 
      icon: <Award size={20} color="#db2777" />, 
      bg: '#fdf2f8',
      prompt: 'How do habits like coffee drinking or nail biting affect my teeth over time?' 
    },
    { 
      name: 'Voice Assist', 
      icon: <Mic size={20} color="#2563eb" />, 
      bg: '#eff6ff',
      prompt: 'Start voice consultation.',
      voice: true
    }
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '30px' }}>
        <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{getGreeting()},</span>
        <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a' }}>{user?.full_name || 'Patient'}</h2>
      </div>

      <div className="dashboard-grid">
        {/* Left Column */}
        <div>
          {/* Health Score Card */}
          <div className="health-score-card">
            <div className="score-details">
              <h3>Oral Health Score</h3>
              <p>Based on your last assessment checklist</p>
              <div className="score-badge">
                <span className="score-num">85</span>
                <span className="score-total">/100</span>
              </div>
            </div>
            <div className="score-visual">
              <Smile size={48} />
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="quick-actions-grid">
            <div 
              className="action-card" 
              style={{ backgroundColor: '#e0f2fe', cursor: 'pointer' }}
              onClick={() => navigate('/chat')}
            >
              <div className="action-icon" style={{ backgroundColor: '#bae6fd', color: '#0284c7' }}>
                <MessageSquare size={24} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span className="action-title">Chat with AI</span>
                <ChevronRight size={18} color="#0284c7" />
              </div>
            </div>

            <div 
              className="action-card" 
              style={{ backgroundColor: '#dcfce7', cursor: 'pointer' }}
              onClick={() => navigate('/appointments')}
            >
              <div className="action-icon" style={{ backgroundColor: '#bbf7d0', color: '#16a34a' }}>
                <CalendarPlus size={24} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span className="action-title">Book Visit</span>
                <ChevronRight size={18} color="#16a34a" />
              </div>
            </div>

            <div 
              className="action-card" 
              style={{ backgroundColor: '#fee2e2', cursor: 'pointer' }}
              onClick={() => navigate('/symptom-checker')}
            >
              <div className="action-icon" style={{ backgroundColor: '#fecaca', color: '#dc2626' }}>
                <ShieldAlert size={24} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span className="action-title">Check Symptoms</span>
                <ChevronRight size={18} color="#dc2626" />
              </div>
            </div>

            <div 
              className="action-card" 
              style={{ backgroundColor: '#f3e8ff', cursor: 'pointer' }}
              onClick={() => navigate('/education')}
            >
              <div className="action-icon" style={{ backgroundColor: '#e9d5ff', color: '#9333ea' }}>
                <BookOpen size={24} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span className="action-title">Learn Hub</span>
                <ChevronRight size={18} color="#9333ea" />
              </div>
            </div>
          </div>

          {/* Smart AI Tools */}
          <div className="smart-tools-section">
            <div className="section-header">
              <span className="section-title">Smart AI Assistants</span>
            </div>
            <div className="tools-scroll">
              {smartTools.map((tool, index) => (
                <div 
                  key={index} 
                  className="tool-card" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (tool.voice) {
                      navigate(`/chat?voice=true`);
                    } else {
                      navigate(`/chat?q=${encodeURIComponent(tool.prompt)}`);
                    }
                  }}
                >
                  <div className="tool-icon" style={{ backgroundColor: tool.bg }}>
                    {tool.icon}
                  </div>
                  <span className="tool-label">{tool.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Daily Tip Panel */}
          <div className="daily-tip-panel" style={{ height: '100%' }}>
            <div className="tip-header">
              <div style={{ color: '#f59e0b' }}>
                <Sparkles size={24} />
              </div>
              <span className="tip-title">Daily Oral Health Tip</span>
            </div>
            <div className="tip-content">
              {loadingTip ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Loading health tips...</div>
              ) : (
                dailyTip?.tip_text || 
                'Brush your teeth twice a day for two minutes each time using fluoride toothpaste to keep enamel strong.'
              )}
            </div>
            <div style={{ flex: 1 }}></div>
            <div style={{ borderTop: '1px solid var(--bg-light-border)', paddingTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={20} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>Stay On Track</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Log assessments daily for accuracy</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
