'use client'

import * as React from 'react'
import { X, FileText, Search, List, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

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
  
  // PDF Export function
  const handleExportPDF = async () => {
    try {
      // Dynamically import jsPDF and html2canvas
      const jsPDF = (await import('jspdf')).default
      const html2canvas = (await import('html2canvas')).default
      
      if (!contentRef.current) return
      
      // Show loading state (optional)
      const loadingElement = document.createElement('div')
      loadingElement.textContent = 'Generating PDF...'
      loadingElement.style.position = 'fixed'
      loadingElement.style.top = '50%'
      loadingElement.style.left = '50%'
      loadingElement.style.transform = 'translate(-50%, -50%)'
      loadingElement.style.background = 'rgba(0,0,0,0.8)'
      loadingElement.style.color = 'white'
      loadingElement.style.padding = '20px'
      loadingElement.style.borderRadius = '8px'
      loadingElement.style.zIndex = '9999'
      document.body.appendChild(loadingElement)
      
      // Capture the content area with oklch color handling
      // Suppress console errors for oklch
      const originalError = console.error
      console.error = (...args) => {
        if (args[0]?.includes?.('oklch') || args[0]?.includes?.('unsupported color')) {
          // Suppress oklch errors
          return
        }
        originalError.apply(console, args)
      }
      
      try {
        const canvas = await html2canvas(contentRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
          foreignObjectRendering: false,
          ignoreElements: (element) => {
            // Ignore elements that might cause issues
            return false
          },
          onclone: (clonedDoc) => {
            // Add a style tag to override problematic colors
            try {
              const style = clonedDoc.createElement('style')
              style.textContent = `
                * {
                  color: rgb(0, 0, 0) !important;
                }
                body {
                  background-color: rgb(255, 255, 255) !important;
                }
              `
              clonedDoc.head.appendChild(style)
            } catch (e) {
              // Ignore style errors
            }
          }
        })
        
        // Restore console.error
        console.error = originalError
        
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        
        const imgWidth = 210 // A4 width in mm
        const pageHeight = 297 // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight
        let position = 0
        
        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
        
        // Add additional pages if needed
        while (heightLeft > 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }
        
        // Generate filename
        const filename = `${title || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`
        
        // Save the PDF
        pdf.save(filename)
        
        // Remove loading element
        document.body.removeChild(loadingElement)
      } catch (canvasError) {
        // Restore console.error
        console.error = originalError
        document.body.removeChild(loadingElement)
        throw canvasError
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2">
                  <FileText className="h-4 w-4" />
                  Export as PDF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

