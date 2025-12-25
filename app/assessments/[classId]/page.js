"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, Trash2, Download, Image as ImageIcon, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const SECTIONS = [
  { id: 'section1', name: 'Section 1', title: 'Assessment Section 1' },
  { id: 'section2', name: 'Section 2', title: 'Assessment Section 2' },
  { id: 'section3', name: 'Section 3', title: 'Assessment Section 3' },
]

export default function AssessmentsByClassPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.classId
  const [assessments, setAssessments] = useState({})
  const [loading, setLoading] = useState(true)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [className, setClassName] = useState('')
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null,
  })
  const [filePreview, setFilePreview] = useState(null)

  useEffect(() => {
    if (classId) {
      fetchClassInfo()
      fetchAssessments()
    }
  }, [classId])

  const fetchClassInfo = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/classes')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const cls = data.classes?.find(c => c.classId === classId)
        if (cls) {
          setClassName(cls.name)
        }
      }
    } catch (error) {
      console.error('Error fetching class info:', error)
    }
  }

  const fetchAssessments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/assessments?classId=${classId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        // Group assessments by section
        const grouped = {}
        SECTIONS.forEach(section => {
          grouped[section.id] = []
        })
        data.assessments?.forEach(assessment => {
          if (grouped[assessment.section]) {
            grouped[assessment.section].push(assessment)
          }
        })
        setAssessments(grouped)
      } else {
        console.error('Failed to fetch assessments')
        toast({
          title: "Error",
          description: "Failed to load assessments",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching assessments:', error)
      toast({
        title: "Error",
        description: "Failed to load assessments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSectionClick = (sectionId) => {
    setSelectedSection(sectionId)
    setFormData({ title: '', description: '', file: null })
    setFilePreview(null)
    setIsUploadDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsUploadDialogOpen(false)
    setSelectedSection(null)
    setFormData({ title: '', description: '', file: null })
    setFilePreview(null)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      })
      return
    }

    setFormData(prev => ({ ...prev, file }))
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result)
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)
      const uploadFormData = new FormData()
      uploadFormData.append('section', selectedSection)
      uploadFormData.append('classId', classId)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('file', formData.file)

      const response = await fetch('/api/assessments', {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Assessment uploaded successfully",
        })
        handleCloseDialog()
        fetchAssessments()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to upload assessment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error uploading assessment:', error)
      toast({
        title: "Error",
        description: "Failed to upload assessment",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (assessmentId) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return

    try {
      const response = await fetch(`/api/assessments?assessmentId=${assessmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Assessment deleted successfully",
        })
        fetchAssessments()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete assessment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting assessment:', error)
      toast({
        title: "Error",
        description: "Failed to delete assessment",
        variant: "destructive",
      })
    }
  }

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5" />
    }
    return <FileText className="h-5 w-5" />
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/assessments">
                    Assessments
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{className || 'Class'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/assessments')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-semibold tracking-tight">
                  Assessments - {className || 'Class'}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload and manage assessment documents for this class
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading assessments...</div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
              {SECTIONS.map((section) => {
                const sectionAssessments = assessments[section.id] || []
                return (
                  <Card 
                    key={section.id}
                    className="flex flex-col"
                  >
                    <CardHeader>
                      <CardTitle className="text-base font-medium">{section.title}</CardTitle>
                      <CardDescription>
                        {sectionAssessments.length} file{sectionAssessments.length !== 1 ? 's' : ''} uploaded
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                      <Button
                        onClick={() => handleSectionClick(section.id)}
                        className="w-full"
                        variant="outline"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                      
                      {sectionAssessments.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2">
                          {sectionAssessments.map((assessment) => (
                            <div
                              key={assessment.assessmentId}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {getFileIcon(assessment.fileType)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {assessment.title || assessment.fileName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(assessment.fileSize)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => window.open(assessment.fileUrl, '_blank')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(assessment.assessmentId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Upload Dialog */}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  Upload Assessment - {SECTIONS.find(s => s.id === selectedSection)?.title}
                </DialogTitle>
                <DialogDescription>
                  Upload a file or document for students. Supported formats: Images, PDFs, Documents.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title (Optional)</Label>
                    <Input
                      id="title"
                      placeholder="Enter assessment title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter assessment description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="file">File</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="file"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.doc,.docx"
                        className="cursor-pointer"
                      />
                    </div>
                    {filePreview && (
                      <div className="mt-2">
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="max-w-full h-auto max-h-48 rounded-lg border"
                        />
                      </div>
                    )}
                    {formData.file && !filePreview && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{formData.file.name} ({(formData.file.size / 1024).toFixed(2)} KB)</span>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading || !formData.file}>
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

