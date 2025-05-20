"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Calendar,
  LinkIcon,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Share2,
  BarChart3,
  FileText,
} from "lucide-react"

// Define the Channel type
type Channel = {
  id: string
  name: string
  type: string
  description: string
  chat_pic: string
  chat_pic_full: string
  created_at: number
  invite_code: string
  verification: boolean
  description_at: string
  preview: string
  role: string
  updatedAt: string
}

export default function ChannelDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  // Extract the ID from the URL params
  const channelId = Array.isArray(params.id) ? params.id[0] : params.id

  useEffect(() => {
    async function loadChannelDetails() {
      setIsLoading(true)
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No authentication token found. Please login again.")
        }

        // Use the full channel ID including @newsletter suffix
        const fullChannelId = channelId?.includes('@') ? channelId : `${channelId}@newsletter`
        const apiUrl = `http://localhost:5000/api/channels/${fullChannelId}`
        console.log('Fetching channel details from:', apiUrl)

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${token}`
          }
        })

        console.log('Response status:', response.status)
        console.log('Response headers:', Object.fromEntries(response.headers.entries()))

        let responseText
        try {
          responseText = await response.text()
          console.log('Raw response:', responseText)
        } catch (textError) {
          console.error('Error reading response:', textError)
          throw new Error("Failed to read server response")
        }

        if (!responseText) {
          throw new Error("Empty response from server")
        }

        let data
        try {
          data = JSON.parse(responseText)
          console.log('Parsed response data:', data)
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError)
          throw new Error("Invalid response format from server")
        }

        if (!response.ok) {
          const errorMessage = data?.message || `Server error: ${response.status}`
          throw new Error(errorMessage)
        }

        if (!data.success) {
          throw new Error(data.message || "Failed to fetch channel details")
        }

        if (!data.data) {
          throw new Error("No channel data received from server")
        }

        // Map the API response to our Channel type
        const channelData: Channel = {
          id: data.data.id,
          name: data.data.name,
          type: data.data.type,
          description: data.data.description,
          chat_pic: data.data.chat_pic,
          chat_pic_full: data.data.chat_pic_full,
          created_at: data.data.created_at,
          invite_code: data.data.invite_code,
          verification: data.data.verification,
          description_at: data.data.description_at,
          preview: data.data.preview,
          role: data.data.role,
          updatedAt: data.data.updatedAt
        }

        console.log('Setting channel data:', channelData)
        setChannel(channelData)
      } catch (error) {
        console.error("Error loading channel details:", {
          error,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined
        })
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : "An unexpected error occurred while fetching channel details"
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (channelId) {
      loadChannelDetails()
    } else {
      console.error('No channel ID provided')
      toast({
        title: "Error",
        description: "No channel ID provided",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }, [channelId, toast])

  // Function to format Unix timestamp
  const formatDate = (timestamp: number | string) => {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp * 1000)
      return format(date, "MMMM d, yyyy 'at' h:mm a")
    } catch (error) {
      return "Invalid date"
    }
  }

  // Function to extract ID from the newsletter ID
  const extractId = (fullId: string) => {
    return fullId // Return the full ID including @newsletter suffix
  }

  // Function to navigate to edit page
  const handleEditChannel = () => {
    router.push(`/dashboard/channels/edit/${extractId(channel?.id || "")}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Channels
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Channel Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The channel you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => router.push("/dashboard/channels")}>View All Channels</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.back()} className="h-9 w-9 p-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl">Channel Details</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {channel.role === "owner" && (
            <>
              <Button variant="outline" className="gap-2" onClick={handleEditChannel}>
                <Edit className="h-4 w-4" /> Edit
              </Button>
              <Button variant="outline" className="gap-2 text-red-600 hover:text-red-600">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </>
          )}
          {extractId(channel.id) !== "120363163421601923" && (
            <>
              <Button variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button className="gap-2">
                <MessageSquare className="h-4 w-4" /> Send Message
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-start gap-4 pb-2">
            <div className="relative h-16 w-16 overflow-hidden rounded-lg">
              {channel.chat_pic ? (
                <Image src={channel.chat_pic || "/placeholder.svg"} alt={channel.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{channel.name}</CardTitle>
                {channel.verification && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                    <CheckCircle className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="capitalize">
                    {channel.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Created {formatDate(channel.created_at)}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Description</h3>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{channel.description}</p>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-medium">Channel Information</h3>
                    <dl className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">ID:</dt>
                        <dd className="font-mono text-sm">{extractId(channel.id)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Type:</dt>
                        <dd className="capitalize">{channel.type}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Created:</dt>
                        <dd>{formatDate(channel.created_at)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Last Updated:</dt>
                        <dd>{formatDate(channel.updatedAt)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Description Updated:</dt>
                        <dd>{formatDate(channel.description_at)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Verification:</dt>
                        <dd className="flex items-center">
                          {channel.verification ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="mr-1 h-4 w-4" /> Verified
                            </span>
                          ) : (
                            <span className="flex items-center text-gray-500">
                              <XCircle className="mr-1 h-4 w-4" /> Not Verified
                            </span>
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Your Role:</dt>
                        <dd>
                          <Badge className={channel.role === "owner" ? "bg-primary" : "bg-blue-500"}>
                            {channel.role}
                          </Badge>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {extractId(channel.id) !== "120363163421601923" && (
                    <div>
                      <h3 className="text-lg font-medium">Invite Information</h3>
                      <dl className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Invite Code:</dt>
                          <dd className="font-mono text-sm">{channel.invite_code}</dd>
                        </div>
                        <div className="mt-4">
                          <Button variant="outline" className="w-full gap-2">
                            <LinkIcon className="h-4 w-4" /> Copy Invite Link
                          </Button>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="messages" className="mt-6">
                <div className="rounded-md border">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Messages</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">View and manage messages sent in this channel</p>
                  </div>

                  <div className="p-8 flex flex-col items-center justify-center text-center border-t">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Message History</h3>
                    <p className="text-muted-foreground mb-4">
                      Message history is available through the API or in the full application.
                    </p>
                    <Button variant="outline">View API Documentation</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <div className="rounded-md border">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Channel Analytics</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Performance metrics and channel analytics</p>
                  </div>

                  <div className="p-8 flex flex-col items-center justify-center text-center border-t">
                    <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
                    <p className="text-muted-foreground mb-4">
                      Detailed analytics are available in the full application.
                    </p>
                    <Button variant="outline">View Full Analytics</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Channel Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="font-medium">{formatDate(channel.created_at)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Updated</span>
                    <span className="font-medium">{formatDate(channel.updatedAt)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Description Updated</span>
                    <span className="font-medium">{formatDate(channel.description_at)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Verification Status</span>
                    <Badge className={channel.verification ? "bg-green-500" : "bg-gray-500"}>
                      {channel.verification ? "Verified" : "Not Verified"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Role</span>
                    <Badge variant="outline" className="capitalize">
                      {channel.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {extractId(channel.id) !== "120363163421601923" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="mr-2 h-4 w-4" /> Send Message
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Share2 className="mr-2 h-4 w-4" /> Share Channel
                </Button>
                {channel.role === "owner" && (
                  <>
                    <Button variant="outline" className="w-full justify-start" onClick={handleEditChannel}>
                      <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Channel
                    </Button>
                  </>
                )}
                {channel.role !== "owner" && (
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-600">
                    <Users className="mr-2 h-4 w-4" /> Unsubscribe
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
