'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getAccessToken } from '@/lib/supabase/client';
import { useLanguage } from '@/components/LanguageProvider';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const APPOINTMENT_TYPES = [
  'General Practitioner (GP)',
  'Specialist Consultation',
  'Emergency / Urgent Care',
  'Telehealth / Video Call',
  'Follow-up Appointment',
  'Mental Health',
  'Dental',
  'Other',
];

export default function ConsultationPage() {
  const { lang } = useLanguage();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [form, setForm] = useState({
    appointment_type: 'General Practitioner (GP)',
    appointment_date: '',
    doctor_name: '',
    main_concern: '',
  });
  const getToken = useCallback(() => getAccessToken(), []);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchReports = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetch(`${API}/api/consultations/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      setReports(data.reports || []);
    } finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' });
  }, [streamedContent]);

  const handleGenerate = async () => {
    if (!form.main_concern.trim()) return;
    setStreaming(true);
    setStreamedContent('');
    setShowForm(false);
    setSelectedReport(null);

    const token = await getToken();
    if (!token) { setStreaming(false); return; }

    try {
      const res = await fetch(`${API}/api/consultations/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, language: lang }),
      });
      if (!res.ok) throw new Error('Failed to generate');
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'chunk') setStreamedContent(prev => prev + event.content);
            if (event.type === 'done') await fetchReports();
          } catch {}
        }
      }
    } catch (e) {
      setStreamedContent('An error occurred generating the report. Please try again.');
    } finally { setStreaming(false); }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this report?')) return;
    const token = await getToken();
    if (!token) return;
    await fetch(`${API}/api/consultations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setReports(prev => prev.filter(r => r.id !== id));
    if (selectedReport?.id === id) setSelectedReport(null);
  };

  const activeContent = selectedReport?.report_content || streamedContent;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 80px' }} className="animate-fade-in">
      <div style={{ maxWidth: 920, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Consultation Report</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>AI-generated summaries to share with your doctor</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {activeContent && (
              <button onClick={() => window.print()} className="btn btn-secondary">🖨️ Print</button>
            )}
            <button onClick={() => { setShowForm(s => !s); setSelectedReport(null); setStreamedContent(''); }} className="btn btn-primary">
              {showForm ? '✕ Cancel' : '+ New report'}
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card animate-slide-up" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Tell us about your appointment</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">What is your main concern? *</label>
                <textarea className="input" rows={3} value={form.main_concern}
                  onChange={e => setForm(f => ({ ...f, main_concern: e.target.value }))}
                  placeholder="Describe what you want to discuss. e.g. 'I've had recurring chest pain for 2 weeks, worse when climbing stairs.'"
                  style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label className="label">Appointment type</label>
                <select className="input" value={form.appointment_type}
                  onChange={e => setForm(f => ({ ...f, appointment_type: e.target.value }))}>
                  {APPOINTMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Doctor / Clinic (optional)</label>
                  <input className="input" value={form.doctor_name}
                    onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} placeholder="e.g. Dr. Smith" />
                </div>
                <div>
                  <label className="label">Appointment date (optional)</label>
                  <input className="input" type="date" value={form.appointment_date}
                    onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleGenerate} disabled={streaming || !form.main_concern.trim()} className="btn btn-primary">
                  ✨ Generate report
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: reports.length > 0 ? '230px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>

          {/* Report list sidebar */}
          {reports.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: 4, marginBottom: 4 }}>
                Saved reports ({reports.length})
              </div>
              {reports.map(r => (
                <div key={r.id} onClick={() => { setSelectedReport(r); setStreamedContent(''); }}
                  style={{
                    padding: '12px 14px', borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: '1px solid',
                    background: selectedReport?.id === r.id ? 'var(--brand-light)' : 'var(--bg-card)',
                    borderColor: selectedReport?.id === r.id ? 'var(--brand)' : 'var(--border)',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: selectedReport?.id === r.id ? 'var(--brand)' : 'var(--text-primary)', marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.main_concern || 'Consultation report'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.appointment_type}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <button onClick={e => handleDelete(e, r.id)} className="btn-ghost btn-icon-sm"
                    style={{ marginTop: 6, color: 'var(--danger)', opacity: 0.7, padding: '2px 6px', fontSize: 11 }}>
                    🗑 Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Report content */}
          <div>
            {(activeContent || streaming) ? (
              <div className="card" id="report-print" style={{ padding: 32 }} ref={contentRef}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg, #6470f3 0%, #9b6ff5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>MediGuard Pre-Consultation Report</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                      {selectedReport?.appointment_type || form.appointment_type} · {new Date(selectedReport?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="prose-medical">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeContent}</ReactMarkdown>
                </div>
                {streaming && <span className="cursor-blink" style={{ display: 'inline-block', width: 2, height: 16, background: 'var(--brand)', marginLeft: 2, borderRadius: 1, verticalAlign: 'middle' }} />}
                {!streaming && activeContent && (
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                    This report is for informational purposes only and does not replace professional medical advice.
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: '48px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>📋</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Generate a consultation report</h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.7 }}>
                  Tell us what you want to discuss with your doctor. MediGuard pulls your health data to create a structured, printable summary.
                </p>
                <button onClick={() => setShowForm(true)} className="btn btn-primary btn-lg">✨ Create report</button>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
                  {['Your symptoms', 'Medication history', 'Questions to ask'].map(f => (
                    <div key={f} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #report-print { display: block !important; position: fixed; inset: 0; background: white; color: black; z-index: 9999; padding: 40px; }
        }
      `}</style>
    </div>
  );
}
