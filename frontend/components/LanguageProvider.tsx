'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { getLanguageDir } from '@/lib/i18n/translations';

interface LangCtx {
  lang: string;
  setLanguage: (l: string) => void;
}

const LangContext = createContext<LangCtx>({ lang: 'en', setLanguage: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read from localStorage on mount
    const stored = localStorage.getItem('mg-lang');
    // Validate it's a real language code (not garbage)
    const validCodes = ['en','es','fr','ar','hi','pt','de','zh','sw','ru','ja','bn','ur','id','ko','tr','vi','it','pl','nl','th','fa','ha','yo','ig','am','so','zu','rw','lg'];
    const resolved = stored && validCodes.includes(stored) ? stored : 'en';
    setLang(resolved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Update html lang and dir attributes when language changes
    const dir = getLanguageDir(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, mounted]);

  function setLanguage(l: string) {
    setLang(l);
    localStorage.setItem('mg-lang', l);
    // Immediately update html attributes
    const dir = getLanguageDir(l);
    document.documentElement.lang = l;
    document.documentElement.dir = dir;
  }

  return (
    <LangContext.Provider value={{ lang, setLanguage }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLanguage = () => useContext(LangContext);
