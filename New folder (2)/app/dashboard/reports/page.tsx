"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n/language-context"
import { getTranslation } from "@/lib/i18n/translations"
import { ChannelReports } from "./channel-reports"
import { CampaignReports } from "./campaign-reports"
import { Button } from "@/components/ui/button"
import { Download, Calendar, Filter, MessageSquare, Mail, BarChart3 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ReportsPage() {
  const { language } = useLanguage()
  const [dateRange, setDateRange] = useState("30days")

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{getTranslation(language, "reports")}</h1>
          <p className="text-muted-foreground">View and analyze performance metrics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Summary of key metrics across all channels and campaigns</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium text-muted-foreground">Total Channels</div>
              <div className="text-2xl font-bold">24</div>
              <div className="text-xs text-muted-foreground">+3 this month</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium text-muted-foreground">Active Subscribers</div>
              <div className="text-2xl font-bold">12,458</div>
              <div className="text-xs text-muted-foreground">+8.2% from last month</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium text-muted-foreground">Campaigns Sent</div>
              <div className="text-2xl font-bold">38</div>
              <div className="text-xs text-muted-foreground">+5 this month</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium text-muted-foreground">Avg. Engagement Rate</div>
              <div className="text-2xl font-bold">18.3%</div>
              <div className="text-xs text-muted-foreground">+2.1% from last month</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-auto">
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Channel Reports</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Campaign Reports</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="channels" className="mt-6">
          <ChannelReports dateRange={dateRange} />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-6">
          <CampaignReports dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
