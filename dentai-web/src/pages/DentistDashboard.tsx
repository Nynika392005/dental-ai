import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CalendarCheck, Users, MessageSquare, BookOpen,
  ChevronRight, Clock, CheckCircle, XCircle,
  Sparkles, Activity, ScanSearch, Stethoscope
} from 'lucide-react';

interface Appointment {
  id: string;
  patient_name: string;
  clinic_name: string;
  scheduled_at: string;
  reason?: string;
  status: string;
}

interface DentistProfile {
  specialization: string;
  clinic_name: string;
  clinic_address: string;
}

export const DentistDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profile, setProfile] = useState<DentistProfile | null>(null);
  const [dailyTip, setDailyTip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [apptRes, profileRes, tipRes] = await Promise.all([
        api.get('/appointments/'),
        api.get('/auth/dentist-profile'),
        api.get('/education/daily-tip')
      ]);
      setAppointments(apptRes.data || []);
      setProfile(profileRes.data);
      setDailyTip(tipRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const today = new Date().toDateString();
  const todayAppts = appointments.filter(a => new Date(a.scheduled_at).toDateString() === today);
  const pendingAppts = appointments.filter(a => a.status === 'scheduled');
  const totalPatients = new Set(appointments.map(a => a.patient_name)).size;

  const statusColor: Record<string, string> = {
    scheduled: '#f59e0b',
    confirmed: '#3b82f6',
    completed: '#16a34a',
    cancelled: '#dc2626'
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{getGreeting()},</span>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{user?.full_name}</h2>
          {profile && (
            <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
              {profile.specialization} · {profile.clinic_name}
            </span>
          )}
        </div>
        <button className="landing-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          onClick={() => navigate('/profile')}>
          <Stethoscope size={14} /> My Profile
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: "Today's Appointments", value: todayAppts.length, icon: <CalendarCheck size={22} color="#0284c7" />, bg: '#e0f2fe' },
          { label: 'Pending Confirmations', value: pendingAppts.length, icon: <Clock size={22} color="#d97706" />, bg: '#fef3c7' },
          { label: 'Total Patients', value: totalPatients, icon: <Users size={22} color="#7c3aed" />, bg: '#f5f3ff' },
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--bg-light-border)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Left: Upcoming appointments */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '16px' }}>Upcoming Appointments</h3>
            <button className="landing-btn-outline" style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => navigate('/appointments')}>View All</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</div>
          ) : appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', border: '1px dashed var(--bg-light-border)', borderRadius: '16px', color: '#94a3b8' }}>
              No appointments yet. Patients will book with you after you register.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {appointments.slice(0, 5).map(appt => (
                <div key={appt.id} style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid var(--bg-light-border)', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{appt.patient_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} />
                        {new Date(appt.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      {appt.reason && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Reason: {appt.reason}</div>}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, textTransform: 'capitalize',
                      padding: '3px 10px', borderRadius: '20px',
                      backgroundColor: statusColor[appt.status] + '18',
                      color: statusColor[appt.status],
                      border: `1px solid ${statusColor[appt.status]}30`
                    }}>{appt.status}</span>
                  </div>
                  {appt.status === 'scheduled' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button onClick={() => handleStatusUpdate(appt.id, 'confirmed')}
                        style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <CheckCircle size={13} /> Confirm
                      </button>
                      <button onClick={() => handleStatusUpdate(appt.id, 'cancelled')}
                        style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid #fecdd3', backgroundColor: '#fff1f2', color: '#dc2626', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <XCircle size={13} /> Cancel
                      </button>
                    </div>
                  )}
                  {appt.status === 'confirmed' && (
                    <button onClick={() => handleStatusUpdate(appt.id, 'completed')}
                      style={{ width: '100%', marginTop: '10px', padding: '7px', borderRadius: '8px', border: '1px solid #bae6fd', backgroundColor: '#f0f9ff', color: '#0284c7', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <CheckCircle size={13} /> Mark as Completed
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div style={{ marginTop: '28px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>Quick Actions</h3>
            <div className="quick-actions-grid">
              {[
                { label: 'AI Chat', icon: <MessageSquare size={22} />, bg: '#e0f2fe', color: '#0284c7', path: '/chat' },
                { label: 'AI Scan', icon: <ScanSearch size={22} />, bg: '#f0fdf4', color: '#16a34a', path: '/scan' },
                { label: 'Learn Hub', icon: <BookOpen size={22} />, bg: '#f3e8ff', color: '#9333ea', path: '/education' },
                { label: 'All Appointments', icon: <CalendarCheck size={22} />, bg: '#fef3c7', color: '#d97706', path: '/appointments' },
              ].map((a, i) => (
                <div key={i} className="action-card" style={{ backgroundColor: a.bg, cursor: 'pointer' }} onClick={() => navigate(a.path)}>
                  <div className="action-icon" style={{ backgroundColor: a.color + '22', color: a.color }}>{a.icon}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="action-title">{a.label}</span>
                    <ChevronRight size={16} color={a.color} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tip + AI tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="daily-tip-panel">
            <div className="tip-header">
              <Sparkles size={22} color="#f59e0b" />
              <span className="tip-title">Clinical Tip of the Day</span>
            </div>
            <div className="tip-content">
              {dailyTip?.tip_text || 'Educate patients on proper flossing technique during every routine checkup to improve compliance.'}
            </div>
            <div style={{ borderTop: '1px solid var(--bg-light-border)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={18} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>Stay Updated</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Check the Learn Hub for new articles</div>
              </div>
            </div>
          </div>

          {/* AI Tools */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--bg-light-border)', padding: '20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px' }}>Smart AI Tools</h3>
            <div className="tools-scroll">
              {[
                { name: 'Tooth Scan', bg: '#f5f3ff', icon: <ScanSearch size={18} color="#7c3aed" />, path: '/scan?type=tooth' },
                { name: 'Med Scan', bg: '#f0fdfa', icon: <ScanSearch size={18} color="#0d9488" />, path: '/scan?type=medicine' },
                { name: 'Food Check', bg: '#fff7ed', icon: <ScanSearch size={18} color="#ea580c" />, path: '/scan?type=food' },
                { name: 'Voice AI', bg: '#eff6ff', icon: <MessageSquare size={18} color="#2563eb" />, path: '/chat?voice=true' },
              ].map((t, i) => (
                <div key={i} className="tool-card" style={{ cursor: 'pointer' }} onClick={() => navigate(t.path)}>
                  <div className="tool-icon" style={{ backgroundColor: t.bg }}>{t.icon}</div>
                  <span className="tool-label">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
