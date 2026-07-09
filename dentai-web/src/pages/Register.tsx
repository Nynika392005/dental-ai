import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, User as UserIcon, Mail, Phone, Lock, Stethoscope, MapPin, FileText } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  // Dentist-only fields
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      await register(fullName, email, phone, password, role, {
        specialization,
        bio,
        clinic_name: clinicName,
        clinic_address: clinicAddress,
        platform: 'web',
      });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic validation errors come as an array
        setError(detail.map((e: any) => {
          const field = e.loc ? e.loc.slice(1).join('.') : '';
          return `${field ? field + ': ' : ''}${e.msg}`;
        }).join(' | '));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError(err.message || 'Registration failed. Please check your inputs and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper animate-fade-in">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <Activity size={24} />
          </div>
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join DentAI to get personalized dental diagnostics</p>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: '20px' }}>{error}</div>}
        {success && (
          <div className="error-banner" style={{ backgroundColor: 'var(--success-light)', borderColor: 'rgba(22, 163, 74, 0.2)', color: 'var(--success)', marginBottom: '20px' }}>
            Account created successfully! Redirecting to login...
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Role selector first so dentist fields appear dynamically */}
          <div className="form-group">
            <label className="form-label" htmlFor="role">Register As</label>
            <select id="role" className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="patient">Patient</option>
              <option value="dentist">Dentist</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="fullName">{role === 'dentist' ? 'Full Name (e.g. Dr. Jane Smith)' : 'Full Name'}</label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: '#94a3b8' }} />
              <input id="fullName" type="text" className="form-input" style={{ paddingLeft: '40px' }}
                placeholder={role === 'dentist' ? 'Dr. Jane Smith' : 'Your full name'}
                value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: '#94a3b8' }} />
              <input id="email" type="email" className="form-input" style={{ paddingLeft: '40px' }}
                placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: '#94a3b8' }} />
              <input id="phone" type="tel" className="form-input" style={{ paddingLeft: '40px' }}
                placeholder="555-0199" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password (min 8 chars)</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: '#94a3b8' }} />
              <input id="password" type="password" className="form-input" style={{ paddingLeft: '40px' }}
                placeholder="Choose a password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>

          {/* Dentist-only fields */}
          {role === 'dentist' && (
            <div className="animate-fade-in" style={{ borderTop: '1px solid var(--bg-light-border)', paddingTop: '20px', marginTop: '8px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Clinic & Professional Details
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="clinicName">Clinic Name</label>
                <div style={{ position: 'relative' }}>
                  <Stethoscope size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: '#94a3b8' }} />
                  <input id="clinicName" type="text" className="form-input" style={{ paddingLeft: '40px' }}
                    placeholder="e.g. Pearl Dental Clinic" value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)} required={role === 'dentist'} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="clinicAddress">Clinic Address</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: '#94a3b8' }} />
                  <input id="clinicAddress" type="text" className="form-input" style={{ paddingLeft: '40px' }}
                    placeholder="123 Main Street, City" value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)} required={role === 'dentist'} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="specialization">Specialization</label>
                <select id="specialization" className="form-select" value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)} required={role === 'dentist'}>
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
                <label className="form-label" htmlFor="bio">Short Bio</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
                  <textarea id="bio" className="form-input" style={{ paddingLeft: '40px', minHeight: '80px' }}
                    placeholder="Brief description of your practice and experience"
                    value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <button id="register-button" type="submit" className="auth-btn" disabled={loading || success}>
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login" style={{ fontWeight: 700 }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
};
