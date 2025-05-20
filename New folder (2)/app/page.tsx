"use client"

import { LoginForm } from "@/app/login-form"
import { useLanguage } from "@/lib/i18n/language-context"
import { getTranslation } from "@/lib/i18n/translations"
import { LanguageSwitcher } from "@/components/language-switcher"
import Image from "next/image"

export default function Home() {
  const { language } = useLanguage()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Image src="/images/stc-logo.png" alt="STC Logo" width={120} height={60} className="h-16 w-auto mb-6" />
          <h1 className="text-3xl font-bold text-primary">{getTranslation(language, "welcome")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{getTranslation(language, "signInToAccess")}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
