'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/translations';

export default function LanguagePage() {
  const { lang, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selecting, setSelecting] = useState<string | null>(null);

  const filtered = SUPPORTED_LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.native.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (code: string) => {
    setSelecting(code);
    setLanguage(code);
    setTimeout(() => router.push('/dashboard'), 400);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 80px' }} className="animate-fade-in">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div className="brand-icon" style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', margin: 0 }}>
                {t('languageTitle')}
              </h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 3 }}>
                {SUPPORTED_LANGUAGES.length} {t('languageSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Currently selected */}
        {(() => {
          const current = SUPPORTED_LANGUAGES.find(l => l.code === lang);
          return current ? (
            <div style={{ marginBottom: 20 }}>
              <div className="section-title" style={{ marginBottom: 8 }}>{t('currentlySelected')}</div>
              <div style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--brand-light)',
                border: '2px solid var(--brand)',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: 'var(--shadow-brand)',
              }}>
                <span style={{ fontSize: 32 }}>{current.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand)', letterSpacing: '-0.02em' }}>
                    {current.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--brand)', opacity: 0.7, marginTop: 1 }}>
                    {current.native}
                  </div>
                </div>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-brand)',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            </div>
          ) : null;
        })()}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchLanguages')}
            style={{ paddingLeft: 42, fontSize: 14.5, borderRadius: 'var(--radius-lg)' }}
          />
        </div>

        {/* Language grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(196px, 1fr))',
          gap: 10,
        }}>
          {filtered.map((language, i) => {
            const isSelected = lang === language.code;
            const isSelecting = selecting === language.code;
            return (
              <button
                key={language.code}
                onClick={() => handleSelect(language.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 15px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid',
                  cursor: 'pointer', textAlign: 'left',
                  background: isSelected ? 'var(--brand-light)' : 'var(--bg-card)',
                  borderColor: isSelected ? 'var(--brand)' : 'var(--border)',
                  transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: isSelected ? 'var(--shadow-brand)' : 'var(--shadow-xs)',
                  transform: isSelecting ? 'scale(0.97)' : 'scale(1)',
                  animationDelay: `${i * 12}ms`,
                }}
                className="animate-fade-in"
              >
                <span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>{language.flag}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13.5, fontWeight: isSelected ? 700 : 600,
                    color: isSelected ? 'var(--brand)' : 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    letterSpacing: '-0.01em',
                  }}>
                    {language.name}
                  </div>
                  <div style={{
                    fontSize: 11.5, color: isSelected ? 'var(--brand)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginTop: 1, opacity: isSelected ? 0.7 : 1,
                  }}>
                    {language.native}
                  </div>
                </div>
                {isSelected && (
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {t('noLanguagesMatch')} &ldquo;{search}&rdquo;
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
