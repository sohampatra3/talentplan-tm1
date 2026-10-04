'use client';
import { createContext, useContext, useMemo } from 'react';
import {
  translate,
  formatMoney,
  formatNumber,
  monthLabel,
  type Language,
} from '@/lib/i18n';
export const LocaleContext = createContext<Language>('en');
export function useLocale() {
  const language = useContext(LocaleContext);
  return useMemo(
    () => ({
      language,
      t: (key: string) => translate(language, key),
      money: (value: number, compact = true) =>
        formatMoney(value, language, compact),
      num: (value: number, digits = 0) => formatNumber(value, language, digits),
      month: (value: number) => monthLabel(value, language),
    }),
    [language]
  );
}
