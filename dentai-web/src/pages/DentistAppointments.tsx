import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Calendar, Clock, User as UserIcon, CheckCircle, XCircle, Search } from 'lucide-react';

interface Appointment {
  id: string;
  patient_name: string;
  clinic_name: string;
  scheduled_at: string;
  reason?: string;
  notes?: string;
  status: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Upcoming: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  Completed: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  Cancelled: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  Missed: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  // Legacy support
  scheduled: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  confirmed: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  completed: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  cancelled: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
};

export const DentistAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments/');
      setAppointments(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      fetchAppointments();
    } catch (e) { console.error(e); }
  };

  const filtered = appointments.filter(a => {
    const matchStatus = filter === 'all' || 
      (filter === 'Upcoming' && (a.status === 'Upcoming' || a.status === 'scheduled' || a.status === 'confirmed')) ||
      (filter === 'Completed' && (a.status === 'Completed' || a.status === 'completed')) ||
      (filter === 'Cancelled' && (a.status === 'Cancelled' || a.status === 'cancelled')) ||
      (filter === 'Missed' && (a.status === 'Missed' || a.status === 'expired' || a.status === 'missed')) ||
      a.status === filter;
      
    const matchSearch = a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.reason?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const tabs = ['all', 'Upcoming', 'Completed', 'Cancelled', 'Missed'];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Patient Appointments</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage and update appointments booked by your patients</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{
                padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${filter === t ? 'var(--primary)' : '#e2e8f0'}`,
                backgroundColor: filter === t ? 'var(--primary)' : '#fff',
                color: filter === t ? '#fff' : 'var(--text-secondary)',
                textTransform: 'capitalize'
              }}>
              {t}
              {t !== 'all' && (
                <span style={{ marginLeft: '6px', opacity: 0.8 }}>
                  ({
                    appointments.filter(a => {
                      if (t === 'Upcoming') return a.status === 'Upcoming' || a.status === 'scheduled' || a.status === 'confirmed';
                      if (t === 'Completed') return a.status === 'Completed' || a.status === 'completed';
                      if (t === 'Cancelled') return a.status === 'Cancelled' || a.status === 'cancelled';
                      if (t === 'Missed') return a.status === 'Missed' || a.status === 'expired' || a.status === 'missed';
                      return a.status === t;
                    }).length
                  })
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
          <input type="text" className="form-input"
            style={{ paddingLeft: '36px', paddingTop: '9px', paddingBottom: '9px', borderRadius: '20px', fontSize: '13px' }}
            placeholder="Search patient or reason..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Appointment list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading appointments...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', border: '1px dashed var(--bg-light-border)', borderRadius: '16px', color: '#94a3b8' }}>
          <Calendar size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ fontWeight: 600 }}>No appointments found</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Patients will appear here when they book with you</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(appt => {
            const sc = STATUS_COLORS[appt.status] || STATUS_COLORS.Upcoming;
            return (
              <div key={appt.id} style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--bg-light-border)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  {/* Patient info */}
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UserIcon size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b' }}>{appt.patient_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        <Clock size={13} />
                        {new Date(appt.scheduled_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                      </div>
                      {appt.reason && (
                        <div style={{ marginTop: '6px', fontSize: '13px', color: '#475569' }}>
                          <strong>Reason:</strong> {appt.reason}
                        </div>
                      )}
                      {appt.notes && (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                          Notes: {appt.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status + actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <span style={{
                      padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                      textTransform: 'capitalize', backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`
                    }}>{appt.status}</span>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(appt.status === 'Upcoming' || appt.status === 'scheduled' || appt.status === 'confirmed') && (<>
                        <button onClick={() => handleStatus(appt.id, 'Completed')}
                          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={13} /> Mark Completed
                        </button>
                        <button onClick={() => {
                          if (window.confirm("Are you sure you want to cancel this appointment?")) {
                            handleStatus(appt.id, 'Cancelled');
                          }
                        }}
                          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fff1f2', color: '#dc2626', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={13} /> Cancel
                        </button>
                      </>)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
