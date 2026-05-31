'use client';
import { useEffect, useState, useCallback } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Weekly', 'As needed'];
const COLORS = ['#6470f3','#10b981','#f59e0b','#ef4444','#8b5cf6','#0ea5e9','#f97316','#ec4899'];
const TIME_SLOTS = [
  { label: 'Morning',   time: '08:00', icon: '🌅' },
  { label: 'Afternoon', time: '13:00', icon: '☀️' },
  { label: 'Evening',   time: '18:00', icon: '🌆' },
  { label: 'Night',     time: '22:00', icon: '🌙' },
];

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="card animate-scale-in" style={{ width: '100%', maxWidth: 480, padding: 24, position: 'relative', zIndex: 1, maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function AdherenceRing({ rate }: { rate: number }) {
  const r = 38, cx = 44, cy = 44, stroke = 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (rate / 100) * circ;
  const color = rate >= 80 ? 'var(--success)' : rate >= 60 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={88} height={88} viewBox="0 0 88 88">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x={cx} y={cy + 6} textAnchor="middle" style={{ fontSize: 16, fontWeight: 700, fill: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
          {rate}%
        </text>
      </svg>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Adherence rate</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Last 7 days</div>
        <div style={{ fontSize: 12, color, marginTop: 4, fontWeight: 600 }}>
          {rate >= 80 ? '✓ Great job!' : rate >= 60 ? '⚠ Could be better' : '✗ Needs improvement'}
        </div>
      </div>
    </div>
  );
}

export default function MedicationsPage() {
  const [meds, setMeds] = useState<any[]>([]);
  const [adherence, setAdherence] = useState<any>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [doseLogs, setDoseLogs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editMed, setEditMed] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'list' | 'interactions'>('schedule');
  const getToken = useCallback(() => getAccessToken(), []);

  const [form, setForm] = useState({
    name: '', dosage: '', frequency: 'Once daily', schedule_times: ['08:00'],
    instructions: '', start_date: new Date().toISOString().split('T')[0],
    end_date: '', color: COLORS[0], is_active: true,
  });

  const fetchAll = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    setLoading(true);
    try {
      const [medsRes, advRes, intRes] = await Promise.allSettled([
        fetch(`${API}/api/medications/`, { headers: h }).then(r => r.json()),
        fetch(`${API}/api/medications/adherence?days=7`, { headers: h }).then(r => r.json()),
        fetch(`${API}/api/medications/interactions`, { headers: h }).then(r => r.json()),
      ]);
      if (medsRes.status === 'fulfilled') setMeds(medsRes.value?.medications || []);
      if (advRes.status === 'fulfilled') setAdherence(advRes.value);
      if (intRes.status === 'fulfilled') setInteractions(intRes.value?.alerts || []);
    } finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => setForm({ name:'', dosage:'', frequency:'Once daily', schedule_times:['08:00'], instructions:'', start_date: new Date().toISOString().split('T')[0], end_date:'', color: COLORS[0], is_active: true });

  const openAdd = () => { resetForm(); setEditMed(null); setShowAdd(true); };
  const openEdit = (med: any) => {
    setEditMed(med);
    setForm({ name: med.name, dosage: med.dosage, frequency: med.frequency, schedule_times: med.schedule_times || ['08:00'], instructions: med.instructions || '', start_date: med.start_date || new Date().toISOString().split('T')[0], end_date: med.end_date || '', color: med.color || COLORS[0], is_active: med.is_active });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.dosage) return;
    setSaving(true);
    const token = await getToken();
    if (!token) { setSaving(false); return; }
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      if (editMed) {
        await fetch(`${API}/api/medications/${editMed.id}`, { method: 'PUT', headers: h, body: JSON.stringify(form) });
      } else {
        await fetch(`${API}/api/medications/`, { method: 'POST', headers: h, body: JSON.stringify(form) });
      }
      await fetchAll();
      setShowAdd(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this medication?')) return;
    const token = await getToken();
    if (!token) return;
    await fetch(`${API}/api/medications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await fetchAll();
  };

  const handleDoseLog = async (medId: string, taken: boolean, scheduledTime: string) => {
    const token = await getToken();
    if (!token) return;
    const key = `${medId}-${scheduledTime}`;
    setDoseLogs(p => ({ ...p, [key]: { taken, loading: false } }));
    await fetch(`${API}/api/medications/dose`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ taken, scheduled_time: scheduledTime, taken_at: new Date().toISOString() }),
    });
  };

  const activeMeds = meds.filter(m => m.is_active);

  const getMedsForSlot = (slotTime: string) =>
    activeMeds.filter(m => m.schedule_times?.some((t: string) => t === slotTime));

  const Skeleton = () => (
    <div className="card" style={{ padding: 16, marginBottom: 10 }}>
      {[80, 60, 40].map(w => <div key={w} className="skeleton" style={{ height: 14, width: `${w}%`, borderRadius: 6, marginBottom: 8 }} />)}
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 80px' }} className="animate-fade-in">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Medications</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{activeMeds.length} active medication{activeMeds.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openAdd} className="btn btn-primary" style={{ gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add medication
          </button>
        </div>

        {/* Adherence card */}
        {adherence && (
          <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <AdherenceRing rate={adherence.rate || 0} />
            {adherence.taken !== undefined && (
              <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>{adherence.taken}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Taken</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>{adherence.missed || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Missed</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)' }}>{adherence.total}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total doses</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interaction alerts */}
        {interactions.filter(a => a.severity === 'severe' || a.severity === 'major').length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {interactions.filter(a => a.severity === 'severe' || a.severity === 'major').map((alert, i) => (
              <div key={i} style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>
                    {alert.severity?.toUpperCase()} interaction: {alert.drug_a} + {alert.drug_b}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{alert.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-hover)', padding: 4, borderRadius: 'var(--radius-lg)', width: 'fit-content' }}>
          {(['schedule', 'list', 'interactions'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'interactions' && interactions.length > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--danger)', color: '#fff', borderRadius: 99, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>
                  {interactions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Schedule tab */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loading ? <><Skeleton /><Skeleton /></> :
             activeMeds.length === 0 ? (
              <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💊</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No medications yet</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>Add your medications to see your daily schedule.</div>
                <button onClick={openAdd} className="btn btn-primary">Add first medication</button>
              </div>
            ) : TIME_SLOTS.map(slot => {
              const slotMeds = getMedsForSlot(slot.time);
              if (slotMeds.length === 0) return null;
              return (
                <div key={slot.time} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-hover)' }}>
                    <span style={{ fontSize: 18 }}>{slot.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{slot.label}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>· {slot.time}</span>
                  </div>
                  {slotMeds.map(med => {
                    const key = `${med.id}-${slot.time}`;
                    const log = doseLogs[key];
                    return (
                      <div key={med.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: med.color || '#6470f3', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{med.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{med.dosage}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleDoseLog(med.id, true, slot.time)}
                            className="btn btn-sm"
                            style={{ background: log?.taken === true ? 'var(--success-bg)' : 'var(--bg-hover)', color: log?.taken === true ? 'var(--success)' : 'var(--text-secondary)', border: `1px solid ${log?.taken === true ? 'var(--success-border)' : 'var(--border)'}` }}>
                            ✓ Taken
                          </button>
                          <button onClick={() => handleDoseLog(med.id, false, slot.time)}
                            className="btn btn-sm"
                            style={{ background: log?.taken === false ? 'var(--danger-bg)' : 'var(--bg-hover)', color: log?.taken === false ? 'var(--danger)' : 'var(--text-secondary)', border: `1px solid ${log?.taken === false ? 'var(--danger-border)' : 'var(--border)'}` }}>
                            Skip
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* List tab */}
        {activeTab === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? <><Skeleton /><Skeleton /><Skeleton /></> :
             meds.length === 0 ? (
              <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💊</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No medications added</div>
                <button onClick={openAdd} className="btn btn-primary" style={{ marginTop: 8 }}>Add medication</button>
              </div>
            ) : meds.map(med => (
              <div key={med.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: med.color || '#6470f3', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{med.name}</span>
                    <span className={`badge ${med.is_active ? 'badge-success' : 'badge-muted'}`}>
                      {med.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                    {med.dosage} · {med.frequency}
                    {med.schedule_times?.length > 0 && ` · ${med.schedule_times.join(', ')}`}
                  </div>
                  {med.instructions && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{med.instructions}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(med)} className="btn btn-secondary btn-sm">Edit</button>
                  <button onClick={() => handleDelete(med.id)} className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Interactions tab */}
        {activeTab === 'interactions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {interactions.length === 0 ? (
              <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No interactions found</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Your medications appear to be safe to take together.</div>
              </div>
            ) : interactions.map((alert, i) => {
              const isSevere = alert.severity === 'severe' || alert.severity === 'major';
              return (
                <div key={i} className="card" style={{ padding: '16px 18px', borderLeft: `4px solid ${isSevere ? 'var(--danger)' : 'var(--warning)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{isSevere ? '🚨' : '⚠️'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{alert.drug_a} + {alert.drug_b}</span>
                        <span className={`badge ${isSevere ? 'badge-danger' : 'badge-warning'}`}>{alert.severity}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{alert.description}</div>
                      {alert.recommendation && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, padding: '6px 10px', background: 'var(--bg-hover)', borderRadius: 6 }}>
                          💡 {alert.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.02em' }}>
          {editMed ? 'Edit medication' : 'Add medication'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Medication name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Metformin" />
          </div>
          <div>
            <label className="label">Dosage *</label>
            <input className="input" value={form.dosage} onChange={e => setForm(f => ({...f, dosage: e.target.value}))} placeholder="e.g. 500mg" />
          </div>
          <div>
            <label className="label">Frequency</label>
            <select className="input" value={form.frequency} onChange={e => setForm(f => ({...f, frequency: e.target.value}))}>
              {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reminder times</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TIME_SLOTS.map(slot => {
                const active = form.schedule_times.includes(slot.time);
                return (
                  <button key={slot.time} type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      schedule_times: active ? f.schedule_times.filter(t => t !== slot.time) : [...f.schedule_times, slot.time]
                    }))}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1px solid',
                      background: active ? 'var(--brand-light)' : 'var(--bg-hover)',
                      color: active ? 'var(--brand)' : 'var(--text-secondary)',
                      borderColor: active ? 'var(--brand)' : 'var(--border)',
                    }}>
                    {slot.icon} {slot.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label">Instructions</label>
            <input className="input" value={form.instructions} onChange={e => setForm(f => ({...f, instructions: e.target.value}))} placeholder="e.g. Take with food" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Start date</label>
              <input className="input" type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} />
            </div>
            <div>
              <label className="label">End date (optional)</label>
              <input className="input" type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="label">Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({...f, color: c}))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', outline: form.color === c ? '2px solid var(--bg-card)' : 'none', outlineOffset: 1 }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label className="toggle">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({...f, is_active: e.target.checked}))} />
              <span className="toggle-track" />
              <span className="toggle-thumb" />
            </label>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Active medication</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name || !form.dosage} className="btn btn-primary">
            {saving ? 'Saving…' : editMed ? 'Save changes' : 'Add medication'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
