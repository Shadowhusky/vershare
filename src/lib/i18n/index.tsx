"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { en, TranslationKey } from "./locales/en";
import { zh } from "./locales/zh";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { de } from "./locales/de";
import { ja } from "./locales/ja";
import { Locale, LOCALE_COOKIE, isLocale } from "./shared";

export type { Locale } from "./shared";

export const LOCALES = {
  en: { label: "English", flag: "🇬🇧", dict: en as Record<TranslationKey, string> },
  zh: { label: "中文", flag: "🇨🇳", dict: zh },
  es: { label: "Español", flag: "🇪🇸", dict: es },
  fr: { label: "Français", flag: "🇫🇷", dict: fr },
  de: { label: "Deutsch", flag: "🇩🇪", dict: de },
  ja: { label: "日本語", flag: "🇯🇵", dict: ja },
} as const;

const LEGACY_LS_KEY = "vershare_locale";

export type TFunction = (
  key: TranslationKey,
  vars?: Record<string, string | number>
) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => en[key] ?? key,
});

function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match
  );
}

function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  try {
    localStorage.setItem(LEGACY_LS_KEY, locale);
  } catch {
    // storage unavailable
  }
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Migrate users who chose a language before the cookie existed
  useEffect(() => {
    if (document.cookie.includes(`${LOCALE_COOKIE}=`)) return;
    try {
      const saved = localStorage.getItem(LEGACY_LS_KEY);
      if (isLocale(saved)) {
        persistLocale(saved);
        if (saved !== initialLocale) {
          setLocaleState(saved);
          document.documentElement.lang = saved;
        }
      }
    } catch {
      // storage unavailable
    }
  }, [initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback<TFunction>(
    (key, vars) => {
      const dict = LOCALES[locale].dict;
      return interpolate(dict[key] ?? en[key] ?? key, vars);
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT(): TFunction {
  return useContext(I18nContext).t;
}
