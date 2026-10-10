import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { en, kg, ru } from './dict'
import type { Key } from './dict'

export type Lang = 'ru' | 'kg' | 'en'
export const langs: Lang[] = ['ru', 'kg', 'en']

const tables: Record<Lang, Partial<Record<Key, string>>> = { ru, kg, en }
const STORAGE = 'bb.lang'

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: Key) => string
}

const I18nContext = createContext<Ctx | null>(null)

function readStored(): Lang {
  try {
    const v = localStorage.getItem(STORAGE)
    if (v === 'ru' || v === 'kg' || v === 'en') return v
  } catch {
    /* приватный режим — просто остаёмся на русском */
  }
  return 'ru'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStored)

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    document.documentElement.lang = l
    try {
      localStorage.setItem(STORAGE, l)
    } catch {
      /* не критично */
    }
  }, [])

  const t = useCallback((k: Key) => tables[lang][k] ?? ru[k], [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n вызван вне I18nProvider')
  return ctx
}
