import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const FEATURES = [
    { icon: '🤖', title: 'AI health guidance',     desc: 'Ask anything health related and get clear, evidence-based answers — in your language.' },
    { icon: '💊', title: 'Medication management',  desc: 'Track your medications, log doses, and get alerted to dangerous drug combinations.' },
    { icon: '📊', title: 'Symptom tracking',       desc: 'Log symptoms over time to spot patterns and prepare for doctor visits.' },
    { icon: '🧠', title: 'Mental wellbeing',       desc: 'Track your mood, journal privately, and access breathing exercises anytime.' },
    { icon: '📋', title: 'Doctor-ready reports',   desc: 'Generate a clean health summary to bring to your next consultation.' },
    { icon: '🌍', title: '30 languages',           desc: 'MediGuard speaks your language — from English to Swahili and beyond.' },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 60, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6470f3 0%, #9b6ff5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>MediGuard</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link href="/auth/signup" className="btn btn-primary btn-sm">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 24px 64px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--brand-light)', border: '1px solid rgba(100,112,243,0.25)', borderRadius: 99, padding: '5px 14px', marginBottom: 24, fontSize: 13, color: 'var(--brand)', fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', display: 'inline-block' }} />
          Available in 30 languages
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 62px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 20px', color: 'var(--text-primary)' }}>
          Your personal<br />
          <span style={{ background: 'linear-gradient(135deg, #6470f3 0%, #9b6ff5 60%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            health assistant
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' }}>
          Understand your symptoms, manage your medications, track your wellbeing, and get AI-powered guidance — all in one place.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/signup" className="btn btn-primary btn-lg" style={{ boxShadow: '0 8px 24px rgba(100,112,243,0.3)' }}>
            Start for free →
          </Link>
          <Link href="/auth/login" className="btn btn-secondary btn-lg">
            Sign in
          </Link>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>No credit card needed. Free to use.</p>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', color: 'var(--text-primary)' }}>
            Everything you need to stay on top of your health
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Built for patients, not for doctors.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card card-hover" style={{ padding: '22px 24px' }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 600, margin: '0 auto 80px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, #6470f3 0%, #9b6ff5 100%)', borderRadius: 24, padding: '40px 32px', color: '#fff' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px' }}>
            Ready to take control of your health?
          </h2>
          <p style={{ fontSize: 15, opacity: 0.88, marginBottom: 28, lineHeight: 1.6 }}>
            Join thousands of people using MediGuard to understand their health better.
          </p>
          <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#6470f3', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
            Get started — it's free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          © 2025 MediGuard · <strong>Not a substitute for professional medical advice.</strong> Always consult a doctor for medical decisions.
        </p>
      </footer>
    </div>
  );
}
