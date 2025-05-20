"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  LogOut,
  Menu,
  MessageSquare,
  Mail,
  Globe,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MessageCircleMore,
} from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { getTranslation } from "@/lib/i18n/translations"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent } from "@/components/ui/sheet"

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DashboardSidebar({ open, onOpenChange }: SidebarProps) {
  const { language, dir } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleLogout = async () => {
    try {
      // Make the API call to log out
      const response = await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`, // Assuming token is stored in localStorage
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to log out")
      }

      // Clear local storage and redirect after successful logout
      localStorage.removeItem("isAuthenticated")
      localStorage.removeItem("user")
      localStorage.removeItem("token") // Remove the token as well
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
      alert("An error occurred while logging out. Please try again.")
    }
  }

  const menuItems = [
    { icon: LayoutDashboard, label: getTranslation(language, "dashboard"), href: "/dashboard" },
    { icon: MessageSquare, label: getTranslation(language, "channels"), href: "/dashboard/channels" },
    { icon: Mail, label: getTranslation(language, "campaigns"), href: "/dashboard/campaigns" },
    { icon: Users, label: getTranslation(language, "users"), href: "/dashboard/users" },
  ]

  const SidebarContent = ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-4">
        <div className="flex items-center gap-2 flex-1">
          <Image 
            src="/images/stc-logo.png" 
            alt="STC Logo" 
            width={80} 
            height={40} 
            className="h-12 w-auto" 
          />
          {!isMobile && (
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(!open)} className="ml-auto">
              {dir === "ltr" ? (
                open ? (
                  <ChevronLeft className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )
              ) : open ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
                !open && !isMobile && "justify-center px-2",
              )}
              onClick={() => onOpenChange(false)}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  pathname === item.href ? "text-primary-foreground" : "text-primary",
                )}
              />
              {(open || isMobile) && <span className={cn("ml-3", dir === "rtl" && "mr-3 ml-0")}>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t p-4">
        <Button
          variant="outline"
          className={cn("w-full justify-start", !open && !isMobile && "justify-center px-2")}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 text-secondary" />
          {(open || isMobile) && (
            <span className={cn("ml-3", dir === "rtl" && "mr-3 ml-0")}>{getTranslation(language, "logout")}</span>
          )}
        </Button>
      </div>
    </div>
  )

  // Mobile sidebar uses Sheet component
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={dir === "rtl" ? "right" : "left"} className="p-0 w-[280px]">
          <SidebarContent onOpenChange={onOpenChange} />
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop sidebar
  return (
    <div
      className={cn(
        "hidden md:block border-r bg-background transition-all duration-300 ease-in-out",
        open ? "w-64" : "w-[70px]",
      )}
    >
      <SidebarContent onOpenChange={onOpenChange} />
    </div>
  )
}

export function SidebarTrigger({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <Button variant="ghost" size="icon" className={className} onClick={onClick}>
      <Menu className="h-5 w-5" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  )
}