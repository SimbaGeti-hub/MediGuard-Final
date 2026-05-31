'use client';
import { useEffect, useState, useCallback } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const CONDITIONS = ['Diabetes','Hypertension','Asthma','Heart disease','Arthritis','Depression','Anxiety','Thyroid disorder','Kidney disease','Epilepsy'];

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', gender: '',
    blood_type: '', height_cm: '', weight_kg: '',
    conditions: [] as string[], allergies: [] as string[],
    emergency_contact_name: '', emergency_contact_phone: '',
    custom_condition: '', custom_allergy: '',
  });
  const getToken = useCallback(() => getAccessToken(), []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      setLoading(true);
      try {
        const data = await fetch(`${API}/api/profile/`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
        setProfile(data);
        setForm(f => ({
          ...f,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          blood_type: data.blood_type || '',
          height_cm: data.height_cm?.toString() || '',
          weight_kg: data.weight_kg?.toString() || '',
          conditions: data.medical_conditions || [],
          allergies: data.allergies || [],
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
        }));
      } finally { setLoading(false); }
    })();
  }, [getToken]);

  const handleSave = async () => {
    setSaving(true);
    const token = await getToken();
    if (!token) { setSaving(false); return; }
    await fetch(`${API}/api/profile/`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: form.first_name, last_name: form.last_name,
        date_of_birth: form.date_of_birth, gender: form.gender,
        blood_type: form.blood_type,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        medical_conditions: form.conditions, allergies: form.allergies,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  const toggleItem = (field: 'conditions' | 'allergies', val: string) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter((v: string) => v !== val) : [...f[field], val],
    }));
  };

  const addCustom = (field: 'conditions' | 'allergies', inputField: 'custom_condition' | 'custom_allergy') => {
    const val = form[inputField].trim();
    if (!val) return;
    if (!form[field].includes(val)) setForm(f => ({ ...f, [field]: [...f[field], val], [inputField]: '' }));
    else setForm(f => ({ ...f, [inputField]: '' }));
  };

  const Section = ({ title, icon, children }: any) => (
    <div className="card" style={{ padding: 24, marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );

  if (loading) return (
    <div style={{ flex: 1, padding: '24px 28px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14, marginBottom: 16 }} />)}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 80px' }} className="animate-fade-in">
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Health Profile</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Your information helps the AI give better guidance</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {/* Avatar / name summary */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--brand) 0%, #9b6ff5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {(form.first_name[0] || '?').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {form.first_name || form.last_name ? `${form.first_name} ${form.last_name}`.trim() : 'Your name'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {form.blood_type && <span className="badge badge-danger" style={{ marginRight: 6 }}>{form.blood_type}</span>}
              {form.date_of_birth && <span style={{ fontSize: 13 }}>Born {new Date(form.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
            </div>
          </div>
        </div>

        <Section title="Personal Information" icon="👤">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label className="label">First name</label><input className="input" value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} placeholder="First name" /></div>
            <div><label className="label">Last name</label><input className="input" value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} placeholder="Last name" /></div>
            <div><label className="label">Date of birth</label><input className="input" type="date" value={form.date_of_birth} onChange={e => setForm(f => ({...f, date_of_birth: e.target.value}))} /></div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={e => setForm(f => ({...f, gender: e.target.value}))}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="nonbinary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </Section>

        <Section title="Physical Stats" icon="📏">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div>
              <label className="label">Blood type</label>
              <select className="input" value={form.blood_type} onChange={e => setForm(f => ({...f, blood_type: e.target.value}))}>
                <option value="">Unknown</option>
                {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Height (cm)</label><input className="input" type="number" value={form.height_cm} onChange={e => setForm(f => ({...f, height_cm: e.target.value}))} placeholder="e.g. 175" /></div>
            <div><label className="label">Weight (kg)</label><input className="input" type="number" value={form.weight_kg} onChange={e => setForm(f => ({...f, weight_kg: e.target.value}))} placeholder="e.g. 70" /></div>
          </div>
        </Section>

        <Section title="Medical Conditions" icon="🏥">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {CONDITIONS.map(c => (
              <button key={c} type="button" onClick={() => toggleItem('conditions', c)}
                style={{
                  padding: '5px 14px', borderRadius: 99, fontSize: 13, cursor: 'pointer', border: '1px solid',
                  background: form.conditions.includes(c) ? 'var(--brand-light)' : 'var(--bg-hover)',
                  color: form.conditions.includes(c) ? 'var(--brand)' : 'var(--text-muted)',
                  borderColor: form.conditions.includes(c) ? 'var(--brand)' : 'var(--border)',
                }}>
                {form.conditions.includes(c) ? '✓ ' : ''}{c}
              </button>
            ))}
          </div>
          {form.conditions.filter(c => !CONDITIONS.includes(c)).map(c => (
            <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, fontSize: 12, background: 'var(--brand-light)', color: 'var(--brand)', border: '1px solid var(--brand)', marginRight: 6, marginBottom: 6 }}>
              {c}
              <button onClick={() => toggleItem('conditions', c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
            </span>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input className="input" value={form.custom_condition} onChange={e => setForm(f => ({...f, custom_condition: e.target.value}))}
              placeholder="Add other condition…"
              onKeyDown={e => e.key === 'Enter' && addCustom('conditions', 'custom_condition')}
              style={{ flex: 1 }} />
            <button onClick={() => addCustom('conditions', 'custom_condition')} className="btn btn-secondary">Add</button>
          </div>
        </Section>

        <Section title="Allergies" icon="⚠️">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {form.allergies.map(a => (
              <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, fontSize: 12, background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)', cursor: 'pointer' }}
                onClick={() => toggleItem('allergies', a)}>
                {a} ×
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={form.custom_allergy} onChange={e => setForm(f => ({...f, custom_allergy: e.target.value}))}
              placeholder="e.g. Penicillin, Peanuts, Latex…"
              onKeyDown={e => e.key === 'Enter' && addCustom('allergies', 'custom_allergy')}
              style={{ flex: 1 }} />
            <button onClick={() => addCustom('allergies', 'custom_allergy')} className="btn btn-secondary">Add</button>
          </div>
        </Section>

        <Section title="Emergency Contact" icon="🆘">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label className="label">Contact name</label><input className="input" value={form.emergency_contact_name} onChange={e => setForm(f => ({...f, emergency_contact_name: e.target.value}))} placeholder="Full name" /></div>
            <div><label className="label">Phone number</label><input className="input" type="tel" value={form.emergency_contact_phone} onChange={e => setForm(f => ({...f, emergency_contact_phone: e.target.value}))} placeholder="+1 555 000 0000" /></div>
          </div>
        </Section>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-lg">
            {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save all changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
