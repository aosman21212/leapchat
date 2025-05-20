"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { EditChannelForm } from "../../edit-channel-form"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function EditChannelPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [channel, setChannel] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadChannel = async () => {
      try {
        const channelId = Array.isArray(params.id) ? params.id[0] : params.id
        console.log('Raw channel ID from params:', channelId)
        
        if (!channelId) {
          throw new Error("No channel ID provided")
        }

        const token = localStorage.getItem("token")
        console.log('Token available:', !!token)
        
        if (!token) {
          throw new Error("No authentication token found. Please login first.")
        }

        // Use the correct API endpoint path
        const apiUrl = `http://localhost:5000/api/channels/${channelId}`
        console.log('Fetching channel from URL:', apiUrl)

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${token}`
          }
        })

        console.log('Response status:', response.status)
        const responseText = await response.text()
        console.log('Raw response:', responseText)

        let data
        try {
          data = JSON.parse(responseText)
          console.log('Parsed response data:', data)
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError)
          throw new Error('Invalid JSON response from server')
        }

        if (!response.ok) {
          throw new Error(data.message || `Failed to fetch channel: ${response.status}`)
        }

        if (!data.success) {
          throw new Error(data.message || "Failed to fetch channel")
        }

        if (!data.data) {
          throw new Error("No channel data in response")
        }

        console.log('Setting channel data:', data.data)
        setChannel(data.data)
      } catch (error) {
        console.error('Error loading channel:', error)
        const errorMessage = error instanceof Error ? error.message : "Failed to load channel"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
        router.push("/dashboard/channels")
      } finally {
        setIsLoading(false)
      }
    }

    loadChannel()
  }, [params.id, router, toast])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!channel) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <h2 className="text-2xl font-bold mb-2">Channel Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The channel you're trying to edit doesn't exist or you don't have access to it.
          </p>
          <Button variant="outline" onClick={() => router.push("/dashboard/channels")}>
            Back to Channels
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Log the channel data before rendering the form
  console.log('Rendering form with channel data:', channel)

  return (
    <div className="container mx-auto py-6">
      <EditChannelForm channel={channel} />
    </div>
  )
} 