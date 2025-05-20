"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageSquare, Mail, Activity } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { getTranslation } from "@/lib/i18n/translations"

export default function Dashboard() {
  const { language } = useLanguage()
  const [user, setUser] = useState<{ email: string } | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  return (
    <div className="space-y-6">
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
        <Card className="border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{getTranslation(language, "totalChannels")}</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+3 {getTranslation(language, "newThisMonth")}</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-secondary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{getTranslation(language, "activeUsers")}</CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,274</div>
            <p className="text-xs text-muted-foreground">+12% {getTranslation(language, "fromLastMonth")}</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-secondary sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{getTranslation(language, "campaignsSent")}</CardTitle>
            <Mail className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38</div>
            <p className="text-xs text-muted-foreground">+5 {getTranslation(language, "thisMonth")}</p>
          </CardContent>
        </Card>
      </div>

      {/* User Activity */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-secondary">{getTranslation(language, "recentUserActivity")}</CardTitle>
          <CardDescription>{getTranslation(language, "userEngagement")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="font-medium">{getTranslation(language, "newUsersJoined")}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {getTranslation(language, "usersToday", { count: "12" })}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-secondary" />
                <span className="font-medium">{getTranslation(language, "highActivity")}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {getTranslation(language, "thisWeek", { percent: "28" })}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="font-medium">{getTranslation(language, "mostActiveTime")}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {getTranslation(language, "basedOnDays", { days: "30" })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
