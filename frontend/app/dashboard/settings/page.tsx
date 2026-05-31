'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { createClient, getAccessToken } from '@/lib/supabase/client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const AI_PERSONALITIES = [
  { id: 'friendly', labelKey: 'Friendly',  desc: 'Warm, caring and supportive responses',       icon: '😊' },
  { id: 'clinical', labelKey: 'Clinical',  desc: 'Precise and medically structured language',   icon: '🩺' },
  { id: 'concise',  labelKey: 'Concise',   desc: 'Short, direct answers — no extra words',      icon: '⚡' },
];

function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ flex: 1, paddingRight: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
      </div>
      <label className="toggle" style={{ flexShrink: 0 }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-track" />
        <span className="toggle-thumb" />
      </label>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '22px 24px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const supabase = createClient();
  const getToken = useCallback(() => getAccessToken(), []);

  const [personality, setPersonality] = useState('friendly');
  useEffect(() => { setPersonality(localStorage.getItem('mg-personality') || 'friendly'); }, []);
  const [notifMeds, setNotifMeds] = useState(true);
  const [notifMood, setNotifMood] = useState(true);
  const [notifNews, setNotifNews] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwSent, setPwSent] = useState(false);

  const handlePersonality = (id: string) => {
    setPersonality(id);
    localStorage.setItem('mg-personality', id);
  };

  const handlePasswordReset = async () => {
    setChangingPassword(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      setPwSent(true);
    }
    setChangingPassword(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    const token = await getToken();
    if (token) {
      await fetch(`${API}/api/profile/delete`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    }
    await supabase.auth.signOut();
    router.push('/');
  };

  const themeOptions = [
    { key: 'system', label: t('systemTheme') },
    { key: 'light',  label: t('lightTheme') },
    { key: 'dark',   label: t('darkTheme') },
  ] as const;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 80px' }} className="animate-fade-in">
      <div style={{ maxWidth: 660, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
            <div className="brand-icon" style={{ width: 44, height: 44, borderRadius: 14 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', margin: 0 }}>
                {t('settingsTitle')}
              </h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 3 }}>
                {t('managePreferences')}
              </p>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <Section title={t('appearance')} icon="🎨">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>{t('theme')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {themeOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setTheme(opt.key as any)}
                  style={{
                    flex: 1, padding: '11px 8px',
                    borderRadius: 'var(--radius)',
                    border: '1.5px solid',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: theme === opt.key ? 'var(--brand-light)' : 'var(--bg-hover)',
                    color: theme === opt.key ? 'var(--brand)' : 'var(--text-secondary)',
                    borderColor: theme === opt.key ? 'var(--brand)' : 'var(--border)',
                    transition: 'all 0.18s ease',
                    boxShadow: theme === opt.key ? 'var(--shadow-brand)' : 'none',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* AI Style */}
        <Section title={t('aiAssistantStyle')} icon="🤖">
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 14, marginTop: -4 }}>
            {t('aiStyleDesc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {AI_PERSONALITIES.map(p => (
              <button
                key={p.id}
                onClick={() => handlePersonality(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 16px',
                  borderRadius: 'var(--radius)',
                  border: '1.5px solid',
                  cursor: 'pointer', textAlign: 'left',
                  background: personality === p.id ? 'var(--brand-light)' : 'var(--bg-hover)',
                  borderColor: personality === p.id ? 'var(--brand)' : 'var(--border)',
                  transition: 'all 0.18s ease',
                  boxShadow: personality === p.id ? 'var(--shadow-brand)' : 'none',
                }}
              >
                <span style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: personality === p.id ? 'var(--brand-light)' : 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  {p.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700,
                    color: personality === p.id ? 'var(--brand)' : 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                  }}>
                    {p.labelKey}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{p.desc}</div>
                </div>
                {personality === p.id && (
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: 'var(--shadow-brand)',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* Notifications */}
        <Section title={t('notifications')} icon="🔔">
          <ToggleRow
            label={t('medReminders')}
            desc={t('medRemindersDesc')}
            checked={notifMeds}
            onChange={setNotifMeds}
          />
          <ToggleRow
            label={t('moodCheckin')}
            desc={t('moodCheckinDesc')}
            checked={notifMood}
            onChange={setNotifMood}
          />
          <div style={{ borderBottom: 'none' }}>
            <ToggleRow
              label={t('healthTips')}
              desc={t('healthTipsDesc')}
              checked={notifNews}
              onChange={setNotifNews}
            />
          </div>
        </Section>

        {/* Language */}
        <div
          className="card card-hover"
          onClick={() => router.push('/dashboard/language')}
          style={{ padding: '18px 24px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--brand-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            🌐
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('language')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{t('changeLanguage')}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>

        {/* Account */}
        <Section title={t('accountSection')} icon="👤">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handlePasswordReset}
              disabled={changingPassword || pwSent}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', fontWeight: 500 }}
            >
              {pwSent ? t('resetSent') : changingPassword ? t('sending') : t('changePassword')}
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', fontWeight: 500 }}
            >
              {t('signOut')}
            </button>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 2 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="btn btn-danger"
                style={{ justifyContent: 'flex-start', width: '100%', fontWeight: 500 }}
              >
                {deleting ? t('deleting') : deleteConfirm ? t('confirmDelete') : t('deleteAccount')}
              </button>
              {deleteConfirm && (
                <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8, lineHeight: 1.5 }}>
                  {t('deleteWarning')}
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* Version */}
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: 12 }}>
          MediGuard v3.0
        </div>
      </div>
    </div>
  );
}
