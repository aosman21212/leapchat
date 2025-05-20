"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Bell, Search, User, HelpCircle, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "./dashboard-sidebar"
import { LanguageSwitcher } from "./language-switcher"
import { useLanguage } from "@/lib/i18n/language-context"
import { getTranslation } from "@/lib/i18n/translations"
import { cn } from "@/lib/utils"

interface HeaderProps {
  onSidebarToggle?: () => void
}

export function DashboardHeader({ onSidebarToggle }: HeaderProps) {
  const { language, dir } = useLanguage()
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user")
      return userData ? JSON.parse(userData) : { email: "user@example.com" }
    }
    return { email: "user@example.com" }
  })

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        <SidebarTrigger onClick={onSidebarToggle} className="md:hidden" />
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <Image src="/images/stc-logo.png" alt="STC Logo" width={60} height={30} className="h-8 w-auto" />
          </Link>
        </div>
        <div className="relative hidden md:flex md:flex-1 md:max-w-sm">
          <Search
            className={cn("absolute top-2.5 h-4 w-4 text-muted-foreground", dir === "ltr" ? "left-2.5" : "right-2.5")}
          />
          <Input
            type="search"
            placeholder={language === "en" ? "Search..." : "بحث..."}
            className={cn("w-full rounded-md border", dir === "ltr" ? "pl-8" : "pr-8", "md:w-[300px] lg:w-[400px]")}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <LanguageSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] text-white">
                3
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[280px] md:w-[320px]">
            <DropdownMenuLabel>{getTranslation(language, "notifications")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-auto">
              <DropdownMenuItem className="cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{getTranslation(language, "newUserSignup")}</p>
                  <p className="text-xs text-muted-foreground">
                    {getTranslation(language, "minutesAgo", { count: "2" })}
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{getTranslation(language, "campaignCompleted")}</p>
                  <p className="text-xs text-muted-foreground">
                    {getTranslation(language, "hoursAgo", { count: "1" })}
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{getTranslation(language, "newFeatureAvailable")}</p>
                  <p className="text-xs text-muted-foreground">
                    {getTranslation(language, "hoursAgo", { count: "3" })}
                  </p>
                </div>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer justify-center text-primary">
              {getTranslation(language, "viewAllNotifications")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className="hidden md:flex">
          <HelpCircle className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{getTranslation(language, "myAccount")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>{getTranslation(language, "profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>{getTranslation(language, "settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <Link
                href="/"
                className="flex w-full items-center"
                onClick={() => {
                  localStorage.removeItem("isAuthenticated")
                  localStorage.removeItem("user")
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{getTranslation(language, "logout")}</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
