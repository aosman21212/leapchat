"use client"

import { useEffect, useState, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageSquare, Mail, Activity } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { getTranslation, type Language } from "@/lib/i18n/translations"
import { Skeleton } from "@/components/ui/skeleton"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

type DashboardStats = {
  channels: {
    total: number;
    newThisMonth: number;
  };
  users: {
    active: number;
    growth: string;
  };
  campaigns: {
    total: number;
    newThisMonth: number;
  };
  recentActivity: {
    channelActivity: Array<{
      name: string;
      newUsers: number;
      totalUsers: number;
    }>;
    mostActiveTime: string;
    period: string;
  };
}

// Skeleton loader for cards
function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[60px] mb-2" />
        <Skeleton className="h-4 w-[120px]" />
      </CardContent>
    </Card>
  )
}

// Skeleton loader for activity list
function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
          <div className="flex flex-col items-end">
            <Skeleton className="h-4 w-[80px] mb-1" />
            <Skeleton className="h-3 w-[60px]" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Individual metric card component
function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  changeText 
}: { 
  title: string; 
  value: number | string; 
  change: number | string; 
  icon: any; 
  changeText: string;
}) {
  return (
    <Card className="border-t-4 border-t-primary">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {typeof change === 'number' ? '+' : ''}{change} {changeText}
        </p>
      </CardContent>
    </Card>
  )
}

// Activity list component
function ActivityList({ 
  activities, 
  mostActiveTime, 
  period,
  language 
}: { 
  activities: DashboardStats['recentActivity']['channelActivity']; 
  mostActiveTime: string;
  period: string;
  language: Language;
}) {
  return (
    <div className="space-y-4">
      {activities.map((channel, index) => (
        <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-medium">{channel.name}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm text-muted-foreground">
              {channel.newUsers} new users
            </span>
            <span className="text-xs text-muted-foreground">
              Total: {channel.totalUsers}
            </span>
          </div>
        </div>
      ))}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="font-medium">{getTranslation(language, "mostActiveTime")}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {mostActiveTime} ({period})
        </span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { language } = useLanguage()
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Prefetch user data
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  // Fetch stats with error handling and retry logic
  useEffect(() => {
    let isMounted = true
    let retryCount = 0
    const maxRetries = 3

    const fetchStats = async () => {
      if (!isMounted) return

      try {
        const token = localStorage.getItem("token")
        if (!token) throw new Error("No authentication token found")

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

        const response = await fetch("http://localhost:5000/api/dashboard/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || "Failed to fetch dashboard stats.")
        }

        const data = await response.json()
        if (isMounted) {
          setStats(data)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          if (retryCount < maxRetries && err instanceof Error && err.name === 'AbortError') {
            retryCount++
            setTimeout(fetchStats, 1000 * retryCount) // Exponential backoff
          } else {
            setError(err instanceof Error ? err.message : "Failed to fetch dashboard stats.")
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchStats()

    return () => {
      isMounted = false
    }
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-destructive font-semibold text-lg">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold text-primary md:text-3xl">{getTranslation(language, "dashboard")}</h1>
        {user && (
          <p className="text-muted-foreground">
            {getTranslation(language, "welcomeBack")}, {user.email}
          </p>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<CardSkeleton />}>
          {isLoading ? (
            <CardSkeleton />
          ) : (
            <MetricCard
              title={getTranslation(language, "totalChannels")}
              value={stats?.channels.total ?? 0}
              change={stats?.channels.newThisMonth ?? 0}
              icon={MessageSquare}
              changeText={getTranslation(language, "newThisMonth")}
            />
          )}
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          {isLoading ? (
            <CardSkeleton />
          ) : (
            <MetricCard
              title={getTranslation(language, "activeUsers")}
              value={stats?.users.active.toLocaleString() ?? 0}
              change={stats?.users.growth ?? "0%"}
              icon={Users}
              changeText={getTranslation(language, "fromLastMonth")}
            />
          )}
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          {isLoading ? (
            <CardSkeleton />
          ) : (
            <MetricCard
              title={getTranslation(language, "campaignsSent")}
              value={stats?.campaigns.total ?? 0}
              change={stats?.campaigns.newThisMonth ?? 0}
              icon={Mail}
              changeText={getTranslation(language, "thisMonth")}
            />
          )}
        </Suspense>
      </div>

      {/* User Activity */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-secondary">{getTranslation(language, "recentUserActivity")}</CardTitle>
          <CardDescription>{getTranslation(language, "userEngagement")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Suspense fallback={<ActivitySkeleton />}>
            {isLoading ? (
              <ActivitySkeleton />
            ) : stats?.recentActivity ? (
              <ActivityList
                activities={stats.recentActivity.channelActivity}
                mostActiveTime={stats.recentActivity.mostActiveTime}
                period={stats.recentActivity.period}
                language={language}
              />
            ) : null}
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
