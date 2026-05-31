'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/ThemeProvider';
import { useLanguage } from '@/components/LanguageProvider';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/translations';
import type { User } from '@supabase/supabase-js';

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const icons = {
  home:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 22V12h6v10"/></svg>,
  chat:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  pill:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="8" width="20" height="8" rx="4"/><path d="M12 8v8"/></svg>,
  activity:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  brain:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 007 4.5v.5a3 3 0 00-3 3 3 3 0 00.5 1.5A3.5 3.5 0 004 12a3.5 3.5 0 003.5 3.5h.5v3a2 2 0 104 0v-3h.5A3.5 3.5 0 0016 12a3.5 3.5 0 00-.5-2.5A3 3 0 0017 8a3 3 0 00-3-3v-.5A2.5 2.5 0 0011.5 2h-2z"/></svg>,
  alert:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  clipboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>,
  user:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  settings:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  globe:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  sun:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  logout:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevronL:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevronR:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  menu:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  cross:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  pulse:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
};

interface Props { user: User; }

export function AppSidebar({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { resolvedTheme, setTheme } = useTheme();
  const { lang } = useLanguage();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === lang);

  const initials = (user.user_metadata?.full_name || user.email || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/dashboard';
    return pathname.startsWith(href);
  }

  const NAV_GROUPS = [
    {
      key: 'main',
      label: t('main'),
      items: [
        { href: '/dashboard',              label: t('home'),           icon: 'home',      group: 'main' },
        { href: '/dashboard/chat',         label: t('aiHealthChat'),   icon: 'chat',      group: 'main' },
      ],
    },
    {
      key: 'health',
      label: t('health'),
      items: [
        { href: '/dashboard/medications',  label: t('medications'),    icon: 'pill',      group: 'health' },
        { href: '/dashboard/symptoms',     label: t('symptoms'),       icon: 'activity',  group: 'health' },
        { href: '/dashboard/mental-health',label: t('mentalHealth'),   icon: 'brain',     group: 'health' },
        { href: '/dashboard/emergency',    label: t('emergency'),      icon: 'alert',     group: 'health' },
        { href: '/dashboard/consultation', label: t('consultation'),   icon: 'clipboard', group: 'health' },
      ],
    },
    {
      key: 'account',
      label: t('account'),
      items: [
        { href: '/dashboard/profile',      label: t('profile'),        icon: 'user',      group: 'account' },
        { href: '/dashboard/settings',     label: t('settings'),       icon: 'settings',  group: 'account' },
        { href: '/dashboard/language',     label: t('language'),       icon: 'globe',     group: 'account' },
      ],
    },
  ];

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full" style={{
      background: 'var(--bg-sidebar)',
      borderRight: mobile ? 'none' : '1px solid var(--border)',
    }}>

      {/* ── Header / Logo ─────────────────────────────────────────────── */}
      <div style={{
        padding: '0 12px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <Link href="/dashboard" style={{
            display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
            minWidth: 0, flex: 1,
          }}>
            <div className="brand-icon" style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15.5, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                MediGuard
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 1 }}>
                Health AI
              </div>
            </div>
          </Link>
        )}

        {collapsed && (
          <div className="brand-icon" style={{
            width: 32, height: 32, borderRadius: 10, margin: '0 auto',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
        )}

        {!mobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="btn-ghost btn-icon-sm"
            style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: collapsed ? 'auto' : 4 }}
            title={collapsed ? t('expandTitle') : t('collapseTitle')}
          >
            <span style={{ width: 16, height: 16, display: 'flex' }}>
              {collapsed ? icons.chevronR : icons.chevronL}
            </span>
          </button>
        )}

        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="btn-ghost btn-icon-sm" style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
            <span style={{ width: 18, height: 18, display: 'flex' }}>{icons.cross}</span>
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '10px 8px', overflowX: 'hidden' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.key} style={{ marginBottom: gi < NAV_GROUPS.length - 1 ? 6 : 0 }}>
            {!collapsed && (
              <div className="section-title" style={{ padding: '6px 8px 5px', marginTop: gi > 0 ? 4 : 0 }}>
                {group.label}
              </div>
            )}
            {collapsed && gi > 0 && <div style={{ height: 6 }} />}

            {group.items.map(item => (
              <NavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isActive(item.href)}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}>

        {/* Theme toggle */}
        <div style={{ padding: collapsed ? '8px 4px' : '8px 8px 4px' }}>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="btn-ghost"
            style={{
              width: '100%',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 10,
              padding: collapsed ? '9px' : '9px 12px',
              gap: 10,
              color: 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 500,
            }}
            title={resolvedTheme === 'dark' ? t('lightMode') : t('darkMode')}
          >
            <span style={{ width: 17, height: 17, display: 'flex', flexShrink: 0 }}>
              {resolvedTheme === 'dark' ? icons.sun : icons.moon}
            </span>
            {!collapsed && <span>{resolvedTheme === 'dark' ? t('lightMode') : t('darkMode')}</span>}
          </button>
        </div>

        {/* Language indicator */}
        {!collapsed && currentLang && (
          <div style={{ padding: '0 8px 4px' }}>
            <Link
              href="/dashboard/language"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                borderRadius: 10,
                color: 'var(--text-muted)',
                fontSize: 12.5,
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              className="btn-ghost"
            >
              <span style={{ fontSize: 15 }}>{currentLang.flag}</span>
              <span>{currentLang.native}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>↗</span>
            </Link>
          </div>
        )}

        {/* User row */}
        <div style={{
          padding: collapsed ? '6px 4px 12px' : '4px 8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div className="avatar" style={{ width: 34, height: 34, fontSize: 12.5 }}>
            {initials}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                letterSpacing: '-0.01em',
              }}>
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </div>
              <div style={{
                fontSize: 11, color: 'var(--text-muted)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user.email}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="btn-ghost btn-icon-sm"
              style={{ color: 'var(--text-muted)', flexShrink: 0 }}
              title={t('signOutTitle')}
            >
              <span style={{ width: 15, height: 15, display: 'flex' }}>{icons.logout}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col sidebar-transition"
        style={{ width: collapsed ? 58 : 240, flexShrink: 0, height: '100vh', overflowX: 'hidden' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="fixed top-3.5 left-3.5 z-50 md:hidden"
        onClick={() => setMobileOpen(true)}
        style={{
          width: 40, height: 40,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-md)',
          cursor: 'pointer',
        }}
      >
        <span style={{ width: 20, height: 20, display: 'flex' }}>{icons.menu}</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(8,13,23,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-50 md:hidden flex flex-col"
        style={{
          width: 268,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: mobileOpen ? 'var(--shadow-xl)' : 'none',
        }}
      >
        <SidebarContent mobile />
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex items-center justify-around"
        style={{
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border)',
          height: 62,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {[
          { href: '/dashboard', icon: 'home',     label: t('home') },
          { href: '/dashboard/chat', icon: 'chat', label: t('aiHealthChat').split(' ')[0] },
          { href: '/dashboard/medications', icon: 'pill', label: t('medications') },
          { href: '/dashboard/symptoms', icon: 'activity', label: t('symptoms') },
          { href: '/dashboard/profile', icon: 'user', label: t('profile') },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '6px 10px',
              color: isActive(item.href) ? 'var(--brand)' : 'var(--text-muted)',
              textDecoration: 'none', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.01em',
              transition: 'color 0.15s',
            }}
          >
            <span style={{
              width: 22, height: 22, display: 'flex',
              background: isActive(item.href) ? 'var(--brand-light)' : 'transparent',
              borderRadius: 8, alignItems: 'center', justifyContent: 'center',
              padding: 2, transition: 'background 0.15s',
            }}>
              {icons[item.icon as keyof typeof icons]}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

function NavItem({ item, collapsed, active, onNavigate }: {
  item: { href: string; label: string; icon: string; group: string };
  collapsed: boolean;
  active: boolean;
  onNavigate: () => void;
}) {
  const isEmergency = item.href.includes('emergency');

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`nav-item ${active ? 'active' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '9px 0' : '8px 12px',
        borderRadius: 10,
        marginBottom: 2,
        color: active
          ? 'var(--brand)'
          : isEmergency
          ? 'var(--danger)'
          : 'var(--text-secondary)',
        background: active ? 'var(--brand-light)' : 'transparent',
        textDecoration: 'none',
        fontWeight: active ? 600 : 450,
        fontSize: 13.5,
        transition: 'all 0.15s ease',
        justifyContent: collapsed ? 'center' : 'flex-start',
        letterSpacing: '-0.01em',
        position: 'relative',
      }}
    >
      <span style={{
        width: 18, height: 18, display: 'flex', flexShrink: 0,
        color: active ? 'var(--brand)' : isEmergency ? 'var(--danger)' : 'var(--text-muted)',
        transition: 'color 0.15s',
      }}>
        {(icons as any)[item.icon]}
      </span>
      {!collapsed && (
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
          {item.label}
        </span>
      )}
      {active && !collapsed && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--brand)', flexShrink: 0,
          boxShadow: '0 0 6px var(--brand)',
        }} />
      )}
    </Link>
  );
}
