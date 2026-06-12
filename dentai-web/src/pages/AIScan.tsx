import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import {
  Pill,
  Sparkles,
  Flame,
  Shield,
  Upload,
  Camera,
  RotateCcw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

type TaskType = 'medicine' | 'tooth' | 'food' | 'habit';

interface ScanTool {
  type: TaskType;
  name: string;
  icon: React.ReactNode;
  bg: string;
  color: string;
  description: string;
  prompt: string;
}

const SCAN_TOOLS: ScanTool[] = [
  {
    type: 'medicine',
    name: 'Scan Meds',
    icon: <Pill size={28} />,
    bg: '#f0fdfa',
    color: '#0d9488',
    description: 'Extract dosage, purpose, side effects and dental warnings from a medicine strip or packaging.',
    prompt: 'Upload a photo of a medicine package or strip to scan'
  },
  {
    type: 'tooth',
    name: 'Tooth Check',
    icon: <Sparkles size={28} />,
    bg: '#f5f3ff',
    color: '#7c3aed',
    description: 'AI analysis of your teeth photo to detect possible cavities, discoloration or anomalies.',
    prompt: 'Upload a clear photo of your teeth or dental X-ray'
  },
  {
    type: 'food',
    name: 'Food Impact',
    icon: <Flame size={28} />,
    bg: '#fff7ed',
    color: '#ea580c',
    description: 'Analyze food photos to assess their impact on enamel, staining potential and oral health.',
    prompt: 'Upload a photo of the food you want to analyze'
  },
  {
    type: 'habit',
    name: 'Habit Sentinel',
    icon: <Shield size={28} />,
    bg: '#fdf2f8',
    color: '#db2777',
    description: 'Detect signs of harmful dental habits like grinding, nail-biting or enamel wear from photos.',
    prompt: 'Upload a photo showing signs of the habit (teeth, nails, etc.)'
  }
];

function ResultCard({ label, value }: { label: string; value: string }) {
  const isUrgent = value?.toLowerCase().includes('urgent') || value?.toLowerCase().includes('soon');
  const isGood = value?.toLowerCase().includes('healthy') || value?.toLowerCase().includes('good') || Number(value) > 6;

  return (
    <div style={{
      padding: '14px 18px',
      backgroundColor: isUrgent ? '#fff1f2' : isGood ? '#f0fdf4' : '#f8fafc',
      borderRadius: '12px',
      border: `1px solid ${isUrgent ? '#fecdd3' : isGood ? '#bbf7d0' : '#e2e8f0'}`,
      marginBottom: '10px'
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '4px' }}>
        {label.replace(/_/g, ' ')}
      </div>
      <div style={{ fontSize: '15px', color: '#1e293b', lineHeight: 1.5 }}>{String(value)}</div>
    </div>
  );
}

export const AIScan: React.FC = () => {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type') as TaskType | null;

  const [selectedTool, setSelectedTool] = useState<ScanTool | null>(
    typeParam ? SCAN_TOOLS.find(t => t.type === typeParam) || null : null
  );
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select tool when URL param changes
  useEffect(() => {
    if (typeParam) {
      const tool = SCAN_TOOLS.find(t => t.type === typeParam);
      if (tool) {
        setSelectedTool(tool);
        setImage(null);
        setImageFile(null);
        setResult(null);
        setError('');
      }
    }
  }, [typeParam]);

  const handleToolSelect = (tool: ScanTool) => {
    setSelectedTool(tool);
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setResult(null);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imageFile || !selectedTool) return;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const formData = new FormData();
      formData.append('task_type', selectedTool.type);
      formData.append('file', imageFile);

      const res = await api.post('/analysis/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const urgencyColor = (level?: string) => {
    if (!level) return 'var(--primary)';
    if (level === 'urgent') return '#dc2626';
    if (level === 'soon') return '#f59e0b';
    return '#16a34a';
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px' }}>Smart AI Scan</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Upload an image and let AI analyze it for dental health insights.
        </p>
      </div>

      {/* Tool Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '36px' }}>
        {SCAN_TOOLS.map((tool) => (
          <div
            key={tool.type}
            onClick={() => handleToolSelect(tool)}
            style={{
              padding: '20px',
              borderRadius: '16px',
              border: `2px solid ${selectedTool?.type === tool.type ? tool.color : '#e2e8f0'}`,
              backgroundColor: selectedTool?.type === tool.type ? tool.bg : '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              backgroundColor: tool.bg, color: tool.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {tool.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{tool.name}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>{tool.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload & Result Panel */}
      {selectedTool && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '20px',
          border: '1px solid var(--bg-light-border)',
          padding: '32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px',
          alignItems: 'start'
        }} className="scan-panel">

          {/* Left: Upload */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ color: selectedTool.color }}>{selectedTool.icon}</div>
              <h3 style={{ fontWeight: 800, fontSize: '18px' }}>{selectedTool.name}</h3>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => !image && fileInputRef.current?.click()}
              style={{
                width: '100%',
                minHeight: '260px',
                borderRadius: '16px',
                border: `2px dashed ${image ? selectedTool.color : '#cbd5e1'}`,
                backgroundColor: image ? '#f8fafc' : '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: image ? 'default' : 'pointer',
                overflow: 'hidden',
                position: 'relative',
                marginBottom: '16px'
              }}
            >
              {image ? (
                <img src={image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '280px' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Camera size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                  <p style={{ fontWeight: 600, color: '#475569' }}>{selectedTool.prompt}</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>JPG, PNG or WEBP • Max 10MB</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              {!image ? (
                <button
                  className="landing-btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>Choose Image</span>
                </button>
              ) : !result ? (
                <>
                  <button
                    className="landing-btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={handleReset}
                  >
                    <RotateCcw size={14} />
                    <span>Change</span>
                  </button>
                  <button
                    className="landing-btn-primary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={handleScan}
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    <span>{loading ? 'Analyzing...' : 'Analyze Now'}</span>
                  </button>
                </>
              ) : (
                <button
                  className="landing-btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleReset}
                >
                  <RotateCcw size={14} />
                  <span>Scan Another</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Results */}
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '18px', marginBottom: '20px' }}>AI Analysis Results</h3>

            {!result && !error && !loading && (
              <div style={{
                padding: '40px 20px', textAlign: 'center',
                border: '1px dashed #e2e8f0', borderRadius: '16px',
                color: '#94a3b8'
              }}>
                <Info size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                <p style={{ fontWeight: 600 }}>No results yet</p>
                <p style={{ fontSize: '13px', marginTop: '6px' }}>Upload an image and click Analyze Now</p>
              </div>
            )}

            {loading && (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Loader2 size={40} color={selectedTool.color} style={{ marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#475569', fontWeight: 600 }}>AI is analyzing your image...</p>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>This may take a few seconds</p>
              </div>
            )}

            {error && (
              <div style={{
                padding: '20px', borderRadius: '16px',
                backgroundColor: '#fff1f2', border: '1px solid #fecdd3',
                display: 'flex', alignItems: 'flex-start', gap: '12px'
              }}>
                <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontWeight: 700, color: '#dc2626' }}>Analysis Failed</p>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{error}</p>
                </div>
              </div>
            )}

            {result && !result.error && (
              <div className="animate-fade-in">
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '20px', padding: '12px 16px',
                  backgroundColor: '#f0fdf4', borderRadius: '12px',
                  border: '1px solid #bbf7d0'
                }}>
                  <CheckCircle size={18} color="#16a34a" />
                  <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>Analysis Complete</span>
                </div>

                {/* Urgency badge if present */}
                {result.urgency && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '20px', marginBottom: '16px',
                    backgroundColor: urgencyColor(result.urgency) + '18',
                    border: `1px solid ${urgencyColor(result.urgency)}40`,
                    color: urgencyColor(result.urgency),
                    fontWeight: 700, fontSize: '13px', textTransform: 'capitalize'
                  }}>
                    <AlertTriangle size={14} />
                    Urgency: {result.urgency}
                  </div>
                )}

                {Object.entries(result)
                  .filter(([key]) => key !== 'urgency')
                  .map(([key, val]) => (
                    <ResultCard key={key} label={key} value={String(val)} />
                  ))
                }

                <div style={{
                  marginTop: '16px', padding: '14px', borderRadius: '12px',
                  backgroundColor: '#fffbeb', border: '1px solid #fde68a',
                  fontSize: '12px', color: '#92400e', lineHeight: 1.5
                }}>
                  ⚠️ This is an AI-generated analysis for informational purposes only. Always consult a qualified dentist for professional diagnosis and treatment.
                </div>
              </div>
            )}

            {result?.error && (
              <div style={{
                padding: '20px', borderRadius: '16px',
                backgroundColor: '#fff1f2', border: '1px solid #fecdd3'
              }}>
                <p style={{ color: '#dc2626' }}>{result.error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .scan-panel { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
