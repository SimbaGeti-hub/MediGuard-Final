'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getAccessToken } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/useTranslation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function StatCard({ icon, label, value, sub, color, bar }: {
  icon: string; label: string; value: string | number;
  sub?: string; color: string; bar?: string;
}) {
  return (
    <div className="card" style={{ padding: '20px 20px 18px', position: 'relative', overflow: 'hidden' }}>
      {/* Accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: color, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        opacity: 0.8,
      }} />
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 12, marginBottom: 14,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
        border: `1px solid ${color}20`,
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 800, color: 'var(--text-primary)',
        letterSpacing: '-0.04em', lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 5, fontWeight: 500 }}>
        {label}
      </div>
      {sub && (
        <div style={{
          fontSize: 11.5, color, marginTop: 4, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
          {sub}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '20px', overflow: 'hidden' }}>
      <div className="skeleton" style={{ width: '100%', height: 3, marginBottom: 14, borderRadius: 0 }} />
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12, marginBottom: 14 }} />
      <div className="skeleton" style={{ width: '55%', height: 26, marginBottom: 8, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: '80%', height: 14, borderRadius: 6 }} />
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();

  const QUICK_ACTIONS = [
    { labelKey: t('askAI'),         desc: t('askAIDesc'),          href: '/dashboard/chat',         icon: '💬', color: 'var(--brand)' },
    { labelKey: t('logSymptom'),    desc: t('logSymptomDesc'),     href: '/dashboard/symptoms',     icon: '📊', color: '#0ea5e9' },
    { labelKey: t('medications'),   desc: t('medicationsDesc'),    href: '/dashboard/medications',  icon: '💊', color: '#8b5cf6' },
    { labelKey: t('mentalHealth'),  desc: t('mentalHealthDesc'),   href: '/dashboard/mental-health',icon: '🧠', color: 'var(--accent)' },
    { labelKey: t('consultation'),  desc: t('consultationDesc'),   href: '/dashboard/consultation', icon: '📋', color: '#f59e0b' },
    { labelKey: t('emergency'),     desc: t('emergencyDesc'),      href: '/dashboard/emergency',    icon: '🚨', color: 'var(--danger)' },
  ];

  const [loading, setLoading] = useState(true);
  const [adherence, setAdherence] = useState<any>(null);
  const [meds, setMeds] = useState<any[]>([]);
  const [moodData, setMoodData] = useState<any[]>([]);
  const [symptomStats, setSymptomStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [greeting, setGreeting] = useState('');

  const getToken = useCallback(async () => getAccessToken(), []);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? t('goodMorning') : h < 18 ? t('goodAfternoon') : t('goodEvening'));
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          fetch(`${API}/api/medications/adherence?days=7`, { headers }).then(r => r.json()),
          fetch(`${API}/api/medications/`, { headers }).then(r => r.json()),
          fetch(`${API}/api/mental-health/mood?limit=7`, { headers }).then(r => r.json()),
          fetch(`${API}/api/symptoms/stats?days=7`, { headers }).then(r => r.json()),
          fetch(`${API}/api/medications/interactions`, { headers }).then(r => r.json()),
        ]);
        if (results[0].status === 'fulfilled') setAdherence(results[0].value);
        if (results[1].status === 'fulfilled') setMeds(results[1].value?.medications || []);
        if (results[2].status === 'fulfilled') setMoodData(results[2].value?.entries || []);
        if (results[3].status === 'fulfilled') setSymptomStats(results[3].value);
        if (results[4].status === 'fulfilled') setAlerts(results[4].value?.alerts || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [getToken]);

  const latestMood = moodData[0];
  const moodEmoji = latestMood
    ? ['😢','😞','😐','🙂','😊','😄','🤩'][Math.min(6, Math.max(0, Math.round(latestMood.mood_score) - 1))]
    : null;
  const todaysMeds = meds.filter(m => m.is_active);
  const criticalAlerts = alerts.filter(a => a.severity === 'severe');

  return (
    <div
      style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 80px' }}
      className="animate-fade-in"
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* ── Greeting ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 800, color: 'var(--text-primary)',
            letterSpacing: '-0.04em', margin: 0,
          }}>
            {greeting} 👋
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 5, fontWeight: 450 }}>
            {t('healthSummary')}
          </p>
        </div>

        {/* ── Alerts ─────────────────────────────────────────────────── */}
        {criticalAlerts.length > 0 && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1.5px solid var(--danger-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              ⚠️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)', letterSpacing: '-0.01em' }}>
                Drug interaction alert
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                {criticalAlerts[0].drug_a} and {criticalAlerts[0].drug_b} may interact severely.
                <Link href="/dashboard/medications" style={{ color: 'var(--danger)', marginLeft: 6, fontWeight: 600 }}>
                  Review →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12, marginBottom: 28,
        }} className="stagger">
          {loading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : (
            <>
              <StatCard
                icon="💊" label="Active medications" color="#8b5cf6"
                value={todaysMeds.length}
                sub={todaysMeds.length === 0 ? 'None added' : 'Being tracked'}
              />
              <StatCard
                icon="📋" label="Med adherence (7d)" color="var(--accent)"
                value={adherence ? `${adherence.rate}%` : '—'}
                sub={adherence ? `${adherence.taken}/${adherence.total} doses` : undefined}
              />
              <StatCard
                icon="😊" label="Latest mood" color="#f59e0b"
                value={latestMood ? `${latestMood.mood_score}/7` : '—'}
                sub={moodEmoji ? `${moodEmoji} logged today` : 'Not logged'}
              />
              <StatCard
                icon="📊" label="Symptoms (7d)" color="var(--brand)"
                value={symptomStats?.total_entries || 0}
                sub={symptomStats?.total_entries ? 'Entries logged' : 'None logged'}
              />
            </>
          )}
        </div>

        {/* ── Quick actions ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h2 className="section-title" style={{ marginBottom: 14 }}>
            {t('quickActions')}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(192px, 1fr))',
            gap: 10,
          }} className="stagger">
            {QUICK_ACTIONS.map(action => (
              <Link
                key={action.href}
                href={action.href}
                style={{ textDecoration: 'none' }}
                className="card card-hover animate-fade-in"
              >
                <div style={{ padding: '18px 20px' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: `${action.color}15`,
                    border: `1px solid ${action.color}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, marginBottom: 12,
                  }}>
                    {action.icon}
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                    marginBottom: 4, letterSpacing: '-0.02em',
                  }}>
                    {action.labelKey}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {action.desc}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Today's meds ────────────────────────────────────────────── */}
        {todaysMeds.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 12,
            }}>
              <h2 className="section-title">Today&apos;s medications</h2>
              <Link href="/dashboard/medications" style={{
                fontSize: 13, color: 'var(--brand)', fontWeight: 600,
                textDecoration: 'none', letterSpacing: '-0.01em',
              }}>
                View all →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todaysMeds.slice(0, 4).map(med => (
                <div key={med.id} className="card" style={{
                  padding: '13px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    flexShrink: 0, background: med.color || 'var(--brand)',
                    boxShadow: `0 0 8px ${med.color || 'var(--brand)'}60`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                      letterSpacing: '-0.01em',
                    }}>
                      {med.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                      {med.dosage} — {med.frequency}
                    </div>
                  </div>
                  {med.schedule_times?.length > 0 && (
                    <div style={{
                      fontSize: 12.5, color: 'var(--text-secondary)',
                      fontWeight: 600, flexShrink: 0,
                      background: 'var(--bg-hover)',
                      padding: '3px 10px', borderRadius: 'var(--radius-full)',
                    }}>
                      {med.schedule_times[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Welcome / onboarding ─────────────────────────────────────── */}
        {!loading && todaysMeds.length === 0 && moodData.length === 0 && (
          <div className="card" style={{
            padding: '40px 32px', textAlign: 'center',
            background: 'linear-gradient(135deg, var(--brand-light) 0%, var(--bg-card) 100%)',
            border: '1.5px solid var(--border)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🩺</div>
            <div style={{
              fontSize: 20, fontWeight: 800, color: 'var(--text-primary)',
              marginBottom: 10, letterSpacing: '-0.03em',
            }}>
              Welcome to MediGuard
            </div>
            <div style={{
              fontSize: 14, color: 'var(--text-muted)', maxWidth: 380,
              margin: '0 auto 24px', lineHeight: 1.65,
            }}>
              Start by setting up your health profile or chatting with your AI health assistant.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/dashboard/profile" className="btn btn-secondary">
                Set up profile
              </Link>
              <Link href="/dashboard/chat" className="btn btn-primary">
                Start a chat
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
