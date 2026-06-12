import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Mail, Phone, Stethoscope, MapPin, FileText, Save, CheckCircle } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const isDentist = user?.role === 'dentist';

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(isDentist);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDentist) fetchDentistProfile();
  }, [isDentist]);

  const fetchDentistProfile = async () => {
    try {
      const res = await api.get('/auth/dentist-profile');
      setSpecialization(res.data.specialization || '');
      setBio(res.data.bio || '');
      setClinicName(res.data.clinic_name || '');
      setClinicAddress(res.data.clinic_address || '');
    } catch (e) { console.error(e); }
    finally { setLoadingProfile(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');
    try {
      const body: Record<string, string> = { full_name: fullName, phone };
      if (isDentist) {
        body.specialization = specialization;
        body.bio = bio;
        body.clinic_name = clinicName;
        body.clinic_address = clinicAddress;
      }
      await api.patch('/auth/update-profile', body);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update profile.');
    } finally { setLoading(false); }
  };

  if (loadingProfile) {
    return <div className="page-container" style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>Loading profile...</div>;
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: '640px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>My Profile</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Update your personal and {isDentist ? 'clinic' : 'account'} information</p>
        </div>

        {/* Avatar + role badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', padding: '20px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--bg-light-border)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800 }}>
            {user?.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>{user?.full_name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user?.email}</div>
            <span style={{
              display: 'inline-block', marginTop: '6px', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
              backgroundColor: isDentist ? '#dbeafe' : '#dcfce7',
              color: isDentist ? '#1d4ed8' : '#16a34a',
              textTransform: 'capitalize'
            }}>{user?.role}</span>
          </div>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: '20px' }}>{error}</div>}
        {success && (
          <div className="error-banner" style={{ backgroundColor: 'var(--success-light)', borderColor: 'rgba(22,163,74,0.2)', color: 'var(--success)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} /> Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleSave} style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--bg-light-border)', padding: '28px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Personal Information
          </p>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={15} style={{ position: 'absolute', left: '14px', top: '15px', color: '#94a3b8' }} />
              <input type="text" className="form-input" style={{ paddingLeft: '40px' }}
                value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '14px', top: '15px', color: '#94a3b8' }} />
              <input type="email" className="form-input" style={{ paddingLeft: '40px', backgroundColor: '#f8fafc', color: '#94a3b8' }}
                value={user?.email || ''} disabled />
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Email cannot be changed</span>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={15} style={{ position: 'absolute', left: '14px', top: '15px', color: '#94a3b8' }} />
              <input type="tel" className="form-input" style={{ paddingLeft: '40px' }}
                value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
          </div>

          {/* Dentist-only section */}
          {isDentist && (
            <>
              <div style={{ borderTop: '1px solid var(--bg-light-border)', marginTop: '20px', paddingTop: '20px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Clinic & Professional Details
                </p>

                <div className="form-group">
                  <label className="form-label">Clinic Name</label>
                  <div style={{ position: 'relative' }}>
                    <Stethoscope size={15} style={{ position: 'absolute', left: '14px', top: '15px', color: '#94a3b8' }} />
                    <input type="text" className="form-input" style={{ paddingLeft: '40px' }}
                      value={clinicName} onChange={e => setClinicName(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Clinic Address</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={15} style={{ position: 'absolute', left: '14px', top: '15px', color: '#94a3b8' }} />
                    <input type="text" className="form-input" style={{ paddingLeft: '40px' }}
                      value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <select className="form-select" value={specialization} onChange={e => setSpecialization(e.target.value)}>
                    <option value="">Select specialization</option>
                    <option value="General Dentistry">General Dentistry</option>
                    <option value="Orthodontist">Orthodontist</option>
                    <option value="Periodontist">Periodontist</option>
                    <option value="Endodontist">Endodontist</option>
                    <option value="Oral Surgeon">Oral Surgeon</option>
                    <option value="Pediatric Dentist">Pediatric Dentist</option>
                    <option value="Cosmetic Dentist">Cosmetic Dentist</option>
                    <option value="Prosthodontist">Prosthodontist</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Short Bio</label>
                  <div style={{ position: 'relative' }}>
                    <FileText size={15} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
                    <textarea className="form-input" style={{ paddingLeft: '40px', minHeight: '90px' }}
                      value={bio} onChange={e => setBio(e.target.value)}
                      placeholder="Brief description of your practice and experience" />
                  </div>
                </div>
              </div>
            </>
          )}

          <button type="submit" className="auth-btn" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};
