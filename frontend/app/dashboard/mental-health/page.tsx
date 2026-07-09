'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const MOODS = [
  { score: 1, emoji: '😢', label: 'Terrible' },
  { score: 2, emoji: '😞', label: 'Bad' },
  { score: 3, emoji: '😕', label: 'Poor' },
  { score: 4, emoji: '😐', label: 'Okay' },
  { score: 5, emoji: '🙂', label: 'Good' },
  { score: 6, emoji: '😊', label: 'Great' },
  { score: 7, emoji: '🤩', label: 'Amazing' },
];

const BREATHING_PHASES = [
  { label: 'Inhale',    duration: 4, color: '#6470f3', instruction: 'Breathe in slowly through your nose' },
  { label: 'Hold',      duration: 7, color: '#8b5cf6', instruction: 'Hold your breath gently' },
  { label: 'Exhale',    duration: 8, color: '#10b981', instruction: 'Breathe out slowly through your mouth' },
];

const JOURNAL_PROMPTS = [
  "What are three things you're grateful for today?",
  "How is your body feeling right now?",
  "What's one thing that made you smile recently?",
  "What emotion is most present for you today?",
  "What do you need most right now?",
  "What's something you're looking forward to?",
];

function BreathingExercise() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(BREATHING_PHASES[0].duration);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setPhase(0);
    setCount(BREATHING_PHASES[0].duration);
  };

  const start = () => {
    setRunning(true);
    setPhase(0);
    setCount(BREATHING_PHASES[0].duration);
    setCycles(0);
  };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          setPhase(p => {
            const next = (p + 1) % BREATHING_PHASES.length;
            if (next === 0) setCycles(c => c + 1);
            setCount(BREATHING_PHASES[next].duration);
            return next;
          });
          return BREATHING_PHASES[0].duration;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const current = BREATHING_PHASES[phase];
  const progress = (current.duration - count) / current.duration;
  const size = 160;
  const r = 60;
  const circ = 2 * Math.PI * r;

  return (
    <div className="card" style={{ padding: 28, textAlign: 'center' }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>4-7-8 Breathing Exercise</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        A calming technique to reduce stress and anxiety
      </p>

      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto 20px' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={8} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={running ? current.color : 'var(--border)'}
            strokeWidth={8} strokeDasharray={circ}
            strokeDashoffset={circ - progress * circ}
            strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {running ? (
            <>
              <div style={{ fontSize: 32, fontWeight: 800, color: current.color, lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: current.color, marginTop: 4 }}>{current.label}</div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Ready</div>
          )}
        </div>
      </div>

      {running && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, minHeight: 20 }}>
          {current.instruction}
        </p>
      )}
      {cycles > 0 && (
        <p style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginBottom: 12 }}>
          🎉 {cycles} cycle{cycles > 1 ? 's' : ''} completed
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {!running ? (
          <button onClick={start} className="btn btn-primary">Start breathing</button>
        ) : (
          <button onClick={stop} className="btn btn-secondary">Stop</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20, padding: '16px 0 0', borderTop: '1px solid var(--border)', justifyContent: 'center' }}>
        {BREATHING_PHASES.map(p => (
          <div key={p.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.label}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.duration}s</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MentalHealthPage() {
  const [moodEntries, setMoodEntries] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [savingMood, setSavingMood] = useState(false);
  const [journalText, setJournalText] = useState('');
  const [savingJournal, setSavingJournal] = useState(false);
  const [activeTab, setActiveTab] = useState<'mood' | 'journal' | 'breathing' | 'crisis'>('mood');
  const [promptIdx] = useState(() => Math.floor(Math.random() * JOURNAL_PROMPTS.length));
  const getToken = useCallback(() => getAccessToken(), []);

  const fetchData = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    setLoading(true);
    try {
      const [moodRes, journalRes] = await Promise.allSettled([
        fetch(`${API}/api/mental-health/mood?limit=14`, { headers: h }).then(r => r.json()),
        fetch(`${API}/api/mental-health/journal?limit=10`, { headers: h }).then(r => r.json()),
      ]);
      if (moodRes.status === 'fulfilled') setMoodEntries(moodRes.value?.entries || []);
      if (journalRes.status === 'fulfilled') setJournalEntries(journalRes.value?.entries || []);
    } finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogMood = async () => {
    if (!selectedMood) return;
    setSavingMood(true);
    const token = await getToken();
    if (!token) { setSavingMood(false); return; }
    await fetch(`${API}/api/mental-health/mood`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood_score: selectedMood, notes: moodNote }),
    });
    setSelectedMood(null);
    setMoodNote('');
    await fetchData();
    setSavingMood(false);
  };

  const handleSaveJournal = async () => {
    if (!journalText.trim()) return;
    setSavingJournal(true);
    const token = await getToken();
    if (!token) { setSavingJournal(false); return; }
    await fetch(`${API}/api/mental-health/journal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: journalText, date: new Date().toISOString().split('T')[0] }),
    });
    setJournalText('');
    await fetchData();
    setSavingJournal(false);
  };

  const avgMood = moodEntries.length ? (moodEntries.reduce((a, e) => a + e.mood_score, 0) / moodEntries.length).toFixed(1) : null;
  const latestMood = moodEntries[0];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 80px' }} className="animate-fade-in">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Mental Health</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Check in, reflect, and find calm</p>
        </div>

        {/* Quick stats */}
        {!loading && moodEntries.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>
                {latestMood ? MOODS[latestMood.mood_score - 1]?.emoji : '—'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Today's mood</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{latestMood ? MOODS[latestMood.mood_score - 1]?.label : 'Not logged'}</div>
            </div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--brand)', letterSpacing: '-0.02em', marginBottom: 4 }}>{avgMood || '—'}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Avg mood</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last {moodEntries.length} entries</div>
            </div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981', letterSpacing: '-0.02em', marginBottom: 4 }}>{journalEntries.length}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Journal entries</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total written</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-hover)', padding: 4, borderRadius: 'var(--radius-lg)', width: 'fit-content', flexWrap: 'wrap' }}>
          {([
            { key: 'mood',      label: '😊 Mood' },
            { key: 'journal',   label: '📓 Journal' },
            { key: 'breathing', label: '🌬 Breathing' },
            { key: 'crisis',    label: '🆘 Crisis help' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
                color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mood tab */}
        {activeTab === 'mood' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>How are you feeling right now?</h3>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
                {MOODS.map(m => (
                  <button key={m.score} onClick={() => setSelectedMood(m.score)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '10px 14px', borderRadius: 12, cursor: 'pointer', border: '2px solid',
                      borderColor: selectedMood === m.score ? 'var(--brand)' : 'var(--border)',
                      background: selectedMood === m.score ? 'var(--brand-light)' : 'var(--bg-hover)',
                      transition: 'all 0.15s',
                      transform: selectedMood === m.score ? 'scale(1.1)' : 'scale(1)',
                    }}>
                    <span style={{ fontSize: 28 }}>{m.emoji}</span>
                    <span style={{ fontSize: 11, color: selectedMood === m.score ? 'var(--brand)' : 'var(--text-muted)', fontWeight: 500 }}>{m.label}</span>
                  </button>
                ))}
              </div>
              {selectedMood && (
                <div className="animate-slide-up">
                  <textarea className="input" rows={2} value={moodNote} onChange={e => setMoodNote(e.target.value)}
                    placeholder="What's on your mind? (optional)"
                    style={{ resize: 'none', marginBottom: 12 }} />
                  <button onClick={handleLogMood} disabled={savingMood} className="btn btn-primary" style={{ width: '100%' }}>
                    {savingMood ? 'Saving…' : `Log mood: ${MOODS[selectedMood - 1].emoji} ${MOODS[selectedMood - 1].label}`}
                  </button>
                </div>
              )}
            </div>

            {/* Mood history */}
            {moodEntries.length > 0 && (
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Recent mood history</h3>
                {/* Mini bar chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60, marginBottom: 16 }}>
                  {[...moodEntries].reverse().slice(-14).map((e, i) => {
                    const h = (e.mood_score / 7) * 56;
                    const color = e.mood_score >= 6 ? 'var(--success)' : e.mood_score >= 4 ? 'var(--brand)' : e.mood_score >= 2 ? 'var(--warning)' : 'var(--danger)';
                    return (
                      <div key={i} title={`${MOODS[e.mood_score-1]?.label}: ${e.mood_score}/7`}
                        style={{ flex: 1, height: h, background: color, borderRadius: '3px 3px 0 0', opacity: 0.85, minWidth: 6 }} />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {moodEntries.slice(0, 5).map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{MOODS[e.mood_score - 1]?.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{MOODS[e.mood_score - 1]?.label}</div>
                        {e.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.notes}</div>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Journal tab */}
        {activeTab === 'journal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>💡 Today's prompt:</span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--brand)', marginBottom: 16, fontStyle: 'italic' }}>
                "{JOURNAL_PROMPTS[promptIdx]}"
              </p>
              <textarea className="input" rows={6} value={journalText} onChange={e => setJournalText(e.target.value)}
                placeholder="Start writing here… Your entries are private and only visible to you."
                style={{ resize: 'vertical', marginBottom: 12 }} />
              <button onClick={handleSaveJournal} disabled={savingJournal || !journalText.trim()} className="btn btn-primary">
                {savingJournal ? 'Saving…' : 'Save entry'}
              </button>
            </div>

            {journalEntries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>Previous entries</h3>
                {journalEntries.map((entry, i) => (
                  <div key={i} className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {new Date(entry.date || entry.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Breathing tab */}
        {activeTab === 'breathing' && <BreathingExercise />}

        {/* Crisis tab */}
        {activeTab === 'crisis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)', marginBottom: 6 }}>🆘 If you're in immediate danger</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>Please call emergency services immediately.</div>
              <a href="tel:911" className="btn" style={{ background: 'var(--danger)', color: '#fff', border: 'none', width: '100%', justifyContent: 'center' }}>
                📞 Call 911 (Emergency)
              </a>
            </div>

            {[
              { name: '988 Suicide & Crisis Lifeline', desc: 'Free 24/7 crisis support via phone or chat', phone: '988', chat: 'https://988lifeline.org/chat', color: '#6470f3' },
              { name: 'Crisis Text Line', desc: 'Text HOME to 741741 to reach a crisis counselor', phone: '741741', label: 'Text HOME', isText: true, color: '#10b981' },
              { name: 'SAMHSA Helpline', desc: 'Mental health & substance use treatment referrals', phone: '1-800-662-4357', color: '#f59e0b' },
              { name: 'International Association for Suicide Prevention', desc: 'Find crisis centers worldwide', chat: 'https://www.iasp.info/resources/Crisis_Centres/', color: '#8b5cf6' },
            ].map(resource => (
              <div key={resource.name} className="card" style={{ padding: '16px 18px', borderLeft: `4px solid ${resource.color}` }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{resource.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{resource.desc}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {resource.phone && (
                    <a href={resource.isText ? undefined : `tel:${resource.phone}`} className="btn btn-secondary btn-sm">
                      📞 {resource.isText ? `Text ${resource.phone}` : resource.phone}
                    </a>
                  )}
                  {resource.chat && (
                    <a href={resource.chat} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: `${resource.color}18`, color: resource.color, border: `1px solid ${resource.color}40` }}>
                      💬 {resource.chat.includes('988') ? 'Online chat' : 'Website'}
                    </a>
                  )}
                </div>
              </div>
            ))}

            <div className="card" style={{ padding: '16px 18px', background: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--info)', marginBottom: 4 }}>💙 Remember</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                You are not alone. Reaching out is a sign of strength. Mental health professionals are trained to help — there's no judgment, only support.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
