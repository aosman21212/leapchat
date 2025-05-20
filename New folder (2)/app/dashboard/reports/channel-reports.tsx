"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, TrendingUp, TrendingDown, Users, BarChart } from "lucide-react"
import Image from "next/image"

// Define the Channel Report type
type ChannelReport = {
  id: string
  name: string
  type: string
  chat_pic?: string
  subscribers: number
  growth: number
  engagementRate: number
  messagesSent: number
  avgResponseTime: string
  status: "growing" | "stable" | "declining"
}

interface ChannelReportsProps {
  dateRange: string
}

export function ChannelReports({ dateRange }: ChannelReportsProps) {
  const [channelReports, setChannelReports] = useState<ChannelReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [topChannels, setTopChannels] = useState<ChannelReport[]>([])

  useEffect(() => {
    // In a real app, this would be an API call with the dateRange parameter
    // For now, we'll use mock data
    const mockChannelReports: ChannelReport[] = [
      {
        id: "120363163421601923",
        name: "العربية رياضة",
        type: "newsletter",
        chat_pic: "/winding-waterway.png",
        subscribers: 12458,
        growth: 8.2,
        engagementRate: 24.5,
        messagesSent: 42,
        avgResponseTime: "2.3 min",
        status: "growing",
      },
      {
        id: "120363164277303098",
        name: "الشرق رياضة",
        type: "newsletter",
        chat_pic: "/abstract-letter-s.png",
        subscribers: 8932,
        growth: 5.7,
        engagementRate: 18.9,
        messagesSent: 36,
        avgResponseTime: "3.1 min",
        status: "growing",
      },
      {
        id: "120363180681473450",
        name: "CIC Saudi Arabia",
        type: "newsletter",
        chat_pic: "/letter-c-typography.png",
        subscribers: 6745,
        growth: 2.3,
        engagementRate: 15.2,
        messagesSent: 28,
        avgResponseTime: "4.5 min",
        status: "stable",
      },
      {
        id: "120363203534383492",
        name: "Paris Saint-Germain",
        type: "newsletter",
        chat_pic: "/letter-p-typography.png",
        subscribers: 9876,
        growth: 12.8,
        engagementRate: 32.1,
        messagesSent: 54,
        avgResponseTime: "1.8 min",
        status: "growing",
      },
      {
        id: "120363399536107739",
        name: "BAB INTERNATIONAL CORP",
        type: "newsletter",
        chat_pic: "/letter-b-abstract.png",
        subscribers: 3245,
        growth: -2.1,
        engagementRate: 10.5,
        messagesSent: 18,
        avgResponseTime: "5.2 min",
        status: "declining",
      },
      {
        id: "120363401318226513",
        name: "Leap Information Technology",
        type: "newsletter",
        chat_pic: "/letter-l-typography.png",
        subscribers: 4532,
        growth: 1.5,
        engagementRate: 14.8,
        messagesSent: 24,
        avgResponseTime: "3.7 min",
        status: "stable",
      },
      {
        id: "120363419894891644",
        name: "bab",
        type: "newsletter",
        subscribers: 1245,
        growth: -5.3,
        engagementRate: 8.2,
        messagesSent: 12,
        avgResponseTime: "6.1 min",
        status: "declining",
      },
    ]

    setChannelReports(mockChannelReports)

    // Set top channels (sorted by subscribers)
    const sorted = [...mockChannelReports].sort((a, b) => b.subscribers - a.subscribers)
    setTopChannels(sorted.slice(0, 5))

    setIsLoading(false)
  }, [dateRange])

  // Calculate summary metrics
  const totalSubscribers = channelReports.reduce((sum, channel) => sum + channel.subscribers, 0)
  const avgEngagementRate = channelReports.length
    ? channelReports.reduce((sum, channel) => sum + channel.engagementRate, 0) / channelReports.length
    : 0
  const totalMessagesSent = channelReports.reduce((sum, channel) => sum + channel.messagesSent, 0)
  const growingChannels = channelReports.filter((channel) => channel.status === "growing").length

  // Define columns for the DataTable
  const columns: Column<ChannelReport>[] = [
    {
      header: "Channel",
      accessorKey: "name",
      enableSorting: true,
      enableFiltering: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.chat_pic ? (
            <Image
              src={row.chat_pic || "/placeholder.svg"}
              alt={row.name}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-gray-500" />
            </div>
          )}
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-xs text-muted-foreground">ID: {row.id}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Subscribers",
      accessorKey: "subscribers",
      enableSorting: true,
      cell: (row) => row.subscribers.toLocaleString(),
    },
    {
      header: "Growth",
      accessorKey: "growth",
      enableSorting: true,
      cell: (row) => (
        <div className="flex items-center">
          {row.growth > 0 ? (
            <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
          ) : row.growth < 0 ? (
            <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
          ) : (
            <span className="mr-2">—</span>
          )}
          <span className={row.growth > 0 ? "text-green-500" : row.growth < 0 ? "text-red-500" : ""}>
            {row.growth > 0 ? "+" : ""}
            {row.growth}%
          </span>
        </div>
      ),
    },
    {
      header: "Engagement",
      accessorKey: "engagementRate",
      enableSorting: true,
      cell: (row) => `${row.engagementRate}%`,
    },
    {
      header: "Messages",
      accessorKey: "messagesSent",
      enableSorting: true,
    },
    {
      header: "Avg Response",
      accessorKey: "avgResponseTime",
      enableSorting: true,
    },
    {
      header: "Status",
      accessorKey: "status",
      enableSorting: true,
      cell: (row) => {
        const statusColors = {
          growing: "bg-green-100 text-green-700",
          stable: "bg-blue-100 text-blue-700",
          declining: "bg-red-100 text-red-700",
        }
        return <Badge className={`${statusColors[row.status]} capitalize`}>{row.status}</Badge>
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across {channelReports.length} channels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEngagementRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Based on all interactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessagesSent}</div>
            <p className="text-xs text-muted-foreground">During selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Growing Channels</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{growingChannels}</div>
            <p className="text-xs text-muted-foreground">Out of {channelReports.length} total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Top Performing Channels</CardTitle>
              <CardDescription>Channels with the highest subscriber count</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topChannels.map((channel, index) => (
              <div key={channel.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    {channel.chat_pic ? (
                      <Image
                        src={channel.chat_pic || "/placeholder.svg"}
                        alt={channel.name}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : null}
                    <span className="font-medium">{channel.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{channel.subscribers.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">subscribers</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{channel.engagementRate}%</div>
                    <div className="text-xs text-muted-foreground">engagement</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <DataTable
          data={channelReports}
          columns={columns}
          title="Channel Performance"
          description={`Detailed metrics for all channels (${dateRange === "30days" ? "Last 30 days" : dateRange === "7days" ? "Last 7 days" : dateRange === "90days" ? "Last 90 days" : "This year"})`}
          searchPlaceholder="Search channels..."
          exportFilename="channel-reports-export"
          initialPageSize={10}
          pageSizeOptions={[5, 10, 20]}
        />
      )}
    </div>
  )
}
