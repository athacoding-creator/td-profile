import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { EN } from "./en";

export type Lang = "id" | "en";
const KEY = "td-lang";

function initial(): Lang {
  try {
    const s = localStorage.getItem(KEY);
    if (s === "id" || s === "en") return s;
    return navigator.language?.toLowerCase().startsWith("id") ? "id" : "en";
  } catch {
    return "id";
  }
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string };
const LangCtx = createContext<Ctx>({ lang: "id", setLang: () => {}, t: (s) => s });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (l: Lang) => {
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
    setLangState(l);
  };
  /** Keys are the Indonesian source text; English returned when lang = en. */
  const t = useCallback((s: string) => (lang === "en" ? EN[s] ?? s : s), [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export const useT = () => useContext(LangCtx);
