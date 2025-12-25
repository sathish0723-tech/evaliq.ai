"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Users,
  FileSpreadsheet,
  Loader2,
  Check,
  CheckCircle,
  Eye,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  X,
  Layers
} from 'lucide-react'
import { toast } from 'sonner'

// Helper function to replace placeholders in HTML with student data
const replacePlaceholdersInHTML = (html, viewMarksheet) => {
  if (!html || !viewMarksheet) return html

  let processedHTML = html

  // Basic student data replacements
  const studentData = {
    studentName: viewMarksheet.studentName || '',
    class: viewMarksheet.studentClass || '',
    rollNumber: viewMarksheet.rollNumber || '',
    fatherName: viewMarksheet.fatherName || '',
    motherName: viewMarksheet.motherName || '',
    dob: viewMarksheet.dob || '',
    percentage: viewMarksheet.percentage || '',
    grade: viewMarksheet.grade || '',
    result: viewMarksheet.result || '',
    totalMarks: viewMarksheet.totalObtainedMarks || '',
    maxMarks: viewMarksheet.totalMaxMarks || '',
    remarks: viewMarksheet.remarks || ''
  }

  // Replace all placeholders
  Object.entries(studentData).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'gi')
    processedHTML = processedHTML.replace(regex, value !== null && value !== undefined ? String(value) : '')
  })

  // Replace marks placeholders (marks_1, marks_2, etc.)
  if (viewMarksheet.subjects && Array.isArray(viewMarksheet.subjects)) {
    viewMarksheet.subjects.forEach((subject, index) => {
      const marksKey = `marks_${index + 1}`
      const regex = new RegExp(`{{${marksKey}}}`, 'gi')
      const marksValue = subject.obtainedMarks !== undefined && subject.obtainedMarks !== null 
        ? String(subject.obtainedMarks) 
        : ''
      processedHTML = processedHTML.replace(regex, marksValue)
    })
  }

  // Replace subject names in table cells if needed
  if (viewMarksheet.subjects && Array.isArray(viewMarksheet.subjects)) {
    viewMarksheet.subjects.forEach((subject, index) => {
      const subjectNameKey = `subjectName_${index + 1}`
      const regex = new RegExp(`{{${subjectNameKey}}}`, 'gi')
      const subjectName = subject.name || subject.subjectName || ''
      processedHTML = processedHTML.replace(regex, subjectName)
    })
  }

  return processedHTML
}

export default function ReviewMarksheetPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = params.classId
  const classId = searchParams.get('classId')
  
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [template, setTemplate] = useState(null)
  const [marksheets, setMarksheets] = useState([])
  const [selectedMarksheets, setSelectedMarksheets] = useState([])
  const [viewMarksheet, setViewMarksheet] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showAllReports, setShowAllReports] = useState(false)
  const [currentReportIndex, setCurrentReportIndex] = useState(0)

  // Navigate to next/previous report
  const goToNextReport = () => {
    if (currentReportIndex < marksheets.length - 1) {
      setCurrentReportIndex(prev => prev + 1)
      setViewMarksheet(marksheets[currentReportIndex + 1])
    }
  }

  const goToPrevReport = () => {
    if (currentReportIndex > 0) {
      setCurrentReportIndex(prev => prev - 1)
      setViewMarksheet(marksheets[currentReportIndex - 1])
    }
  }

  // Open all reports viewer starting from first
  const openAllReportsViewer = () => {
    if (marksheets.length > 0) {
      setCurrentReportIndex(0)
      setViewMarksheet(marksheets[0])
      setShowAllReports(true)
    }
  }

  // Open single report viewer
  const openSingleReport = (marksheet, index) => {
    setCurrentReportIndex(index)
    setViewMarksheet(marksheet)
    setShowPreview(true)
  }

  // Keyboard navigation for all reports viewer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showAllReports) return
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        goToNextReport()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        goToPrevReport()
      } else if (e.key === 'Escape') {
        setShowAllReports(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAllReports, currentReportIndex, marksheets])

  // Load template and marksheets on mount and when params change
  useEffect(() => {
    // Always refetch when component mounts or params change
    setLoading(true)
    loadTemplate()
    loadMarksheets()
  }, [templateId, classId])
  
  // Also refetch when window gains focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      loadMarksheets()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [templateId, classId])

  const loadTemplate = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/marksheet-templates', { templateId })
      const response = await fetch(url, { credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json()
        if (data.template) {
          setTemplate(data.template)
        }
      }
    } catch (error) {
      console.error('Error loading template:', error)
    }
  }

  const loadMarksheets = async () => {
    try {
      // Fetch without batch filter to show all marksheets for this template
      let url = `/api/marksheet-generate?templateId=${templateId}`
      if (classId) {
        url += `&classId=${classId}`
      }
      const response = await fetch(url, { credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json()
        setMarksheets(data.marksheets || [])
      }
    } catch (error) {
      console.error('Error loading marksheets:', error)
    } finally {
      setLoading(false)
    }
  }

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedMarksheets.length === marksheets.length) {
      setSelectedMarksheets([])
    } else {
      setSelectedMarksheets(marksheets.map(m => m.marksheetId))
    }
  }

  // Toggle individual selection
  const toggleSelect = (marksheetId) => {
    setSelectedMarksheets(prev => 
      prev.includes(marksheetId) 
        ? prev.filter(id => id !== marksheetId)
        : [...prev, marksheetId]
    )
  }

  // Approve selected marksheets
  const approveSelected = async () => {
    if (selectedMarksheets.length === 0) {
      toast.error('Please select marksheets to approve')
      return
    }

    setApproving(true)
    try {
      const response = await fetch('/api/marksheet-generate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          marksheetIds: selectedMarksheets,
          status: 'approved'
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`${data.modifiedCount} marksheets approved!`)
        loadMarksheets()
        setSelectedMarksheets([])
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to approve marksheets')
      }
    } catch (error) {
      console.error('Error approving marksheets:', error)
      toast.error('Failed to approve marksheets')
    } finally {
      setApproving(false)
    }
  }

  // View individual marksheet
  const openMarksheetPreview = (marksheet, index) => {
    setCurrentReportIndex(index !== undefined ? index : marksheets.findIndex(m => m.marksheetId === marksheet.marksheetId))
    setViewMarksheet(marksheet)
    setShowPreview(true)
  }

  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>
      case 'pending_review':
        return <Badge variant="secondary">Pending Review</Badge>
      case 'published':
        return <Badge className="bg-blue-500">Published</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
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
                <BreadcrumbItem>
                  <BreadcrumbLink href="/marksheet">
                    Marksheet
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/marksheet/${templateId}`}>
                    {template?.templateName || 'Template'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Review</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Review Marksheets</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Review and approve generated marksheets before publishing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={openAllReportsViewer}
                disabled={marksheets.length === 0}
              >
                <Layers className="h-4 w-4 mr-2" />
                View All Reports
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push(`/marksheet/${templateId}/generate`)}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Add More Students
              </Button>
              <Button 
                onClick={approveSelected}
                disabled={approving || selectedMarksheets.length === 0}
              >
                {approving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve Selected ({selectedMarksheets.length})
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{marksheets.length}</div>
                <p className="text-sm text-muted-foreground">Total Marksheets</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {marksheets.filter(m => m.status === 'pending_review').length}
                </div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {marksheets.filter(m => m.status === 'approved').length}
                </div>
                <p className="text-sm text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {marksheets.filter(m => m.result === 'PASS').length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Pass ({marksheets.length > 0 ? ((marksheets.filter(m => m.result === 'PASS').length / marksheets.length) * 100).toFixed(0) : 0}%)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Marksheets List */}
          {marksheets.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Student Marksheets
                    </CardTitle>
                    <CardDescription>
                      Click on a student to preview their marksheet
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedMarksheets.length === marksheets.length}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">Select All</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border p-2 text-left text-sm font-medium w-10"></th>
                        <th className="border p-2 text-left text-sm font-medium">#</th>
                        <th className="border p-2 text-left text-sm font-medium">Student Name</th>
                        <th className="border p-2 text-left text-sm font-medium">Roll No</th>
                        <th className="border p-2 text-center text-sm font-medium">Total</th>
                        <th className="border p-2 text-center text-sm font-medium">Percentage</th>
                        <th className="border p-2 text-center text-sm font-medium">Grade</th>
                        <th className="border p-2 text-center text-sm font-medium">Result</th>
                        <th className="border p-2 text-center text-sm font-medium">Status</th>
                        <th className="border p-2 text-center text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marksheets.map((marksheet, index) => (
                        <tr key={marksheet.marksheetId} className="hover:bg-muted/50">
                          <td className="border p-2 text-center">
                            <Checkbox 
                              checked={selectedMarksheets.includes(marksheet.marksheetId)}
                              onCheckedChange={() => toggleSelect(marksheet.marksheetId)}
                            />
                          </td>
                          <td className="border p-2 text-sm text-center">{index + 1}</td>
                          <td className="border p-2 text-sm font-medium">{marksheet.studentName}</td>
                          <td className="border p-2 text-sm text-center">{marksheet.rollNumber || '-'}</td>
                          <td className="border p-2 text-sm text-center">
                            {marksheet.totalObtainedMarks}/{marksheet.totalMaxMarks}
                          </td>
                          <td className="border p-2 text-sm text-center font-medium">
                            {marksheet.percentage}%
                          </td>
                          <td className="border p-2 text-sm text-center font-bold">
                            {marksheet.grade}
                          </td>
                          <td className={`border p-2 text-sm text-center font-bold ${marksheet.result === 'PASS' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {marksheet.result}
                          </td>
                          <td className="border p-2 text-center">
                            {getStatusBadge(marksheet.status)}
                          </td>
                          <td className="border p-2 text-center">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => openMarksheetPreview(marksheet, index)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No marksheets generated yet</p>
                <Button 
                  className="mt-4"
                  onClick={() => router.push(`/marksheet/${templateId}/generate`)}
                >
                  Generate Marksheets
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Marksheet Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Marksheet Preview - {viewMarksheet?.studentName}</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled>
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            {viewMarksheet && template && (
              <div
                className="border-4 border-double border-gray-800 relative"
                style={{
                  width: '600px',
                  height: '800px',
                  margin: '0 auto',
                  overflow: 'hidden'
                }}
              >
                {template.html ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: replacePlaceholdersInHTML(template.html, viewMarksheet)
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      transform: 'scale(1)',
                      transformOrigin: 'top left'
                    }}
                  />
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <p>Template HTML not found. Please save the template again to generate HTML format.</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View All Reports Modal - Full screen with blur background */}
        {showAllReports && viewMarksheet && (
          <div className="fixed inset-0 z-50">
            {/* Blur backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAllReports(false)}
            />
            
            {/* Close button */}
            <button
              onClick={() => setShowAllReports(false)}
              className="absolute top-3 right-3 z-50 p-1.5 bg-white/90 rounded-full hover:bg-white shadow-md transition-all"
            >
              <X className="h-4 w-4 text-gray-800" />
            </button>

            {/* Report counter */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-white/90 rounded-full shadow-md">
              <span className="text-xs font-medium text-gray-800">
                {currentReportIndex + 1} / {marksheets.length}
              </span>
            </div>

            {/* Previous button - positioned near the report */}
            <button
              onClick={goToPrevReport}
              disabled={currentReportIndex === 0}
              className={`absolute left-[calc(50%-310px)] top-1/2 -translate-y-1/2 z-50 p-2 rounded-full shadow-md transition-all ${currentReportIndex === 0
                  ? 'bg-gray-300 cursor-not-allowed opacity-50' 
                  : 'bg-white hover:bg-gray-100 hover:scale-105'
              }`}
            >
              <ChevronLeft className="h-5 w-5 text-gray-800" />
            </button>

            {/* Next button - positioned near the report */}
            <button
              onClick={goToNextReport}
              disabled={currentReportIndex === marksheets.length - 1}
              className={`absolute right-[calc(50%-310px)] top-1/2 -translate-y-1/2 z-50 p-2 rounded-full shadow-md transition-all ${currentReportIndex === marksheets.length - 1
                  ? 'bg-gray-300 cursor-not-allowed opacity-50' 
                  : 'bg-white hover:bg-gray-100 hover:scale-105'
              }`}
            >
              <ChevronRight className="h-5 w-5 text-gray-800" />
            </button>

            {/* Marksheet content - render HTML directly */}
            <div className="absolute inset-0 flex items-center justify-center p-8 pt-16 pb-8 overflow-auto">
              {viewMarksheet && template && (
                <div
                  className="border-4 border-double border-gray-800 relative shadow-2xl"
                  style={{
                    width: '600px',
                    height: '800px',
                    overflow: 'hidden'
                  }}
                >
                  {template.html ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: replacePlaceholdersInHTML(template.html, viewMarksheet)
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: 'scale(1)',
                        transformOrigin: 'top left'
                      }}
                    />
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      <p>Template HTML not found. Please save the template again to generate HTML format.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}

