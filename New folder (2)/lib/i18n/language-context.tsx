"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Language } from "./translations"

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  dir: "ltr" | "rtl"
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr")

  useEffect(() => {
    // Check if we have a stored language preference
    const storedLanguage = localStorage.getItem("language") as Language
    if (storedLanguage && (storedLanguage === "en" || storedLanguage === "ar")) {
      setLanguageState(storedLanguage)
    } else {
      // Default to browser language if available and supported
      const browserLang = navigator.language.split("-")[0]
      if (browserLang === "ar") {
        setLanguageState("ar")
      }
    }
  }, [])

  useEffect(() => {
    // Update direction based on language
    setDir(language === "ar" ? "rtl" : "ltr")

    // Store language preference
    localStorage.setItem("language", language)

    // Update document direction
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr"

    // Add language class to body for specific styling
    document.body.classList.remove("lang-en", "lang-ar")
    document.body.classList.add(`lang-${language}`)
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  return <LanguageContext.Provider value={{ language, setLanguage, dir }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
