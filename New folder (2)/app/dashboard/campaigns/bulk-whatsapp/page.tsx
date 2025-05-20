"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { MessageCircleMore, Download, Loader2, CheckCircle2 } from "lucide-react"

interface MessageStatus {
  phoneNumber: string;
  name: string;
  status: 'success' | 'failed';
  timestamp: string;
}

export default function BulkWhatsAppPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [campaignName, setCampaignName] = useState("")
  const [messageHistory, setMessageHistory] = useState<MessageStatus[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      toast({
        title: "File Selected",
        description: "You can now send the messages.",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Please log in to send messages")
      }

      if (!file) {
        throw new Error("Please select a file to upload")
      }

      if (!campaignName.trim()) {
        throw new Error("Please enter a campaign name")
      }

      // Create FormData and append file and campaign name
      const formData = new FormData()
      formData.append("file", file)
      formData.append("campaignName", campaignName.trim())

      const response = await fetch("http://localhost:5000/api/bulk-message/bulk", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to send messages. Please check your file format.")
      }

      const data = await response.json()
      
      // Update message history with only successful messages
      if (data.results) {
        const successfulMessages = data.results
          .filter((result: any) => result.status === 'success')
          .map((result: any) => ({
            phoneNumber: result.phoneNumber,
            name: result.name,
            status: 'success',
            timestamp: new Date().toLocaleString()
          }))
        setMessageHistory(prev => [...successfulMessages, ...prev])
      }
      
      toast({
        title: "Success",
        description: "All messages have been sent",
      })

      // Reset form
      setFile(null)
      setCampaignName("")
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
      
    } catch (error) {
      console.error("Error sending messages:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send messages. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadTemplate = () => {
    // Create a CSV template with headers and example data
    const template = `to,message,media
1234567890,"Hello, world!","https://example.com/image.jpg"
9876543210,"Another message",""`
    const blob = new Blob([template], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "whatsapp_contacts_template.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bulk WhatsApp Channel</h1>
          <p className="text-muted-foreground">Send WhatsApp messages to multiple recipients</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Send Bulk WhatsApp Messages</CardTitle>
            <CardDescription>
              Upload a CSV file with phone numbers and send messages to all recipients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Contact List (CSV)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadTemplate}
                    className="whitespace-nowrap"
                    disabled={isLoading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file with phone numbers and names. Download the template for the correct format.
                </p>
              </div>

              <Button type="submit" disabled={isLoading || !file || !campaignName.trim()} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Messages...
                  </>
                ) : (
                  <>
                    <MessageCircleMore className="mr-2 h-4 w-4" />
                    Send Bulk Messages
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Successful Messages</CardTitle>
            <CardDescription>
              {messageHistory.length} messages sent successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {messageHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No messages sent yet
                </p>
              ) : (
                <div className="space-y-2">
                  {messageHistory.map((message, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted"
                    >
                      <div>
                        <p className="font-medium">{message.name}</p>
                        <p className="text-sm text-muted-foreground">{message.phoneNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">{message.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 