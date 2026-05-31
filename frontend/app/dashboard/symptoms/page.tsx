'use client';
import { useEffect, useState, useCallback } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const BODY_AREAS = ['Head','Chest','Abdomen','Back','Arms','Legs','Throat','Skin','General'];
const COMMON_SYMPTOMS = ['Headache','Nausea','Fatigue','Fever','Cough','Shortness of breath','Chest pain','Dizziness','Joint pain','Stomach ache','Sore throat','Back pain','Rash','Anxiety','Insomnia'];

function SeveritySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const labels = ['','Minimal','Mild','Moderate','Significant','Severe','Very Severe','Extreme'];
  const colors = ['','var(--success)','var(--success)','#84cc16','var(--warning)','#f97316','var(--danger)','#9b1c1c'];
  return (
    <div>
      <input type="range" min={1} max={7} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: colors[value] }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>1 Minimal</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors[value] }}>{labels[value]}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>7 Extreme</span>
      </div>
    </div>
  );
}

function MiniBarChart({ entries }: { entries: any[] }) {
  if (!entries.length) return null;
  const max = Math.max(...entries.map(e => e.severity));
  const last = entries.slice(-14);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
      {last.map((entry, i) => {
        const h = (entry.severity / max) * 44;
        const color = entry.severity >= 6 ? 'var(--danger)' : entry.severity >= 4 ? 'var(--warning)' : 'var(--success)';
        return (
          <div key={i} title={`${entry.symptom}: ${entry.severity}/7`}
            style={{ flex: 1, height: h, background: color, borderRadius: '3px 3px 0 0', opacity: 0.85, transition: 'height 0.4s ease', minWidth: 4 }} />
        );
      })}
    </div>
  );
}

export default function SymptomsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const getToken = useCallback(() => getAccessToken(), []);

  const [form, setForm] = useState({
    symptom: '', severity: 4, body_area: '', notes: '',
    onset_time: new Date().toISOString().slice(0, 16),
  });

  const fetchData = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    setLoading(true);
    try {
      const [entriesRes, statsRes] = await Promise.allSettled([
        fetch(`${API}/api/symptoms/logs?days=60`, { headers: h }).then(r => r.json()),
        fetch(`${API}/api/symptoms/stats?days=30`, { headers: h }).then(r => r.json()),
      ]);
      if (entriesRes.status === 'fulfilled') setEntries(entriesRes.value?.logs || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value?.stats || statsRes.value);
    } finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLog = async () => {
    if (!form.symptom) return;
    setSaving(true);
    const token = await getToken();
    if (!token) { setSaving(false); return; }
    await fetch(`${API}/api/symptoms/log`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptom: form.symptom,
        severity: form.severity,
        body_location: form.body_area,
        notes: form.notes,
        logged_at: form.onset_time ? new Date(form.onset_time).toISOString() : new Date().toISOString(),
      }),
    });
    await fetchData();
    setForm({ symptom: '', severity: 4, body_area: '', notes: '', onset_time: new Date().toISOString().slice(0, 16) });
    setShowLog(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    if (!token) return;
    await fetch(`${API}/api/symptoms/log/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const severityColor = (s: number) => s >= 6 ? 'var(--danger)' : s >= 4 ? 'var(--warning)' : s >= 2 ? '#84cc16' : 'var(--success)';
  const severityLabel = (s: number) => ['','Minimal','Mild','Moderate','Significant','Severe','Very Severe','Extreme'][s] || s;

  const grouped = entries.reduce((acc: Record<string, any[]>, e) => {
    const d = new Date(e.logged_at || e.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 80px' }} className="animate-fade-in">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Symptoms</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Track and monitor how you're feeling</p>
          </div>
          <button onClick={() => setShowLog(s => !s)} className="btn btn-primary">
            {showLog ? '✕ Cancel' : '+ Log symptom'}
          </button>
        </div>

        {/* Log form (inline expandable) */}
        {showLog && (
          <div className="card animate-slide-up" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>Log a symptom</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">What symptom are you experiencing? *</label>
                <input className="input" value={form.symptom} onChange={e => setForm(f => ({...f, symptom: e.target.value}))} placeholder="Describe your symptom" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {COMMON_SYMPTOMS.map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({...f, symptom: s}))}
                      style={{
                        padding: '4px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', border: '1px solid',
                        background: form.symptom === s ? 'var(--brand-light)' : 'var(--bg-hover)',
                        color: form.symptom === s ? 'var(--brand)' : 'var(--text-muted)',
                        borderColor: form.symptom === s ? 'var(--brand)' : 'var(--border)',
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Severity: {severityLabel(form.severity)}</label>
                <SeveritySlider value={form.severity} onChange={v => setForm(f => ({...f, severity: v}))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="label">Body area</label>
                  <select className="input" value={form.body_area} onChange={e => setForm(f => ({...f, body_area: e.target.value}))}>
                    <option value="">— Select area —</option>
                    {BODY_AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">When did it start?</label>
                  <input className="input" type="datetime-local" value={form.onset_time} onChange={e => setForm(f => ({...f, onset_time: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Any additional details…" style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowLog(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleLog} disabled={saving || !form.symptom} className="btn btn-primary">
                  {saving ? 'Saving…' : 'Log symptom'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats cards */}
        {stats && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Logged (30d)', value: stats.total_entries || 0, icon: '📊', color: '#6470f3' },
              { label: 'Avg severity', value: stats.avg_severity ? `${stats.avg_severity.toFixed(1)}/7` : '—', icon: '📈', color: '#f59e0b' },
              { label: 'Most common', value: stats.most_common || '—', icon: '🔁', color: '#0ea5e9' },
              { label: 'High severity', value: stats.high_severity_count || 0, icon: '⚠️', color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Mini chart */}
        {entries.length > 1 && (
          <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Last 14 entries</div>
            <MiniBarChart entries={[...entries].reverse()} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Older</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Recent</span>
            </div>
          </div>
        )}

        {/* History */}
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14 }}>History</h2>

        {loading ? (
          [1,2,3].map(i => <div key={i} className="card skeleton" style={{ height: 72, marginBottom: 10 }} />)
        ) : entries.length === 0 ? (
          <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No symptoms logged yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>Start tracking to detect patterns and get better insights.</div>
            <button onClick={() => setShowLog(true)} className="btn btn-primary">Log your first symptom</button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dayEntries]) => (
            <div key={date} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, paddingLeft: 4 }}>
                {date}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(dayEntries as any[]).map((entry: any) => (
                  <div key={entry.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: `${severityColor(entry.severity)}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, color: severityColor(entry.severity),
                    }}>
                      {entry.severity}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{entry.symptom}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: severityColor(entry.severity), fontWeight: 500 }}>{severityLabel(entry.severity)}</span>
                        {entry.body_area && <span>· {entry.body_area}</span>}
                        {entry.notes && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>· {entry.notes}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(entry.id)} className="btn-ghost btn-icon-sm" style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
