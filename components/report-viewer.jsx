'use client'

import * as React from 'react'
import { X, FileText, Search, List, Plus, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function ReportViewer({ 
  reportContent, 
  reportTitle, 
  onClose,
  timestamp,
  reportData = null
}) {
  // Check if we have student data array
  const students = reportData && Array.isArray(reportData) ? reportData : []
  const hasStudents = students.length > 0
  const contentRef = React.useRef(null)
  const [downloadingPDF, setDownloadingPDF] = React.useState(false)
  
  // Convert report content to Hybiscus format
  const convertReportToHybiscus = () => {
    const hybiscusSections = []
    const { title: parsedTitle, sections: parsedSections } = parseReport(reportContent)

    console.log('Converting to Hybiscus format:', {
      hasStudents,
      studentsCount: students.length,
      students: students.map(s => s.studentName)
    })

    if (hasStudents && students.length > 0) {
      // Add compact summary section first
      const totalStudents = students.length
      const avgPerformance = students.reduce((sum, s) => sum + (s.averageMarks || s.percentage || 0), 0) / totalStudents
      hybiscusSections.push({
        type: "text",
        content: `# Student Performance Report - ${totalStudents} Students\n**Average Performance:** ${avgPerformance.toFixed(2)}%\n\n`
      })

      // Convert student data to compact sections (optimized for single page)
      students.forEach((student, index) => {
        console.log(`Processing student ${index + 1}/${students.length}:`, student.studentName)
        
        // Compact student header
        hybiscusSections.push({
          type: "text",
          content: `## ${index + 1}. ${student.studentName || 'Student'}\n`
        })

        // Compact contact and performance in one line
        const avgMarks = student.averageMarks?.toFixed(1) || student.percentage?.toFixed(1) || 'N/A'
        const contactInfo = student.studentEmail || student.studentPhone 
          ? `Email: ${student.studentEmail || 'N/A'} | Phone: ${student.studentPhone || 'N/A'}` 
          : ''
        hybiscusSections.push({
          type: "text",
          content: `${contactInfo ? `**Contact:** ${contactInfo} | ` : ''}**Avg:** ${avgMarks}% | **Tests:** ${student.totalTests || 'N/A'} | **Total:** ${student.totalMarks || 'N/A'}\n`
        })

        // Compact attendance (text only, no chart to save space)
        if (student.attendance) {
          const attendancePct = student.attendance.attendancePercentage?.toFixed(1) || 'N/A'
          hybiscusSections.push({
            type: "text",
            content: `**Attendance:** ${attendancePct}% (${student.attendance.presentDays || 0}P/${student.attendance.absentDays || 0}A/${student.attendance.lateDays || 0}L)\n`
          })
        }

        // Shortened analysis (first 200 chars only to save space)
        if (student.analysis) {
          const shortAnalysis = student.analysis.length > 200 
            ? student.analysis.substring(0, 200) + '...' 
            : student.analysis
          hybiscusSections.push({
            type: "text",
            content: `**Summary:** ${shortAnalysis}\n`
          })
        }

        // Minimal separator
        if (index < students.length - 1) {
          hybiscusSections.push({
            type: "text",
            content: "\n"
          })
        }
      })
      
      console.log(`Completed processing ${students.length} students, created ${hybiscusSections.length} sections (optimized for single page)`)
    } else if (parsedSections.length > 0) {
      // Convert parsed sections to Hybiscus format
      parsedSections.forEach((section) => {
        if (section.title) {
          hybiscusSections.push({
            type: "text",
            content: `\n${section.title}\n`
          })
        }
        if (section.content) {
          hybiscusSections.push({
            type: "text",
            content: section.content
          })
        }
      })
    } else if (reportContent) {
      // Fallback to raw content
      hybiscusSections.push({
        type: "text",
        content: reportContent
      })
    }

    console.log('Hybiscus sections created:', {
      totalSections: hybiscusSections.length,
      studentSections: hybiscusSections.filter(s => s.type === 'text' && s.content.includes('Student')).length
    })

    return {
      title: title || reportTitle || parsedTitle || 'Report',
      sections: hybiscusSections
    }
  }
  
  // PDF Export function using Hybiscus API
  const handleExportPDF = async () => {
    setDownloadingPDF(true)
    try {
      console.log('Starting PDF export, students data:', {
        studentsCount: students.length,
        hasStudents,
        reportData: reportData
      })
      
      // Convert report to Hybiscus format
      const reportJSON = convertReportToHybiscus()
      
      console.log('Report JSON prepared:', {
        title: reportJSON.title,
        sectionsCount: reportJSON.sections.length
      })

      // Call Hybiscus API
      const response = await fetch('/api/hybiscus/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportJSON,
          title: title || reportTitle || 'Report'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.details || 'Failed to generate PDF')
      }

      const data = await response.json()

      if (data.pdf) {
        // Convert base64 to blob and download
        const byteCharacters = atob(data.pdf)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'application/pdf' })
        
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = data.filename || `${title || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success('PDF downloaded successfully!')
      } else {
        throw new Error('No PDF data received')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error(error.message || 'Failed to download PDF')
    } finally {
      setDownloadingPDF(false)
    }
  }
  
  // Parse report content to extract title and sections
  const parseReport = (content) => {
    if (!content) return { title: reportTitle || 'Report', sections: [] }
    
    // Try to extract title from content
    const titleMatch = content.match(/^#\s+(.+)$/m) || 
                      content.match(/^(.+?)\n/m) ||
                      content.match(/title[:\s]+(.+)/i)
    
    const title = titleMatch ? titleMatch[1].trim() : (reportTitle || 'Research Report')
    
    // Split content into sections
    const sections = []
    const lines = content.split('\n')
    let currentSection = { title: '', content: [] }
    
    lines.forEach((line, index) => {
      // Check for markdown headers
      if (line.match(/^#{1,3}\s+/)) {
        if (currentSection.title || currentSection.content.length > 0) {
          sections.push({
            ...currentSection,
            content: currentSection.content.join('\n').trim()
          })
        }
        currentSection = {
          title: line.replace(/^#{1,3}\s+/, '').trim(),
          content: []
        }
      } else if (line.trim()) {
        currentSection.content.push(line)
      }
    })
    
    // Add last section
    if (currentSection.title || currentSection.content.length > 0) {
      sections.push({
        ...currentSection,
        content: currentSection.content.join('\n').trim()
      })
    }
    
    // If no sections found, treat entire content as one section
    if (sections.length === 0) {
      sections.push({
        title: 'Content',
        content: content.trim()
      })
    }
    
    return { title, sections }
  }
  
  const { title, sections } = parseReport(reportContent)
  
  const formatDate = (date) => {
    if (!date) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  
  // Render inline markdown (bold, italic, etc.)
  const renderInlineMarkdown = (text) => {
    if (!text) return null
    
    // Handle bold **text** or __text__
    const parts = []
    let lastIndex = 0
    const boldRegex = /\*\*([^*]+)\*\*|__([^_]+)__/g
    let match
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      // Add bold text
      parts.push(<strong key={`bold-${match.index}`} className="font-semibold">{match[1] || match[2]}</strong>)
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return parts.length > 0 ? parts : text
  }
  
  // Render markdown content with proper formatting
  const renderMarkdown = (text) => {
    if (!text) return null
    
    // Split by lines to process
    const lines = text.split('\n')
    const elements = []
    let currentParagraph = []
    let listItems = []
    let listKey = 0
    
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      
      // Check for bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Close current paragraph if exists
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} className="text-foreground leading-relaxed mb-4">
              {renderInlineMarkdown(currentParagraph.join(' '))}
            </p>
          )
          currentParagraph = []
        }
        // Add to list items
        const listItem = trimmed.substring(2)
        listItems.push(
          <li key={`li-${listItems.length}`} className="text-foreground leading-relaxed">
            {renderInlineMarkdown(listItem)}
          </li>
        )
      } else if (trimmed === '') {
        // Empty line - end current paragraph or list
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} className="text-foreground leading-relaxed mb-4">
              {renderInlineMarkdown(currentParagraph.join(' '))}
            </p>
          )
          currentParagraph = []
        }
        if (listItems.length > 0) {
          elements.push(
            <ul key={`ul-${listKey++}`} className="list-disc list-inside space-y-2 mb-4 ml-4">
              {listItems}
            </ul>
          )
          listItems = []
        }
      } else {
        // Regular text line
        if (listItems.length > 0) {
          elements.push(
            <ul key={`ul-${listKey++}`} className="list-disc list-inside space-y-2 mb-4 ml-4">
              {listItems}
            </ul>
          )
          listItems = []
        }
        currentParagraph.push(line)
      }
    })
    
    // Handle remaining paragraph
    if (currentParagraph.length > 0) {
      elements.push(
        <p key="p-final" className="text-foreground leading-relaxed mb-4">
          {renderInlineMarkdown(currentParagraph.join(' '))}
        </p>
      )
    }
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${listKey++}`} className="list-disc list-inside space-y-2 mb-4 ml-4">
          {listItems}
        </ul>
      )
    }
    
    return elements.length > 0 ? elements : <p className="text-foreground leading-relaxed">{text}</p>
  }
  
  // Render student information in document format
  const renderStudentCard = (student) => {
    if (!student) return null
    
    // Build document-style text content with flowing sentences
    const buildDocumentContent = () => {
      const parts = []
      
      // Student Name as heading
      parts.push(`# ${student.studentName}\n\n`)
      
      // Contact Information as inline text
      parts.push(`Email: ${student.studentEmail} | Phone: ${student.studentPhone}\n\n`)
      
      // Performance Metrics as flowing sentences
      const avgMarks = student.averageMarks?.toFixed(1) || student.percentage?.toFixed(1) || 'N/A'
      parts.push(`${student.studentName} demonstrates excellent academic performance with an average of ${avgMarks}% across ${student.totalTests || 'N/A'} tests, achieving a total of ${student.totalMarks || 'N/A'} marks. `)
      
      // Attendance Metrics as flowing sentences
      if (student.attendance) {
        const attendancePct = student.attendance.attendancePercentage?.toFixed(1) || 'N/A'
        parts.push(`The attendance rate stands at ${attendancePct}%, with ${student.attendance.presentDays || 0} present days, ${student.attendance.absentDays || 0} absent days, and ${student.attendance.lateDays || 0} late days out of a total of ${student.attendance.totalDays || 0} days. `)
      }
      
      parts.push(`\n\n`)
      
      // Detailed Analysis as flowing text
      if (student.analysis) {
        parts.push(student.analysis)
      }
      
      return parts.join('')
    }
    
    const documentContent = buildDocumentContent()
    
    return (
      <div className="space-y-6">
        <div className="prose prose-lg dark:prose-invert max-w-none leading-relaxed">
          {renderMarkdown(documentContent)}
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Header - Single Row Structure */}
      <div className="flex items-center justify-between px-6 py-3 border-b shrink-0 bg-background">
        {/* Left: Search + Title + Navigation */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Search className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </div>
        
        {/* Center: Contents, Share and export */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2">
                  <List className="h-4 w-4" />
                  Contents
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Table of Contents</DropdownMenuItem>
                <DropdownMenuItem>Jump to Section</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-2"
              onClick={handleExportPDF}
              disabled={downloadingPDF}
            >
              {downloadingPDF ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export as PDF
                </>
              )}
                </Button>
        </div>
        
        {/* Right: Create, X */}
        <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2">
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>New section</DropdownMenuItem>
                <DropdownMenuItem>Add note</DropdownMenuItem>
                <DropdownMenuItem>Insert chart</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Content - Single scrollable section */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="h-full overflow-y-auto px-6 pt-6 pb-24 report-content-scroll"
          style={{ 
            scrollbarWidth: 'thin', 
            scrollbarColor: 'rgb(63 63 70) transparent' 
          }}
        >
          <div ref={contentRef} className="max-w-4xl mx-auto">
          {hasStudents ? (
            // Show all students in sequence
            <div className="space-y-12">
              {students.map((student, index) => (
                <div key={student._id || index}>
                  {renderStudentCard(student)}
                  {index < students.length - 1 && <Separator className="my-8" />}
                </div>
              ))}
            </div>
          ) : sections.length > 0 ? (
            // Show regular report sections
            <div className="space-y-8">
              {sections.map((section, index) => (
                <div key={index} className="space-y-4">
                  {section.title && (
                    <h2 className="text-2xl font-semibold text-foreground">
                      {section.title}
                    </h2>
                  )}
                  {section.content && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        {renderMarkdown(section.content)}
                    </div>
                  )}
                  {index < sections.length - 1 && <Separator className="my-6" />}
                </div>
              ))}
            </div>
          ) : (
            // Fallback to raw content
            <div className="prose prose-sm dark:prose-invert max-w-none">
                {renderMarkdown(reportContent)}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}

