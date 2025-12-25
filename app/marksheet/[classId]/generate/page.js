"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Users,
  FileSpreadsheet,
  Loader2,
  Check,
  ArrowRight,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'

export default function GenerateMarksheetPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.classId
  
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [template, setTemplate] = useState(null)
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState([])
  const [studentsMarks, setStudentsMarks] = useState([])

  // Load template and classes
  useEffect(() => {
    loadTemplate()
    loadClasses()
  }, [templateId])

  // Load students when class is selected
  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass)
    }
  }, [selectedClass])

  const loadTemplate = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/marksheet-templates', { templateId })
      const response = await fetch(url, { credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json()
        if (data.template) {
          setTemplate(data.template)
        } else {
          toast.error('Template not found')
          router.push('/marksheet')
        }
      }
    } catch (error) {
      console.error('Error loading template:', error)
      toast.error('Failed to load template')
    }
  }

  const loadClasses = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/classes')
      const response = await fetch(url, { credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      }
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async (classId) => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      
      // Fetch students
      const studentsUrl = buildUrlWithBatch('/api/students', { classId })
      const studentsResponse = await fetch(studentsUrl, { credentials: 'include' })
      
      if (!studentsResponse.ok) {
        console.error('Failed to fetch students')
        return
      }
      
      const studentsData = await studentsResponse.json()
      const studentsList = studentsData.students || []
        setStudents(studentsList)
        
        // Initialize marks for each student
      if (template && template.subjects && template.subjects.length > 0) {
        // Fetch ALL marks for this class (similar to marksheet builder approach)
        const marksUrl = buildUrlWithBatch('/api/marks', { classId })
        const marksResponse = await fetch(marksUrl, { credentials: 'include' })
        
        // Fetch subjects to get subject names and IDs
        const subjectsUrl = buildUrlWithBatch('/api/subjects', { classId })
        const subjectsResponse = await fetch(subjectsUrl, { credentials: 'include' })
        
        let subjectsMap = {}
        if (subjectsResponse.ok) {
          const subjectsData = await subjectsResponse.json()
          if (subjectsData.subjects) {
            subjectsData.subjects.forEach(subj => {
              subjectsMap[subj.subjectId] = {
                name: subj.name,
                subjectId: subj.subjectId
              }
              // Also map by name for matching
              subjectsMap[subj.name?.toLowerCase()] = {
                name: subj.name,
                subjectId: subj.subjectId
              }
            })
          }
        }
        
        // Build marks map: studentId (MongoDB ObjectId) -> subjectName -> marks
        const studentMarksMap = {}
        
        if (marksResponse.ok) {
          const marksData = await marksResponse.json()
          if (marksData.marks && Array.isArray(marksData.marks)) {
            console.log(`[Generate] Found ${marksData.marks.length} marks records`)
            
            marksData.marks.forEach(mark => {
              // mark.studentId is MongoDB ObjectId string (from marks API)
              const studentObjectId = mark.studentId
              const subjectId = mark.subjectId
              
              if (!studentMarksMap[studentObjectId]) {
                studentMarksMap[studentObjectId] = {}
              }
              
              // Get subject name from subjectsMap
              const subjectInfo = subjectsMap[subjectId]
              const subjectName = subjectInfo?.name || subjectId
              
              // Store marks by both subjectId and subjectName for flexible matching
              const nameKey = subjectName.toLowerCase().trim()
              
              // Store by subject name (primary key for matching)
              if (!studentMarksMap[studentObjectId][nameKey]) {
                studentMarksMap[studentObjectId][nameKey] = {
                  marks: mark.marks || 0,
                  maxMarks: mark.maxMarks || 100,
                  subjectId: subjectId,
                  subjectName: subjectName
                }
              } else {
                // If multiple tests for same subject, sum them up (like marksheet builder)
                studentMarksMap[studentObjectId][nameKey].marks += (mark.marks || 0)
                studentMarksMap[studentObjectId][nameKey].maxMarks += (mark.maxMarks || 100)
              }
              
              // Also store by subjectId for direct matching
              if (!studentMarksMap[studentObjectId][subjectId]) {
                studentMarksMap[studentObjectId][subjectId] = {
                  marks: mark.marks || 0,
                  maxMarks: mark.maxMarks || 100,
                  subjectId: subjectId,
                  subjectName: subjectName
                }
              } else {
                studentMarksMap[studentObjectId][subjectId].marks += (mark.marks || 0)
                studentMarksMap[studentObjectId][subjectId].maxMarks += (mark.maxMarks || 100)
              }
            })
            
            console.log(`[Generate] Built marks map for ${Object.keys(studentMarksMap).length} students`)
            console.log(`[Generate] Sample student IDs in marks:`, Object.keys(studentMarksMap).slice(0, 3))
          } else {
            console.log('[Generate] No marks found in response')
          }
        } else {
          console.log('[Generate] Failed to fetch marks:', marksResponse.status)
        }
        
        // Initialize marks for each student, matching template subjects with database marks
        const initialMarks = studentsList.map(student => {
          // Use MongoDB ObjectId (student.id or student._id) to match with marks
          // marks use ObjectId string, not the custom studentId
          // Try multiple possible ID fields
          const studentObjectId = student.id?.toString() || 
                                  student._id?.toString() || 
                                  student.studentId?.toString() ||
                                  student.studentId ||
                                  student.id
          const customStudentId = student.studentId || student.id
          
          // Debug first student to see structure
          if (studentsList.indexOf(student) === 0) {
            console.log(`[Generate] First student structure:`, {
              id: student.id,
              _id: student._id,
              studentId: student.studentId,
              computedObjectId: studentObjectId,
              customStudentId: customStudentId
            })
            console.log(`[Generate] Sample marks student IDs:`, Object.keys(studentMarksMap).slice(0, 3))
          }
          
          const studentMarks = studentMarksMap[studentObjectId] || {}
          
          // Debug: log if student has marks (only for first few to avoid spam)
          if (studentsList.indexOf(student) < 3) {
            if (Object.keys(studentMarks).length > 0) {
              console.log(`[Generate] Student ${customStudentId} (ObjectId: ${studentObjectId}) has marks:`, Object.keys(studentMarks))
            } else {
              console.log(`[Generate] Student ${customStudentId} (ObjectId: ${studentObjectId}) has NO marks`)
            }
          }
          
          return {
            studentId: customStudentId,
            studentName: student.name,
            studentClass: classes.find(c => c.classId === classId)?.name || '',
            rollNumber: student.rollNumber || customStudentId || '',
            subjects: template.subjects.map(templateSubject => {
              // Try multiple matching strategies
              let matchedMarks = null
              const templateSubjectName = templateSubject.name?.toLowerCase().trim()
              
              // Strategy 1: Match by subject name (case-insensitive) - PRIMARY METHOD
              if (templateSubjectName && studentMarks[templateSubjectName]) {
                matchedMarks = studentMarks[templateSubjectName].marks
                console.log(`[Generate] Matched "${templateSubject.name}" by name for student ${customStudentId}: ${matchedMarks}`)
              }
              
              // Strategy 2: Match by template subject ID if it's a subjectId
              if (!matchedMarks && templateSubject.id && studentMarks[templateSubject.id]) {
                matchedMarks = studentMarks[templateSubject.id].marks
                console.log(`[Generate] Matched "${templateSubject.name}" by ID for student ${customStudentId}: ${matchedMarks}`)
              }
              
              // Strategy 3: Try partial name matching (fuzzy match)
              if (!matchedMarks && templateSubjectName) {
                for (const [key, marksData] of Object.entries(studentMarks)) {
                  if (typeof key === 'string') {
                    const keyLower = key.toLowerCase().trim()
                    // Check if names match (either contains or is contained)
                    if (keyLower === templateSubjectName || 
                        keyLower.includes(templateSubjectName) || 
                        templateSubjectName.includes(keyLower)) {
                      matchedMarks = marksData.marks
                      console.log(`[Generate] Matched "${templateSubject.name}" by fuzzy name "${key}" for student ${customStudentId}: ${matchedMarks}`)
                      break
                    }
                  }
                }
              }
              
              // Strategy 4: Try matching through subjectsMap
              if (!matchedMarks && templateSubjectName) {
                const dbSubject = subjectsMap[templateSubjectName]
                if (dbSubject && studentMarks[dbSubject.subjectId]) {
                  matchedMarks = studentMarks[dbSubject.subjectId].marks
                  console.log(`[Generate] Matched "${templateSubject.name}" via subjectsMap for student ${customStudentId}: ${matchedMarks}`)
                }
              }
              
              if (!matchedMarks && templateSubjectName) {
                console.log(`[Generate] No match found for "${templateSubject.name}" (student ${customStudentId}). Available keys:`, Object.keys(studentMarks))
              }
              
              return {
                id: templateSubject.id,
                name: templateSubject.name,
                maxMarks: templateSubject.maxMarks,
                obtainedMarks: matchedMarks !== null && matchedMarks !== undefined ? Math.round(matchedMarks).toString() : ''
              }
            }),
            remarks: ''
          }
        })
        
          setStudentsMarks(initialMarks)
      }
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('Failed to load students and marks')
    }
  }

  // Update student marks
  const updateStudentMarks = (studentId, subjectId, value) => {
    setStudentsMarks(prev => 
      prev.map(sm => {
        if (sm.studentId === studentId) {
          return {
            ...sm,
            subjects: sm.subjects.map(s => 
              s.id === subjectId ? { ...s, obtainedMarks: value } : s
            )
          }
        }
        return sm
      })
    )
  }

  // Update student remarks
  const updateStudentRemarks = (studentId, remarks) => {
    setStudentsMarks(prev => 
      prev.map(sm => 
        sm.studentId === studentId ? { ...sm, remarks } : sm
      )
    )
  }

  // Calculate totals for a student
  const calculateStudentTotal = (studentMarks) => {
    const totalMax = studentMarks.subjects.reduce((acc, s) => acc + (parseInt(s.maxMarks) || 0), 0)
    const totalObtained = studentMarks.subjects.reduce((acc, s) => acc + (parseInt(s.obtainedMarks) || 0), 0)
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0
    return { totalMax, totalObtained, percentage }
  }

  // Generate marksheets for all students
  const generateMarksheets = async () => {
    // Validate all students have marks
    const incomplete = studentsMarks.filter(sm => 
      sm.subjects.some(s => s.obtainedMarks === '' || s.obtainedMarks === null)
    )

    if (incomplete.length > 0) {
      toast.error(`Please fill marks for all students. ${incomplete.length} student(s) have incomplete marks.`)
      return
    }

    setGenerating(true)
    try {
      const response = await fetch('/api/marksheet-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          templateId,
          classId: selectedClass,
          students: studentsMarks
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`${data.count} marksheets generated successfully!`)
        router.push(`/marksheet/${templateId}/review?classId=${selectedClass}`)
        router.refresh() // Force refresh to load new data
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to generate marksheets')
      }
    } catch (error) {
      console.error('Error generating marksheets:', error)
      toast.error('Failed to generate marksheets')
    } finally {
      setGenerating(false)
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
                  <BreadcrumbPage>Generate</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Generate Marksheets</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter marks for all students and generate marksheets
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => router.push(`/marksheet/${templateId}/review?classId=${selectedClass}`)}
                disabled={!selectedClass}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Generated
              </Button>
              <Button 
                onClick={generateMarksheets}
                disabled={generating || studentsMarks.length === 0}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                {generating ? 'Generating...' : 'Generate Marksheets'}
              </Button>
            </div>
          </div>

          {/* Class Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Select Class</CardTitle>
              <CardDescription>Choose a class to enter marks for students</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full md:w-[300px]">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.classId} value={cls.classId}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Students Marks Entry */}
          {selectedClass && studentsMarks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Students ({studentsMarks.length})
                </CardTitle>
                <CardDescription>
                  Enter marks for each subject. Template: {template?.templateName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border p-2 text-left text-sm font-medium sticky left-0 bg-muted z-10">#</th>
                        <th className="border p-2 text-left text-sm font-medium sticky left-8 bg-muted z-10 min-w-[150px]">Student Name</th>
                        <th className="border p-2 text-left text-sm font-medium min-w-[80px]">Roll No</th>
                        {template?.subjects?.map((subject) => (
                          <th key={subject.id} className="border p-2 text-center text-sm font-medium min-w-[100px]">
                            {subject.name}
                            <div className="text-xs font-normal text-muted-foreground">
                              (Max: {subject.maxMarks})
                            </div>
                          </th>
                        ))}
                        <th className="border p-2 text-center text-sm font-medium min-w-[80px]">Total</th>
                        <th className="border p-2 text-center text-sm font-medium min-w-[80px]">%</th>
                        <th className="border p-2 text-left text-sm font-medium min-w-[150px]">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsMarks.map((studentMark, index) => {
                        const { totalMax, totalObtained, percentage } = calculateStudentTotal(studentMark)
                        return (
                          <tr key={studentMark.studentId} className="hover:bg-muted/50">
                            <td className="border p-2 text-sm text-center sticky left-0 bg-background z-10">
                              {index + 1}
                            </td>
                            <td className="border p-2 text-sm font-medium sticky left-8 bg-background z-10">
                              {studentMark.studentName}
                            </td>
                            <td className="border p-2 text-sm text-center">
                              {studentMark.rollNumber || '-'}
                            </td>
                            {studentMark.subjects.map((subject) => (
                              <td key={subject.id} className="border p-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max={subject.maxMarks}
                                  value={subject.obtainedMarks}
                                  onChange={(e) => updateStudentMarks(studentMark.studentId, subject.id, e.target.value)}
                                  className="h-8 text-center"
                                  placeholder="—"
                                />
                              </td>
                            ))}
                            <td className="border p-2 text-sm text-center font-medium">
                              {totalObtained}/{totalMax}
                            </td>
                            <td className={`border p-2 text-sm text-center font-medium ${
                              parseFloat(percentage) >= 40 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {percentage}%
                            </td>
                            <td className="border p-1">
                              <Input
                                type="text"
                                value={studentMark.remarks}
                                onChange={(e) => updateStudentRemarks(studentMark.studentId, e.target.value)}
                                className="h-8"
                                placeholder="Optional remarks"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No students message */}
          {selectedClass && studentsMarks.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No students found in this class</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/students')}
                >
                  Add Students
                </Button>
              </CardContent>
            </Card>
          )}

          {/* No class selected */}
          {!selectedClass && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a class to enter marks</p>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

