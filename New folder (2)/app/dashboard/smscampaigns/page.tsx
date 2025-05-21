"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/ui/data-table"
import { MessageSquare, Plus, RefreshCw, Eye, Edit, Trash2, Send, Upload, FileDown, Image, LayoutGrid } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useRouter } from "next/navigation"
import { hasRole } from "@/services/user.service"

// Define the SMSCampaign type based on the actual API response
type SMSCampaign = {
  _id: string;
  to: string;
  from: string;
  channel: 'rcs' | 'sms';
  content: {
    contentType: 'text';
    text: string;
  };
  messageId: string;
  status: 'sent' | 'failed' | 'pending';
  createdAt: string;
  updatedAt: string;
}

type PaginationInfo = {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function SMSCampaignsPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { toast } = useToast()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<SMSCampaign | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [smsForm, setSmsForm] = useState({
    to: "",
    from: "bab_agent_kvm3opdx_agent",
    channel: "rcs",
    content: {
      contentType: "text",
      text: ""
    }
  })
  const [isBulkSendDialogOpen, setIsBulkSendDialogOpen] = useState(false)
  const [isBulkSending, setIsBulkSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [bulkSendHistory, setBulkSendHistory] = useState<{
    timestamp: string;
    fileName: string;
    status: 'success' | 'error';
    message: string;
  }[]>([])
  const [isSendMediaDialogOpen, setIsSendMediaDialogOpen] = useState(false)
  const [isSendingMedia, setIsSendingMedia] = useState(false)
  const [mediaForm, setMediaForm] = useState({
    to: "",
    from: "bab_agent_kvm3opdx_agent",
    channel: "rcs",
    mediaUrl: ""
  })
  const [isSendRichCardsDialogOpen, setIsSendRichCardsDialogOpen] = useState(false)
  const [isSendingRichCards, setIsSendingRichCards] = useState(false)
  const [richCardsFile, setRichCardsFile] = useState<File | null>(null)

  const fetchCampaigns = async () => {
    setIsFetching(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("You must be logged in to view campaigns.")
      }

      const response = await fetch('http://localhost:5000/api/sms/campaigns?limit=1000', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to fetch campaigns.")
      }

      const { data } = await response.json()
      
      setCampaigns(data.campaigns)
      setPagination(data.pagination)
      setError(null)
      
      toast({
        title: "Campaigns Fetched",
        description: `Successfully fetched ${data.campaigns.length} campaigns.`,
      })
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch campaigns."
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      setCampaigns([])
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  const fetchCampaignDetails = async (campaignId: string) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("You must be logged in to view campaign details.")
      }

      const response = await fetch(`http://localhost:5000/api/sms/campaigns/${campaignId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to fetch campaign details.")
      }

      const { data } = await response.json()
      
      // Transform the data to match our SMSCampaign type
      const campaignDetails: SMSCampaign = {
        _id: data._id || data.id,
        to: data.to || '',
        from: data.from || '',
        channel: data.channel || 'rcs',
        content: {
          contentType: 'text',
          text: data.content?.text || ''
        },
        messageId: data.messageId || '',
        status: data.status || 'pending',
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
      }

      setSelectedCampaign(campaignDetails)
      setIsViewDialogOpen(true)
    } catch (error) {
      console.error('Error fetching campaign details:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch campaign details."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleSendSMS = async () => {
    setIsSending(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("You must be logged in to send SMS.")
      }

      const response = await fetch('http://localhost:5000/api/sms/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(smsForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to send SMS.")
      }

      const data = await response.json()
      
      toast({
        title: "SMS Sent",
        description: "Message sent successfully.",
      })

      // Reset form
      setSmsForm({
        to: "",
        from: "bab_agent_kvm3opdx_agent",
        channel: "rcs",
        content: {
          contentType: "text",
          text: ""
        }
      })
      setIsSendDialogOpen(false)
    } catch (error) {
      console.error('Error sending SMS:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to send SMS."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleExportPDF = () => {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('Failed to open print window')
      }

      // Create the HTML content for the PDF
      const content = `
        <html>
          <head>
            <title>SMS Campaigns Report</title>
            <style>
              body { font-family: Arial, sans-serif; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .header { text-align: center; margin-bottom: 20px; }
              .timestamp { color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>SMS Campaigns Report</h1>
              <p class="timestamp">Generated on: ${new Date().toLocaleString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>To</th>
                  <th>From</th>
                  <th>Channel</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                ${campaigns.map(campaign => `
                  <tr>
                    <td>${campaign.to}</td>
                    <td>${campaign.from}</td>
                    <td>${campaign.channel.toUpperCase()}</td>
                    <td>${campaign.content.text}</td>
                    <td>${campaign.status}</td>
                    <td>${new Date(campaign.createdAt).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `

      // Write the content to the new window
      printWindow.document.write(content)
      printWindow.document.close()

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print()
        // Close the window after printing
        printWindow.onafterprint = () => {
          printWindow.close()
        }
      }
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast({
        title: "Error",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBulkSend = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    setIsBulkSending(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("You must be logged in to send bulk messages.")
      }

      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('http://localhost:5000/api/sms/sends', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to send bulk messages.")
      }

      // Add to history
      setBulkSendHistory(prev => [{
        timestamp: new Date().toISOString(),
        fileName: selectedFile.name,
        status: 'success',
        message: 'Bulk messages sent successfully'
      }, ...prev])

      toast({
        title: "Success",
        description: "Bulk messages sent successfully.",
      })

      // Reset form and close dialog
      setSelectedFile(null)
      setIsBulkSendDialogOpen(false)
      
      // Refresh the campaigns list
      fetchCampaigns()
    } catch (error) {
      console.error('Error sending bulk messages:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to send bulk messages."
      
      // Add error to history
      setBulkSendHistory(prev => [{
        timestamp: new Date().toISOString(),
        fileName: selectedFile?.name || 'Unknown file',
        status: 'error',
        message: errorMessage
      }, ...prev])

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsBulkSending(false)
    }
  }

  const handleSendMedia = async () => {
    setIsSendingMedia(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("You must be logged in to send media messages.")
      }

      const response = await fetch('http://localhost:5000/api/sms/sendmedia', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(mediaForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to send media message.")
      }

      const data = await response.json()
      
      toast({
        title: "Media Message Sent",
        description: "Message sent successfully.",
      })

      // Reset form
      setMediaForm({
        to: "",
        from: "bab_agent_kvm3opdx_agent",
        channel: "rcs",
        mediaUrl: ""
      })
      setIsSendMediaDialogOpen(false)
    } catch (error) {
      console.error('Error sending media message:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to send media message."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSendingMedia(false)
    }
  }

  const handleSendRichCards = async () => {
    if (!richCardsFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    setIsSendingRichCards(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("You must be logged in to send rich cards.")
      }

      const formData = new FormData()
      formData.append('file', richCardsFile)

      const response = await fetch('http://localhost:5000/api/sms/sendrichcards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to send rich cards.")
      }

      toast({
        title: "Success",
        description: "Rich cards sent successfully.",
      })

      // Reset form and close dialog
      setRichCardsFile(null)
      setIsSendRichCardsDialogOpen(false)
      
      // Refresh the campaigns list
      fetchCampaigns()
    } catch (error) {
      console.error('Error sending rich cards:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to send rich cards."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSendingRichCards(false)
    }
  }

  // Check user role and access on component mount
  useEffect(() => {
    const checkUserAccess = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          router.push("/login")
          return
        }

        // Get user role from localStorage or API
        const userData = localStorage.getItem("user")
        if (userData) {
          const { role } = JSON.parse(userData)
          setUserRole(role)
        }

        // Fetch campaigns after role check
        await fetchCampaigns()
      } catch (error) {
        console.error("Error checking user access:", error)
        router.push("/login")
      }
    }

    checkUserAccess()
  }, [router])

  // Helper function to check if button should be visible
  const shouldShowButton = (buttonType: string) => {
    if (!userRole) return false

    switch (buttonType) {
      case "bulkSend":
      case "richCards":
      case "bulkWhatsApp":
        return userRole === "superadmin" || userRole === "manager"
      default:
        return true
    }
  }

  // Update columns definition to show more data
  const columns: Column<SMSCampaign>[] = [
    {
      header: "To",
      accessorKey: "to",
      enableSorting: true,
      enableFiltering: true,
    },
    {
      header: "From",
      accessorKey: "from",
      enableSorting: true,
      enableFiltering: true,
    },
    {
      header: "Channel",
      accessorKey: "channel",
      enableSorting: true,
      cell: (row) => (
        <Badge className="bg-blue-100 text-blue-700">
          {row.channel.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Message",
      accessorKey: "content",
      enableSorting: true,
      cell: (row) => (
        <div className="max-w-[300px] truncate" title={row.content.text}>
          {row.content.text}
        </div>
      ),
    },
    {
      header: "Message ID",
      accessorKey: "messageId",
      enableSorting: true,
      cell: (row) => (
        <div className="max-w-[200px] truncate" title={row.messageId}>
          {row.messageId}
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
          failed: "bg-red-100 text-red-700",
          pending: "bg-yellow-100 text-yellow-700"
        }
        return (
          <Badge className={statusColors[row.status]}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        )
      },
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      enableSorting: true,
      cell: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      header: "Updated At",
      accessorKey: "updatedAt",
      enableSorting: true,
      cell: (row) => new Date(row.updatedAt).toLocaleString(),
    },
    {
      header: "Actions",
      accessorKey: "_id",
      enableSorting: false,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchCampaignDetails(row._id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>SMS Campaigns</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">SMS Campaigns</h1>
            <p className="text-muted-foreground">Manage your SMS campaigns</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="mr-2 h-4 w-4" /> Send SMS
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Send SMS</DialogTitle>
                  <DialogDescription>
                    Send a new SMS message to a recipient.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="to" className="text-right">
                      To
                    </Label>
                    <Input
                      id="to"
                      value={smsForm.to}
                      onChange={(e) => setSmsForm({ ...smsForm, to: e.target.value })}
                      placeholder="966505677664"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="from" className="text-right">
                      From
                    </Label>
                    <Input
                      id="from"
                      value={smsForm.from}
                      onChange={(e) => setSmsForm({ ...smsForm, from: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="channel" className="text-right">
                      Channel
                    </Label>
                    <Select
                      value={smsForm.channel}
                      onValueChange={(value) => setSmsForm({ ...smsForm, channel: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rcs">RCS</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="message" className="text-right">
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      value={smsForm.content.text}
                      onChange={(e) => setSmsForm({
                        ...smsForm,
                        content: { ...smsForm.content, text: e.target.value }
                      })}
                      className="col-span-3"
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={handleSendSMS}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin">⟳</span> Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {shouldShowButton("bulkSend") && (
              <Dialog open={isBulkSendDialogOpen} onOpenChange={setIsBulkSendDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Upload className="mr-2 h-4 w-4" /> Bulk Send
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Bulk Send Messages</DialogTitle>
                    <DialogDescription>
                      Upload a file containing multiple messages to send.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="file" className="text-right">
                          File
                        </Label>
                        <div className="col-span-3">
                          <Input
                            id="file"
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            accept=".csv,.xlsx,.xls"
                            className="cursor-pointer"
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Supported formats: CSV, Excel
                          </p>
                        </div>
                      </div>
                      {selectedFile && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <div className="text-right text-sm font-medium">Selected File:</div>
                          <div className="col-span-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{selectedFile.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(selectedFile.size / 1024).toFixed(2)} KB)
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Send History</h4>
                      <ScrollArea className="h-[200px] rounded-md border p-4">
                        {bulkSendHistory.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No send history yet
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {bulkSendHistory.map((item, index) => (
                              <div key={index} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{item.fileName}</span>
                                  <span className={cn(
                                    "text-xs px-2 py-1 rounded-full",
                                    item.status === 'success' 
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  )}>
                                    {item.status === 'success' ? 'Success' : 'Error'}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{item.message}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(item.timestamp).toLocaleString()}
                                </p>
                                {index < bulkSendHistory.length - 1 && <Separator className="my-2" />}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      onClick={handleBulkSend}
                      disabled={isBulkSending || !selectedFile}
                    >
                      {isBulkSending ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin">⟳</span> Sending...
                        </>
                      ) : (
                        "Send Messages"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={isSendMediaDialogOpen} onOpenChange={setIsSendMediaDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <Image className="mr-2 h-4 w-4" /> Send Media
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Send Media Message</DialogTitle>
                  <DialogDescription>
                    Send a media message to a recipient.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="media-to" className="text-right">
                      To
                    </Label>
                    <Input
                      id="media-to"
                      value={mediaForm.to}
                      onChange={(e) => setMediaForm({ ...mediaForm, to: e.target.value })}
                      placeholder="966505677664"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="media-from" className="text-right">
                      From
                    </Label>
                    <Input
                      id="media-from"
                      value={mediaForm.from}
                      onChange={(e) => setMediaForm({ ...mediaForm, from: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="media-channel" className="text-right">
                      Channel
                    </Label>
                    <Select
                      value={mediaForm.channel}
                      onValueChange={(value) => setMediaForm({ ...mediaForm, channel: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rcs">RCS</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="media-url" className="text-right">
                      Media URL
                    </Label>
                    <Input
                      id="media-url"
                      value={mediaForm.mediaUrl}
                      onChange={(e) => setMediaForm({ ...mediaForm, mediaUrl: e.target.value })}
                      placeholder="https://example.com/media.jpg"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={handleSendMedia}
                    disabled={isSendingMedia}
                  >
                    {isSendingMedia ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin">⟳</span> Sending...
                      </>
                    ) : (
                      "Send Media Message"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {shouldShowButton("richCards") && (
              <Dialog open={isSendRichCardsDialogOpen} onOpenChange={setIsSendRichCardsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <LayoutGrid className="mr-2 h-4 w-4" /> Send Rich Cards
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Send Rich Cards</DialogTitle>
                    <DialogDescription>
                      Upload a file containing rich cards to send.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="rich-cards-file" className="text-right">
                        File
                      </Label>
                      <div className="col-span-3">
                        <Input
                          id="rich-cards-file"
                          type="file"
                          onChange={(e) => setRichCardsFile(e.target.files?.[0] || null)}
                          accept=".json,.xml"
                          className="cursor-pointer"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Supported formats: JSON, XML
                        </p>
                      </div>
                    </div>
                    {richCardsFile && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <div className="text-right text-sm font-medium">Selected File:</div>
                        <div className="col-span-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{richCardsFile.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(richCardsFile.size / 1024).toFixed(2)} KB)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      onClick={handleSendRichCards}
                      disabled={isSendingRichCards || !richCardsFile}
                    >
                      {isSendingRichCards ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin">⟳</span> Sending...
                        </>
                      ) : (
                        "Send Rich Cards"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Button variant="outline" onClick={handleExportPDF}>
              <FileDown className="mr-2 h-4 w-4" /> Export PDF
            </Button>

            <Button variant="outline" onClick={fetchCampaigns} disabled={isFetching}>
              {isFetching ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Fetching...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <DataTable
            data={campaigns}
            columns={columns}
            title="SMS Campaigns"
            description="View and manage all SMS campaigns"
            searchPlaceholder="Search campaigns..."
            exportFilename="sms-campaigns-export"
            initialPageSize={10}
            pageSizeOptions={[5, 10, 20, 30, 60, 100]}
          />
        )}

        {/* View Campaign Dialog */}
        <AlertDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Campaign Details</AlertDialogTitle>
            </AlertDialogHeader>
            {selectedCampaign ? (
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">To</p>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.to}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">From</p>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.from}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Channel</p>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.channel.toUpperCase()}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.status}</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <p className="text-sm font-medium">Message</p>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.content.text}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Message ID</p>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.messageId}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Created At</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedCampaign.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4">No campaign details available.</p>
            )}
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsViewDialogOpen(false)}>
                Close
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
} 