'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName) { setError('Please fill in all fields'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: firstName }, emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  };

  if (done) return (
    <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }} className="animate-fade-in">
      <div className="card" style={{ padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check your inbox</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          We sent a verification link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Click it to activate your account.
        </p>
        <Link href="/auth/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>
          Back to sign in
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', maxWidth: 400 }} className="animate-fade-in">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
          background: 'linear-gradient(135deg, #6470f3 0%, #9b6ff5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(100,112,243,0.3)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)' }}>Create your account</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>Your health journey starts here</p>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <button onClick={handleGoogle} disabled={googleLoading}
          style={{
            width: '100%', padding: '11px 16px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--bg-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 10, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
            marginBottom: 20, transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {googleLoading ? 'Connecting…' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Your name</label>
            <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" autoComplete="given-name" />
          </div>
          <div>
            <label className="label">Email address</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters"
                autoComplete="new-password" style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: password.length >= i * 2 ? (password.length >= 8 ? 'var(--success)' : 'var(--warning)') : 'var(--border)', transition: 'background 0.2s' }} />
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 12px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 8, fontSize: 13, color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: 4 }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
            By creating an account you agree to our{' '}
            <a href="/terms" style={{ color: 'var(--brand)', textDecoration: 'none' }}>Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" style={{ color: 'var(--brand)', textDecoration: 'none' }}>Privacy Policy</a>
          </p>
        </form>
      </div>

      <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', marginTop: 20 }}>
        Already have an account?{' '}
        <Link href="/auth/login" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
      </p>
    </div>
  );
}
