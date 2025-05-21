"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Plus, Calendar, Mail, Users, BarChart3, RefreshCw, Database, FileText, MessageCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useLanguage } from "@/lib/i18n/language-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { CreateCampaignForm, EditCampaignForm } from "@/components/campaigns/forms"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { hasRole } from "@/services/user.service"
import RoleBase from "@/components/rolebase"

// Update the Campaign type to match the API response
type Campaign = {
  _id: string
  name: string
  description: string
  totalMessages: number
  successfulMessages: number
  failedMessages: number
  successRate: string
  status: "Draft" | "Active" | "Sent"
  openRate: number
  clickRate: number
  results: Array<{
    to: string
    status: string
    response: {
      sent: boolean
      message: {
        id: string
        type: string
        chat_id: string
        timestamp: number
        status: string
        image?: {
          caption: string
          link: string
        }
      }
    }
    _id: string
  }>
  createdAt: string
  __v: number
}

// Add translations
const translations = {
  en: {
    title: "Campaigns",
    description: "Browse and manage your campaigns",
    createCampaign: "Create Campaign",
    fetchCampaigns: "Fetch Campaigns",
    fetching: "Fetching...",
    getData: "Get Data",
    exportPDF: "Export PDF",
    campaignList: "Campaign List",
    showingPage: "Showing page",
    of: "of",
    searchPlaceholder: "Search campaigns...",
    exportFilename: "campaigns-export",
    columns: {
      name: "Campaign Name",
      totalMessages: "Total Messages",
      successRate: "Success Rate",
      successful: "Successful",
      failed: "Failed",
      createdAt: "Created At"
    },
    status: {
      verified: "Verified",
      notVerified: "Not Verified"
    },
    actions: {
      view: "View Details",
      edit: "Edit Campaign",
      delete: "Delete Campaign"
    },
    deleteDialog: {
      title: "Are you sure you want to delete this campaign?",
      description: "This action cannot be undone. This will permanently delete the campaign",
      cancel: "Cancel",
      delete: "Delete Campaign",
      deleting: "Deleting..."
    }
  },
  ar: {
    title: "الحملات",
    description: "تصفح وإدارة حملاتك",
    createCampaign: "إنشاء حملة",
    fetchCampaigns: "جلب الحملات",
    fetching: "جاري الجلب...",
    getData: "الحصول على البيانات",
    exportPDF: "تصدير PDF",
    campaignList: "قائمة الحملات",
    showingPage: "عرض الصفحة",
    of: "من",
    searchPlaceholder: "البحث في الحملات...",
    exportFilename: "تصدير-الحملات",
    columns: {
      name: "اسم الحملة",
      totalMessages: "إجمالي الرسائل",
      successRate: "معدل النجاح",
      successful: "ناجحة",
      failed: "فاشلة",
      createdAt: "تاريخ الإنشاء"
    },
    status: {
      verified: "تم التحقق",
      notVerified: "لم يتم التحقق"
    },
    actions: {
      view: "عرض التفاصيل",
      edit: "تعديل الحملة",
      delete: "حذف الحملة"
    },
    deleteDialog: {
      title: "هل أنت متأكد من حذف هذه الحملة؟",
      description: "لا يمكن التراجع عن هذا الإجراء. سيتم حذف الحملة نهائياً",
      cancel: "إلغاء",
      delete: "حذف الحملة",
      deleting: "جاري الحذف..."
    }
  }
};

export default function CampaignsPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const t = translations[language as keyof typeof translations]

  // Fetch campaign stats
  const fetchCampaignStats = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('http://localhost:5000/api/campaigns/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch campaign stats')
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch campaign statistics",
        variant: "destructive",
      })
    }
  }

  // Fetch campaign list
  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`http://localhost:5000/api/campaigns?page=${currentPage}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns')
      }

      const data = await response.json()
      setCampaigns(data.campaigns || [])
      setTotalPages(Math.ceil(data.total / 10))
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch campaigns",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      await Promise.all([fetchCampaignStats(), fetchCampaigns()])
      setIsLoading(false)
    }
    fetchData()
  }, [currentPage])

  // Calculate campaign statistics
  const totalCampaigns = campaigns.length
  const sentCampaigns = campaigns.filter((campaign) => campaign.status === "Sent").length
  const draftCampaigns = campaigns.filter((campaign) => campaign.status === "Draft").length
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "Active").length

  // Calculate average open and click rates for sent campaigns
  const sentCampaignsData = campaigns.filter((campaign) => campaign.status === "Sent")
  const avgOpenRate = sentCampaignsData.length
    ? sentCampaignsData.reduce((sum, campaign) => sum + campaign.openRate, 0) / sentCampaignsData.length
    : 0
  const avgClickRate = sentCampaignsData.length
    ? sentCampaignsData.reduce((sum, campaign) => sum + campaign.clickRate, 0) / sentCampaignsData.length
    : 0

  // Update PDF export function with translations
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(t.campaignList, 14, 15);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`${t.exportPDF}: ${new Date().toLocaleDateString()}`, 14, 22);

    // Prepare table data
    const tableData = campaigns.map(campaign => [
      campaign.name || 'Unnamed Campaign',
      (campaign.totalMessages || 0).toLocaleString(),
      campaign.successRate || "0%",
      (campaign.successfulMessages || 0).toLocaleString(),
      (campaign.failedMessages || 0).toLocaleString(),
      campaign.createdAt ? new Date(campaign.createdAt).toLocaleString() : 'N/A'
    ]);

    // Add table using autoTable
    autoTable(doc, {
      head: [[
        t.columns.name,
        t.columns.totalMessages,
        t.columns.successRate,
        t.columns.successful,
        t.columns.failed,
        t.columns.createdAt
      ]],
      body: tableData,
      startY: 30,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Save the PDF
    doc.save(`${t.exportFilename}.pdf`);
  };

  // Define columns for the DataTable
  const columns: Column<Campaign>[] = [
    {
      header: t.columns.name,
      accessorKey: "name",
      enableSorting: true,
      enableFiltering: true,
      cell: (row) => row.name || 'Unnamed Campaign',
    },
    {
      header: t.columns.totalMessages,
      accessorKey: "totalMessages",
      enableSorting: true,
      cell: (row) => (row.totalMessages || 0).toLocaleString(),
    },
    {
      header: t.columns.successRate,
      accessorKey: "successRate",
      enableSorting: true,
      cell: (row) => (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          row.successRate === "100%" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
        }`}>
          {row.successRate || "0%"}
        </span>
      ),
    },
    {
      header: t.columns.successful,
      accessorKey: "successfulMessages",
      enableSorting: true,
      cell: (row) => (
        <span className="text-green-600">{(row.successfulMessages || 0).toLocaleString()}</span>
      ),
    },
    {
      header: t.columns.failed,
      accessorKey: "failedMessages",
      enableSorting: true,
      cell: (row) => (
        <span className="text-red-600">{(row.failedMessages || 0).toLocaleString()}</span>
      ),
    },
    {
      header: t.columns.createdAt,
      accessorKey: "createdAt",
      enableSorting: true,
      cell: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : 'N/A',
    }
  ]

  // Add prefetching for routes
  useEffect(() => {
    router.prefetch('/dashboard/campaigns/single-whatsapp')
    router.prefetch('/dashboard/campaigns/bulk-whatsapp')
  }, [router])

  // Optimize navigation
  const handleNavigation = (path: string) => {
    setIsNavigating(true)
    router.push(path)
  }

  return (
    <div>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Campaigns</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{t.title}</h1>
            <p className="text-muted-foreground">{t.description}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => handleNavigation('/dashboard/campaigns/single-whatsapp')}
              disabled={isNavigating}
            >
              <MessageCircle className="mr-2 h-4 w-4" /> 
              {isNavigating ? 'Loading...' : 'Single WhatsApp'}
            </Button>
            {hasRole(["superadmin", "manager"]) && (
              <Button 
                onClick={() => handleNavigation('/dashboard/campaigns/bulk-whatsapp')}
                disabled={isNavigating}
              >
                <Users className="mr-2 h-4 w-4" /> 
                {isNavigating ? 'Loading...' : 'Bulk WhatsApp'}
              </Button>
            )}
            <Button variant="outline" onClick={exportToPDF}>
              <FileText className="mr-2 h-4 w-4" /> {t.exportPDF}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCampaigns || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total number of campaigns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalMessages?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalSuccessful || 0} successful, {stats?.totalFailed || 0} failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.averageSuccessRate?.toFixed(1) || 0}%</div>
              <Progress value={stats?.averageSuccessRate || 0} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Failed Messages</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalFailed?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                {((stats?.totalFailed / stats?.totalMessages) * 100 || 0).toFixed(1)}% of total messages
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Campaign Statistics Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Campaign Metrics</h3>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Campaigns</span>
                    <span className="font-medium">{stats?.totalCampaigns || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Messages</span>
                    <span className="font-medium">{stats?.totalMessages?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Message Status</h3>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Successful Messages</span>
                    <span className="font-medium text-green-600">{stats?.totalSuccessful?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Failed Messages</span>
                    <span className="font-medium text-red-600">{stats?.totalFailed?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Performance</h3>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-medium">{stats?.averageSuccessRate?.toFixed(2) || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Failure Rate</span>
                    <span className="font-medium">
                      {((stats?.totalFailed / stats?.totalMessages) * 100 || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Message Success Distribution</span>
                  <span className="text-muted-foreground">
                    {stats?.totalSuccessful?.toLocaleString() || 0} / {stats?.totalMessages?.toLocaleString() || 0}
                  </span>
                </div>
                <Progress 
                  value={(stats?.totalSuccessful / stats?.totalMessages) * 100 || 0} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground">Manage your marketing campaigns</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <DataTable
            data={campaigns}
            columns={columns}
            title={t.campaignList}
            description={`${t.showingPage} ${currentPage} ${t.of} ${totalPages}`}
            searchPlaceholder={t.searchPlaceholder}
            exportFilename={t.exportFilename}
            initialPageSize={10}
            pageSizeOptions={[5, 10, 20]}
          />
        )}

        <CreateCampaignForm open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        {selectedCampaign && (
          <EditCampaignForm
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            campaignId={selectedCampaign._id}
            initialData={{
              name: selectedCampaign.name,
              description: selectedCampaign.description,
            }}
          />
        )}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.deleteDialog.description}
                {campaignToDelete && ` "${campaignToDelete.name}"`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t.deleteDialog.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setIsDeleting(true)
                  // Implement the delete logic here
                }}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
              >
                {isDeleting ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin">⟳</span> {t.deleteDialog.deleting}
                  </>
                ) : (
                  t.deleteDialog.delete
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
