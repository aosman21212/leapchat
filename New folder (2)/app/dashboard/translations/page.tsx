"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useLanguage } from "@/lib/i18n/language-context"
import { getTranslation, translations, type Language } from "@/lib/i18n/translations"
import { updateTranslationsFile, importTranslations } from "@/lib/i18n/actions"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Download, Plus, X, Check, RefreshCw, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { DataTable, type Column } from "@/components/ui/data-table"

type TranslationEntry = {
  key: string
  en: string
  ar: string
  isEditing?: boolean
  isDirty?: boolean
  tempEn?: string
  tempAr?: string
}

export default function TranslationsPage() {
  const { language, dir } = useLanguage()
  const [translationEntries, setTranslationEntries] = useState<TranslationEntry[]>([])
  const [activeTab, setActiveTab] = useState<"all" | "missing" | "edited">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editedCount, setEditedCount] = useState(0)
  const [missingCount, setMissingCount] = useState(0)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load translations
  useEffect(() => {
    const loadTranslations = () => {
      setIsLoading(true)
      try {
        // Convert translations object to array of entries
        const entries: TranslationEntry[] = []
        const keys = new Set<string>()

        // Get all keys from both languages
        Object.keys(translations.en).forEach((key) => keys.add(key))
        Object.keys(translations.ar).forEach((key) => keys.add(key))

        // Create entries for each key
        keys.forEach((key) => {
          entries.push({
            key,
            en: (translations.en as any)[key] || "",
            ar: (translations.ar as any)[key] || "",
            isEditing: false,
            isDirty: false,
          })
        })

        setTranslationEntries(entries)

        // Count missing translations
        const missing = entries.filter((entry) => !entry.en || !entry.ar).length
        setMissingCount(missing)
      } catch (error) {
        console.error("Failed to load translations:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTranslations()
  }, [])

  // Filter translations based on active tab
  const getFilteredTranslations = () => {
    if (activeTab === "missing") {
      return translationEntries.filter((entry) => !entry.en || !entry.ar)
    } else if (activeTab === "edited") {
      return translationEntries.filter((entry) => entry.isDirty)
    }
    return translationEntries
  }

  // Start editing a translation
  const startEditing = (key: string) => {
    setTranslationEntries((prev) =>
      prev.map((entry) =>
        entry.key === key ? { ...entry, isEditing: true, tempEn: entry.en, tempAr: entry.ar } : entry,
      ),
    )
  }

  // Cancel editing a translation
  const cancelEditing = (key: string) => {
    setTranslationEntries((prev) =>
      prev.map((entry) =>
        entry.key === key ? { ...entry, isEditing: false, tempEn: undefined, tempAr: undefined } : entry,
      ),
    )
  }

  // Save edited translation
  const saveTranslation = (key: string) => {
    setTranslationEntries((prev) => {
      const newEntries = prev.map((entry) => {
        if (entry.key === key && entry.isEditing) {
          const isDirty =
            (entry.tempEn !== undefined && entry.tempEn !== entry.en) ||
            (entry.tempAr !== undefined && entry.tempAr !== entry.ar)

          return {
            ...entry,
            en: entry.tempEn !== undefined ? entry.tempEn : entry.en,
            ar: entry.tempAr !== undefined ? entry.tempAr : entry.ar,
            isEditing: false,
            isDirty: isDirty,
            tempEn: undefined,
            tempAr: undefined,
          }
        }
        return entry
      })

      // Update edited count
      const edited = newEntries.filter((entry) => entry.isDirty).length
      setEditedCount(edited)

      return newEntries
    })

    toast({
      title: getTranslation(language, "translationUpdated"),
      description: getTranslation(language, "translationKeyUpdated", { key }),
    })
  }

  // Handle input change
  const handleInputChange = (key: string, lang: Language, value: string) => {
    setTranslationEntries((prev) =>
      prev.map((entry) =>
        entry.key === key
          ? {
              ...entry,
              [`temp${lang === "en" ? "En" : "Ar"}`]: value,
            }
          : entry,
      ),
    )
  }

  // Export translations as JSON
  const exportTranslations = () => {
    const exportData = {
      en: {} as Record<string, string>,
      ar: {} as Record<string, string>,
    }

    translationEntries.forEach((entry) => {
      exportData.en[entry.key] = entry.en
      exportData.ar[entry.key] = entry.ar
    })

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "translations.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: getTranslation(language, "exportSuccessful"),
      description: getTranslation(language, "translationsExported"),
    })
  }

  // Add new translation key
  const addNewTranslation = () => {
    const newKey = `newKey${translationEntries.length + 1}`

    setTranslationEntries((prev) => [
      ...prev,
      {
        key: newKey,
        en: "",
        ar: "",
        isEditing: true,
        isDirty: true,
        tempEn: "",
        tempAr: "",
      },
    ])

    setEditedCount((prev) => prev + 1)
  }

  // Save all changes to the translations.ts file
  const saveAllChanges = async () => {
    if (editedCount === 0) return

    setIsSaving(true)
    try {
      // Prepare the data for saving
      const exportData = {
        en: {} as Record<string, string>,
        ar: {} as Record<string, string>,
      }

      translationEntries.forEach((entry) => {
        exportData.en[entry.key] = entry.en
        exportData.ar[entry.key] = entry.ar
      })

      // Call the server action to update the file
      const result = await updateTranslationsFile(exportData)

      if (result.success) {
        toast({
          title: getTranslation(language, "changesSaved"),
          description: getTranslation(language, "translationChangesSaved", { count: editedCount.toString() }),
        })

        // Reset dirty state for all entries
        setTranslationEntries((prev) =>
          prev.map((entry) => ({
            ...entry,
            isDirty: false,
          })),
        )
        setEditedCount(0)
      } else {
        toast({
          title: getTranslation(language, "error"),
          description: result.error || getTranslation(language, "failedToSaveChanges"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to save translations:", error)
      toast({
        title: getTranslation(language, "error"),
        description: getTranslation(language, "failedToSaveChanges"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle file import
  const handleImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Process the imported file
  const processImportedFile = async (file: File) => {
    setShowImportDialog(true)
    setImportProgress(10)

    try {
      // Read the file
      const text = await file.text()
      setImportProgress(30)

      // Parse and validate the JSON
      const data = JSON.parse(text)
      if (!data.en || !data.ar) {
        throw new Error("Invalid translations format. Must include 'en' and 'ar' keys.")
      }
      setImportProgress(50)

      // Import the translations
      const result = await importTranslations(text)
      setImportProgress(90)

      if (result.success) {
        toast({
          title: getTranslation(language, "importSuccessful"),
          description: getTranslation(language, "translationsImported"),
        })

        // Reload the page to reflect changes
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        throw new Error(result.error || "Failed to import translations")
      }
    } catch (error) {
      console.error("Failed to import translations:", error)
      toast({
        title: getTranslation(language, "error"),
        description: (error as Error).message || getTranslation(language, "failedToImportTranslations"),
        variant: "destructive",
      })
      setShowImportDialog(false)
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImportedFile(file)
    }
  }

  // Define columns for the DataTable
  const columns: Column<TranslationEntry>[] = [
    {
      header: "Key",
      accessorKey: "key",
      enableSorting: true,
      enableFiltering: true,
      cell: (row) => (
        <div className="font-mono text-sm">
          {row.key}
          {row.isDirty && (
            <Badge variant="outline" className="ml-2 bg-secondary/10 text-secondary">
              {getTranslation(language, "edited")}
            </Badge>
          )}
          {(!row.en || !row.ar) && (
            <Badge variant="outline" className="ml-2 bg-destructive/10 text-destructive">
              {getTranslation(language, "missing")}
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "English",
      accessorKey: "en",
      enableSorting: true,
      enableFiltering: true,
      cell: (row) =>
        row.isEditing ? (
          <Textarea
            value={row.tempEn !== undefined ? row.tempEn : row.en}
            onChange={(e) => handleInputChange(row.key, "en", e.target.value)}
            className="min-h-[80px] resize-none"
            dir="ltr"
          />
        ) : (
          <div className="max-w-md break-words whitespace-pre-wrap" dir="ltr">
            {row.en || (
              <span className="text-muted-foreground italic">{getTranslation(language, "noTranslation")}</span>
            )}
          </div>
        ),
    },
    {
      header: "Arabic",
      accessorKey: "ar",
      enableSorting: true,
      enableFiltering: true,
      cell: (row) =>
        row.isEditing ? (
          <Textarea
            value={row.tempAr !== undefined ? row.tempAr : row.ar}
            onChange={(e) => handleInputChange(row.key, "ar", e.target.value)}
            className="min-h-[80px] resize-none text-right"
            dir="rtl"
          />
        ) : (
          <div className="max-w-md break-words whitespace-pre-wrap text-right" dir="rtl">
            {row.ar || (
              <span className="text-muted-foreground italic">{getTranslation(language, "noTranslation")}</span>
            )}
          </div>
        ),
    },
    {
      header: "Actions",
      accessorKey: "key",
      enableSorting: false,
      enableFiltering: false,
      cell: (row) =>
        row.isEditing ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => cancelEditing(row.key)}
              title={getTranslation(language, "cancel")}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => saveTranslation(row.key)}
              title={getTranslation(language, "save")}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => startEditing(row.key)}>
            {getTranslation(language, "edit")}
          </Button>
        ),
      meta: {
        className: "w-[100px] text-right",
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{getTranslation(language, "translationsManagement")}</h1>
        <p className="text-muted-foreground">{getTranslation(language, "manageTranslationsDescription")}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={addNewTranslation}>
            <Plus className="mr-2 h-4 w-4" /> {getTranslation(language, "addTranslation")}
          </Button>
          <Button variant="outline" onClick={exportTranslations}>
            <Download className="mr-2 h-4 w-4" /> {getTranslation(language, "export")}
          </Button>
          <Button variant="outline" onClick={handleImport}>
            <Upload className="mr-2 h-4 w-4" /> {getTranslation(language, "import")}
            <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept=".json" className="hidden" />
          </Button>
          <Button
            variant="default"
            onClick={saveAllChanges}
            disabled={editedCount === 0 || isSaving}
            className="bg-primary hover:bg-secondary"
          >
            {isSaving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> {getTranslation(language, "saving")}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> {getTranslation(language, "saveChanges")}
              </>
            )}
          </Button>
        </div>
      </div>

      <div>
        <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList>
            <TabsTrigger value="all">
              {getTranslation(language, "allTranslations")} ({translationEntries.length})
            </TabsTrigger>
            <TabsTrigger value="missing">
              {getTranslation(language, "missingTranslations")} ({missingCount})
            </TabsTrigger>
            <TabsTrigger value="edited">
              {getTranslation(language, "editedTranslations")} ({editedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
          <span>{getTranslation(language, "loadingTranslations")}</span>
        </div>
      ) : (
        <DataTable
          data={getFilteredTranslations()}
          columns={columns}
          title={getTranslation(language, "translationsList")}
          description={getTranslation(language, "translationsCount", {
            count: getFilteredTranslations().length.toString(),
          })}
          searchPlaceholder={getTranslation(language, "searchTranslations")}
          exportFilename="translations-export"
          initialPageSize={10}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      )}

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getTranslation(language, "importingTranslations")}</DialogTitle>
            <DialogDescription>{getTranslation(language, "importingTranslationsDescription")}</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Progress value={importProgress} className="h-2" />
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {importProgress < 100
                ? getTranslation(language, "processingImport")
                : getTranslation(language, "importComplete")}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowImportDialog(false)}
              disabled={importProgress < 100 && importProgress > 0}
            >
              {importProgress < 100 ? getTranslation(language, "importing") : getTranslation(language, "close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
