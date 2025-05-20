"use client"

import { RegistrationForm } from "@/app/register/registration-form"
import { useLanguage } from "@/lib/i18n/language-context"
import { getTranslation } from "@/lib/i18n/translations"
import { LanguageSwitcher } from "@/components/language-switcher"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function RegisterPage() {
  const { language } = useLanguage()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {getTranslation(language, "backToLogin")}
          </Link>
        </Button>
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">{getTranslation(language, "createAccount")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{getTranslation(language, "fillDetailsToRegister")}</p>
        </div>
        <RegistrationForm />
      </div>
    </div>
  )
}
