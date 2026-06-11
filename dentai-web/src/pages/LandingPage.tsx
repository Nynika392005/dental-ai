import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, MessageSquare, ShieldCheck, Heart, Sparkles } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="landing-wrapper animate-fade-in">
      <header className="landing-header">
        <div className="sidebar-brand">
          <Activity size={28} className="brand-icon" />
          <span className="brand-text" style={{ color: '#0f172a' }}>DentAI</span>
        </div>
        <nav className="landing-nav">
          <Link to="/login" className="landing-btn-outline">Sign In</Link>
          <Link to="/register" className="landing-btn-primary">Register</Link>
        </nav>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <div className="hero-tag">
            <Sparkles size={14} />
            <span>AI-Powered Oral Health Companion</span>
          </div>
          <h2 className="hero-title">
            Your Personal <span>Dentist AI</span> Assistant & Health Companion
          </h2>
          <p className="hero-description">
            Consult our advanced AI assistant, diagnose symptoms instantly, view clinics, schedule physical appointments, and manage your oral health score effortlessly.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="landing-btn-primary" style={{ padding: '14px 28px', fontSize: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>Get Started Free</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="landing-btn-outline" style={{ padding: '14px 28px', fontSize: '16px' }}>
              Access Dashboard
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-sphere"></div>
          <div className="visual-card animate-float">
            <div className="visual-header">
              <div className="visual-avatar">
                <Activity size={20} />
              </div>
              <div>
                <div className="visual-name">DentAI Agent</div>
                <div style={{ fontSize: '11px', color: 'green', fontWeight: 700 }}>Online</div>
              </div>
            </div>
            <div className="visual-chat">
              Hi! I can help you check oral symptoms, calculate your health score, or help schedule your next dentist visit. How are your teeth feeling today?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '12px', color: '#64748b', fontWeight: 600 }}>Tooth pain</span>
              <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '12px', color: '#64748b', fontWeight: 600 }}>Gum bleeding</span>
            </div>
          </div>
        </div>
      </main>

      <section style={{ backgroundColor: '#fff', padding: '80px 40px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontSize: '32px', marginBottom: '16px', fontWeight: 800 }}>Smart Features Built For Patients</h3>
          <p style={{ color: '#64748b', marginBottom: '50px', maxWidth: '600px', margin: '0 auto 50px' }}>Our application integrates modern diagnostic features to make oral healthcare accessible and understandable.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
            <div style={{ padding: '30px', border: '1px solid #e2e8f0', borderRadius: '20px', textAlign: 'left' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifySelf: 'start', justifyContent: 'center', marginBottom: '20px' }}>
                <MessageSquare size={24} />
              </div>
              <h4 style={{ fontSize: '18px', marginBottom: '10px' }}>AI Chatbot Support</h4>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>Chat with an AI companion trained on professional dental guidelines to solve your doubts instantly.</p>
            </div>

            <div style={{ padding: '30px', border: '1px solid #e2e8f0', borderRadius: '20px', textAlign: 'left' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifySelf: 'start', justifyContent: 'center', marginBottom: '20px' }}>
                <ShieldCheck size={24} />
              </div>
              <h4 style={{ fontSize: '18px', marginBottom: '10px' }}>Symptom Checker</h4>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>Analyze tooth pain and gum issues step-by-step to understand the level of urgency.</p>
            </div>

            <div style={{ padding: '30px', border: '1px solid #e2e8f0', borderRadius: '20px', textAlign: 'left' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#f5f3ff', color: '#7c3aed', borderRadius: '12px', display: 'flex', alignItems: 'center', justifySelf: 'start', justifyContent: 'center', marginBottom: '20px' }}>
                <Heart size={24} />
              </div>
              <h4 style={{ fontSize: '18px', marginBottom: '10px' }}>Oral Score Tracking</h4>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>Receive updates, customized oral hygiene suggestions, and score updates to monitor your mouth health.</p>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '40px', textAlign: 'center', borderTop: '1px solid #1e293b' }}>
        <p style={{ fontSize: '14px' }}>&copy; 2026 DentAI. All rights reserved. Powered by Google Gemini.</p>
      </footer>
    </div>
  );
};
