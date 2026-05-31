'use client';
import { useLanguage } from '@/components/LanguageProvider';
import { getTranslations, type TranslationKey } from './translations';

export function useTranslation() {
  const { lang } = useLanguage();
  const t = getTranslations(lang);

  function translate(key: TranslationKey): string {
    return t[key] ?? key;
  }

  return { t: translate, lang };
}
