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
    create: {
      title: "Create Campaign",
      description: "Create a new campaign to send messages to your audience.",
      name: "Campaign Name",
      description: "Campaign Description",
      submit: "Create Campaign",
      cancel: "Cancel",
      success: "Campaign created successfully",
      error: "Failed to create campaign"
    },
    edit: {
      title: "Edit Campaign",
      description: "Edit your campaign details.",
      name: "Campaign Name",
      description: "Campaign Description",
      submit: "Save Changes",
      cancel: "Cancel",
      success: "Campaign updated successfully",
      error: "Failed to update campaign"
    }
  },
  ar: {
    create: {
      title: "إنشاء حملة",
      description: "إنشاء حملة جديدة لإرسال الرسائل إلى جمهورك.",
      name: "اسم الحملة",
      description: "وصف الحملة",
      submit: "إنشاء الحملة",
      cancel: "إلغاء",
      success: "تم إنشاء الحملة بنجاح",
      error: "فشل في إنشاء الحملة"
    },
    edit: {
      title: "تعديل الحملة",
      description: "تعديل تفاصيل حملتك.",
      name: "اسم الحملة",
      description: "وصف الحملة",
      submit: "حفظ التغييرات",
      cancel: "إلغاء",
      success: "تم تحديث الحملة بنجاح",
      error: "فشل في تحديث الحملة"
    }
  }
}

interface FormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId?: string
  initialData?: {
    name: string
    description: string
  }
}

export function CreateCampaignForm({ open, onOpenChange }: FormProps) {
  const { language } = useLanguage()
  const t = translations[language as keyof typeof translations].create
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

      const response = await fetch("http://localhost:5000/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to create campaign")
      }

      toast({
        title: "Success",
        description: t.success,
      })
      onOpenChange(false)
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

export function EditCampaignForm({ open, onOpenChange, campaignId, initialData }: FormProps) {
  const { language } = useLanguage()
  const t = translations[language as keyof typeof translations].edit
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch(`http://localhost:5000/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to update campaign")
      }

      toast({
        title: "Success",
        description: t.success,
      })
      onOpenChange(false)
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
              {isLoading ? "Saving..." : t.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 