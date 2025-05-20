"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardFooter } from "@/components/dashboard-footer"
import { useLanguage } from "@/lib/i18n/language-context"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  className?: string
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const router = useRouter()
  const { dir } = useLanguage()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const auth = localStorage.getItem("isAuthenticated") === "true"
    setIsAuthenticated(auth)

    if (!auth) {
      router.push("/")
    }

    // Handle responsive sidebar
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    // Set initial state
    handleResize()

    // Add event listener
    window.addEventListener("resize", handleResize)

    // Clean up
    return () => window.removeEventListener("resize", handleResize)
  }, [router])

  // Show nothing while checking authentication
  if (isAuthenticated === null) {
    return null
  }

  // Redirect if not authenticated
  if (isAuthenticated === false) {
    return null
  }

  console.log("DashboardLayout sidebarOpen state:", sidebarOpen);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900" dir={dir}>
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main className={cn("flex-1 overflow-auto p-4 md:p-6", className)}>{children}</main>
          <DashboardFooter />
        </div>
      </div>
    </div>
  )
}
