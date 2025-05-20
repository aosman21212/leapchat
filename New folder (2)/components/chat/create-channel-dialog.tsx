"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/i18n/language-context"

// Add translations
const translations = {
  en: {
    title: "Create Channel",
    description: "Create a new channel for your team to communicate.",
    name: "Channel Name",
    description: "Channel Description",
    submit: "Create Channel",
    cancel: "Cancel",
    success: "Channel created successfully",
    error: "Failed to create channel"
  },
  ar: {
    title: "إنشاء قناة",
    description: "إنشاء قناة جديدة لفريقك للتواصل.",
    name: "اسم القناة",
    description: "وصف القناة",
    submit: "إنشاء القناة",
    cancel: "إلغاء",
    success: "تم إنشاء القناة بنجاح",
    error: "فشل في إنشاء القناة"
  }
}

interface CreateChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChannelCreated: () => void
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  onChannelCreated,
}: CreateChannelDialogProps) {
  const { language } = useLanguage()
  const t = translations[language as keyof typeof translations]
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch("http://localhost:5000/api/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to create channel")
      }

      toast({
        title: "Success",
        description: t.success,
      })
      onChannelCreated()
      onOpenChange(false)
      setFormData({ name: "", description: "" })
    } catch (error) {
      toast({
        title: "Error",
        description: t.error,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t.name}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t.description}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : t.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 