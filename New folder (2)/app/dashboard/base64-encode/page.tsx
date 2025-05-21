"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Upload, Copy, FileImage, Download, X, RefreshCw } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export default function Base64EncodePage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [base64Result, setBase64Result] = useState<string>("")
  const [isEncoding, setIsEncoding] = useState(false)
  const [fileInfo, setFileInfo] = useState<{
    name: string
    size: number
    type: string
  } | null>(null)

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)
    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Create preview URL for images
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }

    // Clear previous result
    setBase64Result("")
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const encodeToBase64 = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to encode",
        variant: "destructive",
      })
      return
    }

    setIsEncoding(true)

    try {
      const formData = new FormData()
      formData.append("image", selectedFile)

      const response = await fetch("http://localhost:5000/api/image/tobase64", {
        method: "POST",
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MmUxM2Y0NTkyNjE0YzY2YzlhYTUyMyIsInJvbGUiOiJzdXBlcmFkbWluIiwiaWF0IjoxNzQ4MzQ4NjQ1LCJleHAiOjE3NDgzNzc0NDV9.TvoT7ceA8pf4y0X5fSseJiEl7jDUgu2xValcYXz_66g",
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to encode image")
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        setBase64Result(result.data.base64)
        setFileInfo({
          name: result.data.fileName,
          size: result.data.fileSize,
          type: result.data.mimeType,
        })
        
        toast({
          title: "Encoding complete",
          description: "File has been successfully encoded to Base64",
        })
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("Error encoding file:", error)
      toast({
        title: "Error",
        description: "An error occurred while encoding the file",
        variant: "destructive",
      })
    } finally {
      setIsEncoding(false)
    }
  }

  const copyToClipboard = async () => {
    if (!base64Result) return

    try {
      await navigator.clipboard.writeText(base64Result)
      toast({
        title: "Copied to clipboard",
        description: "Base64 string has been copied to your clipboard",
      })
    } catch (error) {
      console.error("Failed to copy:", error)
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard. Please try selecting and copying manually.",
        variant: "destructive",
      })
    }
  }

  const downloadBase64 = () => {
    if (!base64Result || !fileInfo) return

    const blob = new Blob([base64Result], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileInfo.name.split(".")[0]}_base64.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Download started",
      description: "Base64 file has been downloaded",
    })
  }

  const clearAll = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setBase64Result("")
    setFileInfo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Base64 Encode</h1>
          <p className="text-muted-foreground">Convert files to Base64 format for web applications and APIs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearAll} disabled={!selectedFile && !base64Result}>
            <X className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              File
            </CardTitle>
            <CardDescription>Select a file to encode to Base64 format</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="*/*" />

            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                selectedFile ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
              )}
              onClick={handleFileSelect}
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <div className="relative mx-auto w-32 h-32">
                    <Image
                      src={previewUrl || "/placeholder.svg"}
                      alt="Preview"
                      fill
                      className="object-cover rounded-md"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Change File
                  </Button>
                </div>
              ) : selectedFile ? (
                <div className="space-y-4">
                  <FileImage className="mx-auto h-16 w-16 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedFile.type || "Unknown type"}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="mx-auto h-16 w-16 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Click to select a file</p>
                    <p className="text-sm text-muted-foreground">Or drag and drop a file here</p>
                    <p className="text-xs text-muted-foreground mt-2">Maximum file size: 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {fileInfo && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Filename:</span>
                  <span className="text-sm text-muted-foreground font-mono">{fileInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">File size:</span>
                  <span className="text-sm text-muted-foreground">{formatFileSize(fileInfo.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">File type:</span>
                  <span className="text-sm text-muted-foreground">{fileInfo.type || "Unknown"}</span>
                </div>
              </div>
            )}

            <Button
              onClick={encodeToBase64}
              disabled={!selectedFile || isEncoding}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isEncoding ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Encoding...
                </>
              ) : (
                <>
                  <FileImage className="mr-2 h-4 w-4" />
                  Encode to Base64
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>The Result Of Base64 Encoding Will Appear Here</span>
              <div className="flex gap-2">
                {base64Result && (
                  <>
                    <Button variant="outline" size="sm" onClick={downloadBase64}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                      Copy to clipboard
                    </Button>
                  </>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              {base64Result
                ? "Base64 encoded string ready to use"
                : "Upload and encode a file to see the Base64 result"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {base64Result ? (
              <div className="space-y-4">
                <Textarea
                  value={base64Result}
                  readOnly
                  className="min-h-[400px] font-mono text-xs resize-none"
                  placeholder="Base64 encoded string will appear here..."
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Length: {base64Result.length.toLocaleString()} characters</span>
                  <span>Size: {formatFileSize(new Blob([base64Result]).size)} (as text)</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileImage className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No file encoded yet</h3>
                <p className="text-muted-foreground">
                  Select a file and click "Encode to Base64" to see the result here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Information */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use Base64 Encoding</CardTitle>
          <CardDescription>Learn about Base64 encoding and its common use cases</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Common Use Cases:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Embedding images in HTML/CSS</li>
                <li>• Sending files through APIs</li>
                <li>• Storing binary data in databases</li>
                <li>• Email attachments</li>
                <li>• Data URLs for web applications</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Supported File Types:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Images (JPEG, PNG, GIF, SVG, etc.)</li>
                <li>• Documents (PDF, DOC, TXT, etc.)</li>
                <li>• Audio files (MP3, WAV, etc.)</li>
                <li>• Video files (MP4, AVI, etc.)</li>
                <li>• Any other file type</li>
              </ul>
            </div>
          </div>
          <div className="p-4 bg-secondary/10 rounded-lg">
            <p className="text-sm">
              <strong>Note:</strong> Base64 encoding increases file size by approximately 33%. Large files may take
              longer to encode and result in very long strings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
