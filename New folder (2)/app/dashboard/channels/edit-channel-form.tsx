"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

interface EditChannelFormProps {
  channel: {
    id: string
    name: string
    description: string
    chat_pic?: string
  }
}

export function EditChannelForm({ channel }: EditChannelFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: channel.name || "",
    description: channel.description || "",
    newsletter_pic: channel.chat_pic || "",
    reactions: "all"
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const channelId = channel.id.split('@')[0]
      const apiUrl = `http://localhost:5000/api/channels/newsletter/${channelId}@newsletter`

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          newsletter_pic: formData.newsletter_pic.trim(),
          reactions: formData.reactions
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update channel')
      }

      toast({
        title: "Success",
        description: "Channel updated successfully",
      })

      router.push("/dashboard/channels")
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => router.back()} className="h-9 w-9 p-0">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold md:text-3xl">Edit Channel</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Channel Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Channel Name
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter channel name"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter channel description"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="newsletter_pic" className="text-sm font-medium">
                Channel Picture URL
              </label>
              <Input
                id="newsletter_pic"
                value={formData.newsletter_pic}
                onChange={(e) => setFormData({ ...formData, newsletter_pic: e.target.value })}
                placeholder="Enter channel picture URL"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 