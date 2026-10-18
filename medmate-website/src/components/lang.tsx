"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { LANGS, STRINGS, type Key, type Lang } from "@/lib/i18n";

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });
const KEY = "mm-lang";

/** Remembers the visitor's language (English by default). Server HTML is always English. */
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try { const v = localStorage.getItem(KEY); if (v === "kn" || v === "hi") setLangState(v); } catch { /* storage blocked */ }
  }, []);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem(KEY, l); } catch { /* storage blocked */ } };
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
export function useT() {
  const { lang } = useLang();
  return (k: Key, vars: Record<string, string> = {}) => Object.entries(vars).reduce((s, [a, b]) => s.replace(`{${a}}`, b), STRINGS[lang][k]);
}

/** A translated string. */
export function T({ k }: { k: Key }) {
  const t = useT();
  return <>{t(k)}</>;
}

/** English / ಕನ್ನಡ / हिन्दी switch. */
export function LangToggle({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  const { lang, setLang } = useLang();
  const t = useT();
  return (
    <div role="group" aria-label={t("lang.label")} className={`inline-flex rounded-full p-0.5 ${dark ? "bg-white/10 ring-1 ring-white/20" : "bg-surface-2 ring-1 ring-line"} ${className}`}>
      {LANGS.map(([l, label]) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
          className={`press h-11 rounded-full px-3.5 text-[13px] font-semibold ${lang === l ? (dark ? "bg-surface text-forest" : "bg-forest text-white") : dark ? "text-mint-200" : "text-ink-2"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
