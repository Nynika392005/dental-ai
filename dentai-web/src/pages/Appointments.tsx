import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  Building, 
  User as UserIcon, 
  Clock, 
  Calendar, 
  CheckCircle,
  MapPin,
  Phone,
  ListCollapse
} from 'lucide-react';

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface Dentist {
  id: string;
  full_name: string;
  specialization: string;
  bio?: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  clinic_id: string;
  scheduled_at: string;
  reason?: string;
  status: string;
  notes?: string;
}

export const Appointments: React.FC = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Selection states
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [selectedDentist, setSelectedDentist] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  
  // Form input states
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClinics();
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      fetchDentists(selectedClinic);
      setSelectedDentist('');
      setSlots([]);
      setSelectedSlot('');
    }
  }, [selectedClinic]);

  useEffect(() => {
    if (selectedDentist && selectedDate) {
      fetchSlots(selectedDentist, selectedDate);
      setSelectedSlot('');
    }
  }, [selectedDentist, selectedDate]);

  const fetchClinics = async () => {
    try {
      const res = await api.get('/appointments/clinics');
      setClinics(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDentists = async (clinicId: string) => {
    try {
      const res = await api.get(`/appointments/dentists/${clinicId}`);
      setDentists(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSlots = async (dentistId: string, date: string) => {
    try {
      const res = await api.get(`/appointments/slots`, {
        params: { dentist_id: dentistId, date }
      });
      setSlots(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments/');
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (!selectedClinic || !selectedDentist || !selectedDate || !selectedSlot) {
      setError('Please fill in all details.');
      setLoading(false);
      return;
    }

    try {
      // Build ISO string combining date and slot time
      const datetimeStr = `${selectedDate}T${selectedSlot}:00Z`;
      
      await api.post('/appointments/', {
        clinic_id: selectedClinic,
        dentist_id: selectedDentist,
        scheduled_at: datetimeStr,
        reason,
        notes
      });

      setSuccess(true);
      fetchAppointments();
      
      // Reset form
      setSelectedClinic('');
      setSelectedDentist('');
      setSelectedDate('');
      setSelectedSlot('');
      setReason('');
      setNotes('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to book appointment.');
    } finally {
      setLoading(false);
    }
  };

  const getClinicName = (id: string) => clinics.find(c => c.id === id)?.name || 'Clinic';
  const getDentistName = (id: string) => dentists.find(d => d.id === id)?.full_name || 'Dentist';

  return (
    <div className="page-container">
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
        
        {/* Left Side: Booking Form */}
        <div className="appointment-flow">
          <h3 className="flow-step-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--primary)" />
            <span>Schedule A Visit</span>
          </h3>

          {error && <div className="error-banner" style={{ marginBottom: '20px' }}>{error}</div>}
          {success && (
            <div className="error-banner" style={{ backgroundColor: 'var(--success-light)', borderColor: 'rgba(22, 163, 74, 0.2)', color: 'var(--success)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} />
              <span>Appointment booked successfully! Our clinic will confirm shortly.</span>
            </div>
          )}

          <form onSubmit={handleBookAppointment}>
            {/* Step 1: Select Clinic */}
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">1. Choose Clinic Location</label>
              <div className="clinics-list">
                {clinics.map((c) => (
                  <div 
                    key={c.id} 
                    className={`clinic-card ${selectedClinic === c.id ? 'selected' : ''}`}
                    onClick={() => setSelectedClinic(c.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Building size={18} color="var(--primary)" />
                      <span className="clinic-name">{c.name}</span>
                    </div>
                    <div className="clinic-detail" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} />
                      <span>{c.address}</span>
                    </div>
                    <div className="clinic-detail" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} />
                      <span>{c.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Select Dentist */}
            {selectedClinic && (
              <div className="form-group animate-fade-in" style={{ marginBottom: '24px' }}>
                <label className="form-label">2. Select Dental Doctor</label>
                <div className="dentists-list">
                  {dentists.map((d) => (
                    <div 
                      key={d.id} 
                      className={`dentist-card ${selectedDentist === d.id ? 'selected' : ''}`}
                      onClick={() => setSelectedDentist(d.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <UserIcon size={18} color="var(--primary)" />
                        <span className="dentist-name">{d.full_name}</span>
                      </div>
                      <span className="dentist-spec">{d.specialization}</span>
                      {d.bio && <p className="dentist-bio">{d.bio}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Date & Slot Selector */}
            {selectedDentist && (
              <div className="calendar-grid animate-fade-in">
                <div className="date-selector">
                  <label className="form-label">3. Select Checkup Date</label>
                  <input 
                    type="date" 
                    className="date-input" 
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                  />
                </div>

                {selectedDate && (
                  <div className="date-selector animate-fade-in">
                    <label className="form-label">4. Select Time Slot</label>
                    <div className="slots-grid">
                      {slots.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No slots available.</div>
                      ) : (
                        slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            className={`slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {slot}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reason & Comments */}
            {selectedSlot && (
              <div className="booking-confirm-form animate-fade-in">
                <div className="form-group">
                  <label className="form-label">Reason for Appointment</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Routine cleaning, severe toothache"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Additional Doctor Notes</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px' }}
                    placeholder="Enter any additional symptom notes or details"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <button type="submit" className="auth-btn" disabled={loading} style={{ width: '200px' }}>
                  {loading ? 'Confirming...' : 'Book Appointment'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Side: Appointment List */}
        <div className="daily-tip-panel animate-fade-in" style={{ alignSelf: 'start' }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <ListCollapse size={20} color="var(--primary)" />
            <span>Scheduled Visits</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '14px' }}>
                You have no upcoming scheduled appointments.
              </div>
            ) : (
              appointments.map((app) => (
                <div 
                  key={app.id} 
                  style={{ border: '1px solid var(--bg-light-border)', borderRadius: '12px', padding: '16px', background: 'var(--bg-light)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>{getClinicName(app.clinic_id)}</span>
                    <span 
                      style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '12px' }}
                      className={`urgency-badge ${app.status === 'scheduled' ? 'monitor' : 'routine'}`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <UserIcon size={14} color="var(--text-secondary)" />
                    <span>{getDentistName(app.dentist_id)}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Clock size={14} color="var(--text-secondary)" />
                    <span>{new Date(app.scheduled_at).toLocaleString()}</span>
                  </div>
                  {app.reason && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '6px' }}>
                      <strong>Reason:</strong> {app.reason}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
