"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Mail, TrendingUp, Eye, MousePointerClick, BarChart } from "lucide-react"
import { Progress } from "@/components/ui/progress"

// Define the Campaign Report type
type CampaignReport = {
  id: number
  name: string
  status: "sent" | "draft" | "scheduled" | "active"
  sentDate: string
  recipients: number
  openRate: number
  clickRate: number
  conversionRate: number
  deliveryRate: number
  bounceRate: number
  unsubscribeRate: number
  performance: "excellent" | "good" | "average" | "poor"
}

interface CampaignReportsProps {
  dateRange: string
}

export function CampaignReports({ dateRange }: CampaignReportsProps) {
  const [campaignReports, setCampaignReports] = useState<CampaignReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [topCampaigns, setTopCampaigns] = useState<CampaignReport[]>([])

  useEffect(() => {
    // In a real app, this would be an API call with the dateRange parameter
    // For now, we'll use mock data
    const mockCampaignReports: CampaignReport[] = [
      {
        id: 1,
        name: "May Newsletter",
        status: "sent",
        sentDate: "May 10, 2023",
        recipients: 12458,
        openRate: 24.8,
        clickRate: 12.3,
        conversionRate: 3.6,
        deliveryRate: 98.2,
        bounceRate: 1.8,
        unsubscribeRate: 0.5,
        performance: "good",
      },
      {
        id: 2,
        name: "Product Update",
        status: "sent",
        sentDate: "May 3, 2023",
        recipients: 11892,
        openRate: 22.5,
        clickRate: 10.8,
        conversionRate: 2.9,
        deliveryRate: 97.8,
        bounceRate: 2.2,
        unsubscribeRate: 0.7,
        performance: "average",
      },
      {
        id: 3,
        name: "Feature Announcement",
        status: "sent",
        sentDate: "Apr 26, 2023",
        recipients: 13245,
        openRate: 26.2,
        clickRate: 14.1,
        conversionRate: 4.2,
        deliveryRate: 99.1,
        bounceRate: 0.9,
        unsubscribeRate: 0.3,
        performance: "excellent",
      },
      {
        id: 4,
        name: "June Newsletter",
        status: "scheduled",
        sentDate: "Scheduled Jun 5, 2023",
        recipients: 12500,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
        deliveryRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        performance: "average",
      },
      {
        id: 5,
        name: "Summer Promotion",
        status: "draft",
        sentDate: "Not scheduled",
        recipients: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
        deliveryRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        performance: "average",
      },
      {
        id: 6,
        name: "User Survey",
        status: "sent",
        sentDate: "Apr 15, 2023",
        recipients: 9845,
        openRate: 31.5,
        clickRate: 18.2,
        conversionRate: 5.8,
        deliveryRate: 98.7,
        bounceRate: 1.3,
        unsubscribeRate: 0.2,
        performance: "excellent",
      },
      {
        id: 7,
        name: "Welcome Series",
        status: "active",
        sentDate: "Ongoing",
        recipients: 3425,
        openRate: 45.2,
        clickRate: 22.7,
        conversionRate: 8.3,
        deliveryRate: 99.5,
        bounceRate: 0.5,
        unsubscribeRate: 0.1,
        performance: "excellent",
      },
      {
        id: 8,
        name: "Feedback Request",
        status: "sent",
        sentDate: "Mar 28, 2023",
        recipients: 8765,
        openRate: 18.9,
        clickRate: 8.4,
        conversionRate: 2.1,
        deliveryRate: 97.2,
        bounceRate: 2.8,
        unsubscribeRate: 0.9,
        performance: "poor",
      },
    ]

    setCampaignReports(mockCampaignReports)

    // Set top campaigns (sorted by open rate, only sent or active)
    const sentOrActive = mockCampaignReports.filter((c) => c.status === "sent" || c.status === "active")
    const sorted = [...sentOrActive].sort((a, b) => b.openRate - a.openRate)
    setTopCampaigns(sorted.slice(0, 5))

    setIsLoading(false)
  }, [dateRange])

  // Calculate summary metrics
  const sentCampaigns = campaignReports.filter((c) => c.status === "sent" || c.status === "active")
  const totalRecipients = sentCampaigns.reduce((sum, campaign) => sum + campaign.recipients, 0)
  const avgOpenRate = sentCampaigns.length
    ? sentCampaigns.reduce((sum, campaign) => sum + campaign.openRate, 0) / sentCampaigns.length
    : 0
  const avgClickRate = sentCampaigns.length
    ? sentCampaigns.reduce((sum, campaign) => sum + campaign.clickRate, 0) / sentCampaigns.length
    : 0
  const avgConversionRate = sentCampaigns.length
    ? sentCampaigns.reduce((sum, campaign) => sum + campaign.conversionRate, 0) / sentCampaigns.length
    : 0

  // Define columns for the DataTable
  const columns: Column<CampaignReport>[] = [
    {
      header: "Campaign",
      accessorKey: "name",
      enableSorting: true,
      enableFiltering: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">ID: {row.id}</div>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      enableSorting: true,
      cell: (row) => {
        const statusColors = {
          sent: "bg-green-100 text-green-700",
          draft: "bg-gray-100 text-gray-700",
          scheduled: "bg-blue-100 text-blue-700",
          active: "bg-purple-100 text-purple-700",
        }
        return <Badge className={`${statusColors[row.status]} capitalize`}>{row.status}</Badge>
      },
    },
    {
      header: "Date",
      accessorKey: "sentDate",
      enableSorting: true,
    },
    {
      header: "Recipients",
      accessorKey: "recipients",
      enableSorting: true,
      cell: (row) => row.recipients.toLocaleString(),
    },
    {
      header: "Open Rate",
      accessorKey: "openRate",
      enableSorting: true,
      cell: (row) =>
        row.status === "sent" || row.status === "active" ? (
          <div className="flex items-center gap-2">
            <span>{row.openRate}%</span>
            <Progress value={row.openRate} className="h-2 w-16" />
          </div>
        ) : (
          "-"
        ),
    },
    {
      header: "Click Rate",
      accessorKey: "clickRate",
      enableSorting: true,
      cell: (row) =>
        row.status === "sent" || row.status === "active" ? (
          <div className="flex items-center gap-2">
            <span>{row.clickRate}%</span>
            <Progress value={row.clickRate} className="h-2 w-16" />
          </div>
        ) : (
          "-"
        ),
    },
    {
      header: "Conversion",
      accessorKey: "conversionRate",
      enableSorting: true,
      cell: (row) => (row.status === "sent" || row.status === "active" ? `${row.conversionRate}%` : "-"),
      meta: {
        visibleFrom: "lg",
      },
    },
    {
      header: "Performance",
      accessorKey: "performance",
      enableSorting: true,
      cell: (row) => {
        if (row.status !== "sent" && row.status !== "active") return "-"

        const performanceColors = {
          excellent: "bg-green-100 text-green-700",
          good: "bg-blue-100 text-blue-700",
          average: "bg-yellow-100 text-yellow-700",
          poor: "bg-red-100 text-red-700",
        }
        return <Badge className={`${performanceColors[row.performance]} capitalize`}>{row.performance}</Badge>
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sent Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentCampaigns.length}</div>
            <p className="text-xs text-muted-foreground">During selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecipients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOpenRate.toFixed(1)}%</div>
            <Progress value={avgOpenRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgClickRate.toFixed(1)}%</div>
            <Progress value={avgClickRate} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Top Performing Campaigns</CardTitle>
                <CardDescription>Campaigns with the highest open rates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCampaigns.map((campaign, index) => (
                <div key={campaign.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{campaign.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{campaign.openRate}%</div>
                      <div className="text-xs text-muted-foreground">open rate</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{campaign.clickRate}%</div>
                      <div className="text-xs text-muted-foreground">click rate</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Conversion Metrics</CardTitle>
                <CardDescription>Key performance indicators for sent campaigns</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Open Rate</span>
                  <span className="text-sm font-medium">{avgOpenRate.toFixed(1)}%</span>
                </div>
                <Progress value={avgOpenRate} className="h-2" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Click Rate</span>
                  <span className="text-sm font-medium">{avgClickRate.toFixed(1)}%</span>
                </div>
                <Progress value={avgClickRate} className="h-2" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Conversion Rate</span>
                  <span className="text-sm font-medium">{avgConversionRate.toFixed(1)}%</span>
                </div>
                <Progress value={avgConversionRate} className="h-2" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Delivery Success Rate</span>
                  <span className="text-sm font-medium">
                    {sentCampaigns.length
                      ? (sentCampaigns.reduce((sum, c) => sum + c.deliveryRate, 0) / sentCampaigns.length).toFixed(1)
                      : "0"}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    sentCampaigns.length
                      ? sentCampaigns.reduce((sum, c) => sum + c.deliveryRate, 0) / sentCampaigns.length
                      : 0
                  }
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <DataTable
          data={campaignReports}
          columns={columns}
          title="Campaign Performance"
          description={`Detailed metrics for all campaigns (${dateRange === "30days" ? "Last 30 days" : dateRange === "7days" ? "Last 7 days" : dateRange === "90days" ? "Last 90 days" : "This year"})`}
          searchPlaceholder="Search campaigns..."
          exportFilename="campaign-reports-export"
          initialPageSize={10}
          pageSizeOptions={[5, 10, 20]}
        />
      )}
    </div>
  )
}
