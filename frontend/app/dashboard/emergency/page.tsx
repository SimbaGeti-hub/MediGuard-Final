'use client';
import { useState } from 'react';
import Link from 'next/link';

const EMERGENCIES = [
  {
    id: 'cardiac',
    title: 'Cardiac Arrest',
    icon: '❤️',
    color: '#ef4444',
    signs: ['No pulse', 'Not breathing', 'Unconscious', 'Sudden collapse'],
    steps: [
      'Call 911 immediately',
      'Start CPR: 30 chest compressions, push hard and fast',
      'Give 2 rescue breaths after every 30 compressions',
      'Use an AED (defibrillator) as soon as one is available',
      'Continue until help arrives or the person revives',
    ],
  },
  {
    id: 'stroke',
    title: 'Stroke',
    icon: '🧠',
    color: '#8b5cf6',
    signs: ['Face drooping', 'Arm weakness', 'Speech difficulty', 'Sudden severe headache'],
    steps: [
      'Remember FAST: Face, Arms, Speech, Time',
      'Call 911 immediately — every minute matters',
      'Note the time symptoms started',
      'Do NOT give food, water, or medication',
      'Keep the person calm and still',
    ],
  },
  {
    id: 'choking',
    title: 'Choking',
    icon: '🫁',
    color: '#f97316',
    signs: ['Cannot speak or cry', 'Turning blue', 'Clutching throat', 'Weak cough'],
    steps: [
      'Ask "Are you choking?" — if yes, act immediately',
      'Stand behind the person, lean them slightly forward',
      'Give 5 firm back blows between shoulder blades',
      'Give 5 abdominal thrusts (Heimlich maneuver)',
      'Alternate back blows and thrusts until object clears',
      'If unconscious, start CPR and call 911',
    ],
  },
  {
    id: 'allergic',
    title: 'Severe Allergic Reaction',
    icon: '⚠️',
    color: '#f59e0b',
    signs: ['Throat swelling', 'Difficulty breathing', 'Hives/rash', 'Rapid pulse', 'Dizziness'],
    steps: [
      'Call 911 immediately',
      'Use epinephrine auto-injector (EpiPen) if available',
      'Have the person lie flat with legs elevated',
      'If they have an EpiPen, inject into outer thigh',
      'Be ready to give a second dose after 5-10 minutes',
      'Stay with the person until help arrives',
    ],
  },
  {
    id: 'bleeding',
    title: 'Severe Bleeding',
    icon: '🩸',
    color: '#dc2626',
    signs: ['Heavy blood loss', 'Wound won\'t stop bleeding', 'Pale/clammy skin', 'Dizziness'],
    steps: [
      'Call 911 if bleeding is severe or won\'t stop',
      'Apply firm, direct pressure with a clean cloth',
      'Do NOT remove the cloth — add more on top if needed',
      'Elevate the injured area above heart level if possible',
      'If on a limb, consider a tourniquet above the wound',
      'Keep the person warm and calm',
    ],
  },
  {
    id: 'seizure',
    title: 'Seizure',
    icon: '⚡',
    color: '#6470f3',
    signs: ['Convulsions', 'Loss of consciousness', 'Uncontrolled movements', 'Confusion'],
    steps: [
      'Stay calm and time the seizure',
      'Clear the area of anything dangerous',
      'Gently cushion the person\'s head',
      'Turn them on their side (recovery position)',
      'Do NOT hold them down or put anything in their mouth',
      'Call 911 if it lasts over 5 minutes or they don\'t wake up',
    ],
  },
];

export default function EmergencyPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const [hospitalUrl, setHospitalUrl] = useState<string | null>(null);

  const findHospital = () => {
    setHospitalLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setHospitalUrl(`https://www.google.com/maps/search/emergency+room+hospital/@${latitude},${longitude},14z`);
        setHospitalLoading(false);
      },
      () => {
        setHospitalUrl('https://www.google.com/maps/search/emergency+room+hospital');
        setHospitalLoading(false);
      }
    );
  };

  const selectedEmergency = EMERGENCIES.find(e => e.id === selected);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 80px' }} className="animate-fade-in">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* SOS Header */}
        <div style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          borderRadius: 'var(--radius-xl)', padding: '24px 28px', marginBottom: 24, color: '#fff',
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            🚨 Emergency Guide
          </h1>
          <p style={{ fontSize: 14, opacity: 0.9, margin: '0 0 20px' }}>
            For life-threatening emergencies, call 911 immediately.
            Use this guide only when it is safe to do so.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="tel:911" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#fff', color: '#ef4444', fontWeight: 800, fontSize: 16,
              padding: '12px 24px', borderRadius: 12, textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }} className="emergency-pulse">
              📞 Call 911
            </a>
            <button onClick={findHospital} disabled={hospitalLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, fontSize: 14,
                padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer',
              }}>
              🏥 {hospitalLoading ? 'Locating…' : 'Nearest Hospital'}
            </button>
            {hospitalUrl && (
              <a href={hospitalUrl} target="_blank" rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: 14,
                  padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none',
                }}>
                📍 Open Maps
              </a>
            )}
          </div>
        </div>

        {/* Emergency cards */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)' }}>
          First Aid Guides
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
          {EMERGENCIES.map(em => (
            <button key={em.id} onClick={() => setSelected(selected === em.id ? null : em.id)}
              style={{
                background: selected === em.id ? `${em.color}15` : 'var(--bg-card)',
                border: `1px solid ${selected === em.id ? em.color : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', padding: '16px 18px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
                boxShadow: selected === em.id ? `0 0 0 1px ${em.color}` : 'var(--shadow)',
              }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{em.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: selected === em.id ? em.color : 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {em.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {em.signs.slice(0, 2).join(' · ')}
              </div>
            </button>
          ))}
        </div>

        {/* Expanded guide */}
        {selectedEmergency && (
          <div className="card animate-slide-up" style={{ padding: 24, borderLeft: `4px solid ${selectedEmergency.color}`, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 32 }}>{selectedEmergency.icon}</span>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: selectedEmergency.color, margin: 0, letterSpacing: '-0.02em' }}>
                  {selectedEmergency.title}
                </h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>First aid guide</div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Warning signs
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedEmergency.signs.map(sign => (
                  <span key={sign} style={{
                    padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                    background: `${selectedEmergency.color}15`, color: selectedEmergency.color,
                    border: `1px solid ${selectedEmergency.color}30`,
                  }}>{sign}</span>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Steps to take
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedEmergency.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: selectedEmergency.color, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5, paddingTop: 3 }}>{step}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <a href="tel:911" className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
                📞 Call 911
              </a>
              <Link href="/dashboard/chat" className="btn btn-secondary">
                💬 Ask AI assistant
              </Link>
            </div>
          </div>
        )}

        {/* Additional resources */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>📋 Other emergency contacts</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {[
              { label: 'Poison Control',       number: '1-800-222-1222', icon: '☠️' },
              { label: 'Crisis Line (988)',     number: '988',            icon: '🆘' },
              { label: 'Non-emergency Police', number: '311',            icon: '🚔' },
              { label: 'Disaster Distress',    number: '1-800-985-5990', icon: '🌪️' },
            ].map(c => (
              <a key={c.label} href={`tel:${c.number}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-hover)', textDecoration: 'none', transition: 'background 0.15s' }}>
                <span style={{ fontSize: 20 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700 }}>{c.number}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
