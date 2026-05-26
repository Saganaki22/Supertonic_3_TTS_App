import { createContext, useContext, useState, useCallback, useEffect, createElement } from "react";
import { type Lang, type Translations, getTranslations, LANG_OPTIONS } from "../lib/i18n";

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  options: typeof LANG_OPTIONS;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const savedLang = (): Lang => {
  const s = localStorage.getItem("lang");
  return (LANG_OPTIONS.find((o) => o.code === s)?.code) || "en";
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(savedLang);
  const t = getTranslations(lang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-lang", lang);
  }, [lang]);

  return createElement(I18nContext.Provider, { value: { lang, setLang, t, options: LANG_OPTIONS } }, children);
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
