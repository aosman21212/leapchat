"use client"

import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "@/lib/i18n/language-context"
import { getTranslation } from "@/lib/i18n/translations"
import { cn } from "@/lib/utils"

export function DashboardFooter() {
  const { language, dir } = useLanguage()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-background py-4 px-4 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <p
            className={cn(
              "text-center text-sm text-muted-foreground",
              dir === "ltr" ? "md:text-left" : "md:text-right",
            )}
          >
            &copy; {currentYear} STC. {getTranslation(language, "allRightsReserved")}
          </p>
        </div>
        <nav className="flex flex-wrap justify-center gap-4 sm:gap-6">
          <Link href="#" className="text-sm text-primary hover:text-secondary hover:underline">
            {getTranslation(language, "terms")}
          </Link>
          <Link href="#" className="text-sm text-primary hover:text-secondary hover:underline">
            {getTranslation(language, "privacy")}
          </Link>
          <Link href="#" className="text-sm text-primary hover:text-secondary hover:underline">
            {getTranslation(language, "cookies")}
          </Link>
          <Link href="#" className="text-sm text-primary hover:text-secondary hover:underline">
            {getTranslation(language, "contact")}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
