import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ShieldAlert, 
  ChevronRight, 
  ChevronLeft, 
  Activity, 
  AlertTriangle, 
  Info,
  CalendarDays,
  CheckCircle2
} from 'lucide-react';

const SYMPTOMS_LIST = [
  "Sharp tooth pain",
  "Dull throbbing ache",
  "Bleeding gums when brushing",
  "Swollen or red gums",
  "Extreme sensitivity to hot/cold",
  "Pain when biting down",
  "Loose tooth",
  "Bad breath (Halitosis)",
  "Chipped or broken tooth",
  "Sore or ulcer in the mouth"
];

export const SymptomChecker: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState<number>(5);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleToggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && selectedSymptoms.length === 0) {
      alert("Please select at least one symptom to proceed.");
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBackStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmitAssessment = async () => {
    setLoading(true);
    setError('');
    
    const formattedSymptoms = [
      ...selectedSymptoms,
      `Pain level ${painLevel} out of 10`
    ];

    try {
      const res = await api.post('/symptoms/analyze', {
        symptoms: formattedSymptoms
      });
      setResult(res.data);
      setStep(3);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail)
        ? detail.map((e: any) => e.msg).join(', ')
        : detail || 'Failed to analyze symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedSymptoms([]);
    setPainLevel(5);
    setResult(null);
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'urgent': return <AlertTriangle size={24} color="var(--danger)" />;
      case 'soon': return <ShieldAlert size={24} color="var(--warning)" />;
      case 'monitor': return <Info size={24} color="var(--primary)" />;
      default: return <CheckCircle2 size={24} color="var(--success)" />;
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <div className="symptom-wizard">
        
        {/* Progress Bar */}
        <div className="wizard-progress">
          <div 
            className="wizard-progress-bar" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {error && <div className="error-banner" style={{ marginBottom: '20px' }}>{error}</div>}

        {/* Step 1: Symptoms Selection */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h3 className="flow-step-title">Select all symptoms you are experiencing:</h3>
            <div className="symptoms-selector">
              {SYMPTOMS_LIST.map((symptom) => {
                const isChecked = selectedSymptoms.includes(symptom);
                return (
                  <div 
                    key={symptom} 
                    className={`symptom-checkbox ${isChecked ? 'checked' : ''}`}
                    onClick={() => handleToggleSymptom(symptom)}
                    style={{ cursor: 'pointer' }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => {}} // Handle onClick on parent div
                    />
                    <span className="symptom-checkbox-label">{symptom}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="wizard-actions" style={{ justifyContent: 'flex-end' }}>
              <button className="wizard-btn-next" onClick={handleNextStep}>
                <span>Continue</span>
                <ChevronRight size={16} style={{ marginLeft: '4px' }} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pain Level Assessment */}
        {step === 2 && (
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            <h3 className="flow-step-title" style={{ textAlign: 'left' }}>Rate your current pain level:</h3>
            
            <div style={{ margin: '50px 0' }}>
              <span style={{ fontSize: '72px', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{painLevel}</span>
              <span style={{ fontSize: '24px', color: 'var(--text-secondary)' }}>/10</span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '10px' }}>
                {painLevel <= 3 ? 'Mild discomfort (annoying but manageable)' : 
                 painLevel <= 7 ? 'Moderate pain (affects concentration/eating)' : 
                 'Severe pain (unbearable, requires immediate attention)'}
              </p>
            </div>

            <div style={{ padding: '0 20px', marginBottom: '40px' }}>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={painLevel} 
                onChange={(e) => setPainLevel(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', accentColor: 'var(--primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 700 }}>
                <span>1 - MILD</span>
                <span>5 - MODERATE</span>
                <span>10 - SEVERE</span>
              </div>
            </div>

            <div className="wizard-actions">
              <button className="wizard-btn-back" onClick={handleBackStep}>
                <ChevronLeft size={16} style={{ marginRight: '4px' }} />
                <span>Back</span>
              </button>
              
              <button className="wizard-btn-next" onClick={handleSubmitAssessment} disabled={loading}>
                {loading ? 'Analyzing...' : 'Run Diagnostics'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Diagnostic Results */}
        {step === 3 && result && (
          <div className="animate-fade-in">
            <h3 className="flow-step-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="var(--primary)" />
              <span>AI Diagnostic Assessment</span>
            </h3>

            <div className="assessment-result-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getUrgencyIcon(result.urgency_level)}
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>Recommended Urgency Level:</span>
                </div>
                <span className={`urgency-badge ${result.urgency_level}`}>
                  {result.urgency_level}
                </span>
              </div>

              <div 
                style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '16px', fontSize: '15px', color: '#334155', lineHeight: 1.7 }}
              >
                {result.ai_assessment}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {result.symptoms.map((sym: string, i: number) => (
                  <span key={i} style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '12px', color: '#64748b', fontWeight: 600 }}>
                    {sym}
                  </span>
                ))}
              </div>
            </div>

            <div className="wizard-actions" style={{ marginTop: '40px' }}>
              <button className="wizard-btn-back" onClick={handleReset}>
                <span>Check Again</span>
              </button>

              <button 
                className="wizard-btn-next" 
                style={{ backgroundColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={() => navigate('/appointments')}
              >
                <CalendarDays size={16} />
                <span>Schedule Clinic Visit</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
