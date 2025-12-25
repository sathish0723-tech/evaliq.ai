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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Save, Plus, Calendar, Clock, User, BookOpen } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { TestCard } from '@/components/test-card'

export default function MarksBySubjectPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.classId
  const subjectId = params.subjectId
  const [students, setStudents] = useState([])
  const [subject, setSubject] = useState(null)
  const [tests, setTests] = useState([])
  const [selectedTestId, setSelectedTestId] = useState('')
  const [selectedTest, setSelectedTest] = useState(null)
  const [marks, setMarks] = useState({}) // { studentId: { marks, maxMarks } }
  const [marksInput, setMarksInput] = useState({}) // { studentId: { marks: '', maxMarks: '' } } for input fields
  const [maxMarks, setMaxMarks] = useState(100) // Default max marks for all students
  const [classData, setClassData] = useState(null)
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [marksLoading, setMarksLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)
  const [editingTest, setEditingTest] = useState(null)
  const [testFormData, setTestFormData] = useState({ 
    name: '', 
    date: '', 
    time: '', 
    coachId: '' 
  })
  const { toast } = useToast()

  useEffect(() => {
    if (classId && subjectId) {
      fetchClassData()
      fetchSubject()
      fetchStudents()
      fetchTests()
      fetchCoaches()
    }
  }, [classId, subjectId])

  useEffect(() => {
    if (selectedTestId) {
      fetchMarks()
    } else {
      setMarks({})
    }
  }, [selectedTestId, classId, subjectId])

  const fetchClassData = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/classes')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const foundClass = data.classes?.find(cls => cls.classId === classId)
        setClassData(foundClass)
        // Set default coach from class
        if (foundClass?.coachId) {
          setTestFormData(prev => ({ ...prev, coachId: foundClass.coachId }))
        }
      }
    } catch (error) {
      console.error('Error fetching class data:', error)
    }
  }

  const fetchSubject = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/subjects', { classId })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const foundSubject = data.subjects?.find(sub => sub.subjectId === subjectId)
        setSubject(foundSubject)
      }
    } catch (error) {
      console.error('Error fetching subject:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/students', { classId })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTests = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/tests', { classId, subjectId })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setTests(data.tests || [])
        // Auto-select first test if available
        if (data.tests && data.tests.length > 0 && !selectedTestId) {
          setSelectedTestId(data.tests[0].testId)
          setSelectedTest(data.tests[0])
        }
      }
    } catch (error) {
      console.error('Error fetching tests:', error)
    }
  }

  const fetchCoaches = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/coaches')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setCoaches(data.coaches || [])
      }
    } catch (error) {
      console.error('Error fetching coaches:', error)
    }
  }

  const fetchMarks = async () => {
    if (!selectedTestId) return
    
    try {
      setMarksLoading(true)
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/marks', { testId: selectedTestId })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        console.log(`[MarksPage] Fetched ${data.marks?.length || 0} marks for test ${selectedTestId}`)
        console.log(`[MarksPage] Students count: ${students.length}`)
        
        const marksMap = {}
        const marksInputMap = {}
        let maxMarksValue = 100
        
        data.marks.forEach(mark => {
          marksMap[mark.studentId] = {
            marks: mark.marks,
            maxMarks: mark.maxMarks,
          }
          marksInputMap[mark.studentId] = {
            marks: mark.marks.toString(),
            maxMarks: mark.maxMarks.toString(),
          }
          if (mark.maxMarks > maxMarksValue) {
            maxMarksValue = mark.maxMarks
          }
        })
        
        console.log(`[MarksPage] Marks map keys:`, Object.keys(marksMap))
        console.log(`[MarksPage] Student IDs:`, students.map(s => s.id))
        
        setMarks(marksMap)
        setMarksInput(marksInputMap)
        setMaxMarks(maxMarksValue)
      } else {
        console.error('Failed to fetch marks:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching marks:', error)
    } finally {
      setMarksLoading(false)
    }
  }

  // Initialize marks input when students or test changes
  useEffect(() => {
    if (students.length > 0 && selectedTestId) {
      const initialMarksInput = {}
      students.forEach(student => {
        if (!marksInput[student.id]) {
          initialMarksInput[student.id] = {
            marks: marks[student.id] ? marks[student.id].marks.toString() : '',
            maxMarks: marks[student.id] ? marks[student.id].maxMarks.toString() : maxMarks.toString(),
          }
        } else {
          initialMarksInput[student.id] = marksInput[student.id]
        }
      })
      setMarksInput(prev => ({ ...prev, ...initialMarksInput }))
    }
  }, [students, selectedTestId])

  const handleTestChange = (testId) => {
    setSelectedTestId(testId)
    const test = tests.find(t => t.testId === testId)
    setSelectedTest(test || null)
    // Clear marks immediately when changing test
    setMarks({})
    setMarksInput({})
  }

  const handleOpenTestDialog = (test = null) => {
    if (test) {
      setEditingTest(test)
      setTestFormData({
        name: test.name,
        date: test.date,
        time: test.time || '',
        coachId: test.coachId || (classData?.coachId || ''),
      })
    } else {
      setEditingTest(null)
      setTestFormData({
        name: '',
        date: '',
        time: '',
        coachId: classData?.coachId || '',
      })
    }
    setIsTestDialogOpen(true)
  }

  const handleCloseTestDialog = () => {
    setIsTestDialogOpen(false)
    setEditingTest(null)
    setTestFormData({ name: '', date: '', time: '', coachId: classData?.coachId || '' })
  }

  const handleSubmitTest = async (e) => {
    e.preventDefault()
    
    if (!testFormData.name.trim() || !testFormData.date) {
      toast({
        title: "Error",
        description: "Test name and date are required",
        variant: "destructive",
      })
      return
    }

    try {
      const url = '/api/tests'
      const method = editingTest ? 'PUT' : 'POST'
      const body = editingTest
        ? {
            id: editingTest.id,
            name: testFormData.name.trim(),
            date: testFormData.date,
            time: testFormData.time,
            coachId: testFormData.coachId || '',
          }
        : {
            name: testFormData.name.trim(),
            date: testFormData.date,
            time: testFormData.time,
            classId: classId,
            subjectId: subjectId,
            coachId: testFormData.coachId || '',
          }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: editingTest ? "Test updated successfully" : "Test created successfully",
        })
        handleCloseTestDialog()
        fetchTests()
        if (!editingTest && result.test) {
          setSelectedTestId(result.test.testId)
          setSelectedTest(result.test)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save test",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving test:', error)
      toast({
        title: "Error",
        description: "Failed to save test",
        variant: "destructive",
      })
    }
  }

  const handleMarksInputChange = (studentId, field, value) => {
    setMarksInput(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      }
    }))
  }

  const handleMaxMarksChange = (value) => {
    const maxMarksValue = parseFloat(value) || 100
    setMaxMarks(maxMarksValue)
    // Update max marks for all students that don't have individual max marks set
    setMarksInput(prev => {
      const updated = { ...prev }
      students.forEach(student => {
        if (!updated[student.id] || !updated[student.id].maxMarks) {
          updated[student.id] = {
            ...updated[student.id],
            maxMarks: maxMarksValue.toString(),
          }
        }
      })
      return updated
    })
  }

  const handleSaveAllMarks = async () => {
    if (!selectedTestId) {
      toast({
        title: "Error",
        description: "Please select a test first",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      // Prepare all students marks from input fields
      const studentsMarks = students.map(student => {
        const input = marksInput[student.id] || { marks: '', maxMarks: maxMarks.toString() }
        const marksValue = input.marks ? parseFloat(input.marks) : 0
        const maxMarksValue = input.maxMarks ? parseFloat(input.maxMarks) : maxMarks

        // Validate marks
        if (marksValue < 0 || marksValue > maxMarksValue) {
          throw new Error(`Invalid marks for ${student.name}: marks must be between 0 and ${maxMarksValue}`)
        }

        return {
          studentId: student.id,
          marks: marksValue,
          maxMarks: maxMarksValue,
        }
      })

      const response = await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          testId: selectedTestId,
          classId: classId,
          subjectId: subjectId,
          students: studentsMarks,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "All marks saved successfully",
        })
        fetchMarks()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save marks",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving marks:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save marks",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getMark = (studentId) => {
    return marks[studentId] || null
  }

  const getPercentage = (marks, maxMarks) => {
    if (!marks || !maxMarks) return 0
    return Math.round((marks / maxMarks) * 100)
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
                  <BreadcrumbLink href="/marks">
                    Marks
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/marks/${classId}`}>
                    {classData?.name || 'Class'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{subject?.name || 'Subject'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {subject ? `${subject.name} - Marks` : 'Student Marks'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage marks for {subject ? subject.name : 'this subject'} in {classData ? classData.name : 'this class'}
            </p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <Label className="text-base font-medium">Select Test</Label>
              <p className="text-sm text-muted-foreground mt-1">Click on a test to view and manage marks</p>
            </div>
            <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenTestDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Test
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmitTest}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTest ? 'Edit Test' : 'Create New Test'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTest ? 'Update test information' : 'Create a new test for this subject'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="testName">Test Name *</Label>
                      <Input
                        id="testName"
                        value={testFormData.name}
                        onChange={(e) => setTestFormData({ ...testFormData, name: e.target.value })}
                        placeholder="e.g., Mid-term Exam, Quiz 1"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="testDate">Date *</Label>
                      <Input
                        id="testDate"
                        type="date"
                        value={testFormData.date}
                        onChange={(e) => setTestFormData({ ...testFormData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="testTime">Time</Label>
                      <Input
                        id="testTime"
                        type="time"
                        value={testFormData.time}
                        onChange={(e) => setTestFormData({ ...testFormData, time: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="coach">Coach</Label>
                      <Select
                        value={testFormData.coachId || 'none'}
                        onValueChange={(value) => setTestFormData({ ...testFormData, coachId: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger id="coach">
                          <SelectValue placeholder="Select coach" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Coach</SelectItem>
                          {coaches.map((coach) => (
                            <SelectItem key={coach.id} value={coach.coachId}>
                              {coach.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCloseTestDialog}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingTest ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {tests.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {tests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  isSelected={selectedTestId === test.testId}
                  onClick={() => handleTestChange(test.testId)}
                />
              ))}
            </div>
          )}


          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : students.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  No students found in this class.
                </p>
                <Button onClick={() => router.push(`/students/${classId}`)}>
                  Add Students
                </Button>
              </div>
            </div>
          ) : !selectedTestId ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Please select or create a test to manage marks.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="maxMarks">Default Max Marks:</Label>
                  <Input
                    id="maxMarks"
                    type="number"
                    min="1"
                    step="1"
                    value={maxMarks}
                    onChange={(e) => handleMaxMarksChange(e.target.value)}
                    className="w-24"
                  />
                </div>
              </div>
              {marksLoading ? (
                <div className="w-full overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-sm w-12">#</TableHead>
                        <TableHead className="text-sm">Student Name</TableHead>
                        <TableHead className="text-sm">Batch</TableHead>
                        <TableHead className="text-sm w-32">Marks</TableHead>
                        <TableHead className="text-sm w-32">Max Marks</TableHead>
                        <TableHead className="text-sm w-32">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(students.length || 5)].map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Skeleton className="h-4 w-6" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-10 w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-10 w-full" />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Skeleton className="h-2 w-full" />
                              <Skeleton className="h-3 w-12" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="w-full overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-sm w-12">#</TableHead>
                        <TableHead className="text-sm">Student Name</TableHead>
                        <TableHead className="text-sm">Batch</TableHead>
                        <TableHead className="text-sm w-32">Marks</TableHead>
                        <TableHead className="text-sm w-32">Max Marks</TableHead>
                        <TableHead className="text-sm w-32">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student, index) => {
                        const mark = getMark(student.id)
                        const input = marksInput[student.id] || { marks: '', maxMarks: maxMarks.toString() }
                        const currentMaxMarks = parseFloat(input.maxMarks) || maxMarks
                        const currentMarks = input.marks ? parseFloat(input.marks) : (mark ? mark.marks : 0)
                        const percentage = currentMarks && currentMaxMarks ? getPercentage(currentMarks, currentMaxMarks) : 0
                        
                        return (
                          <TableRow key={student.id}>
                            <TableCell className="text-xs">{index + 1}</TableCell>
                            <TableCell className="text-sm font-medium">{student.name}</TableCell>
                            <TableCell className="text-xs">{student.batch || '-'}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={input.marks}
                                onChange={(e) => handleMarksInputChange(student.id, 'marks', e.target.value)}
                                placeholder="Enter marks"
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                value={input.maxMarks || maxMarks.toString()}
                                onChange={(e) => handleMarksInputChange(student.id, 'maxMarks', e.target.value)}
                                placeholder={maxMarks.toString()}
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Progress value={percentage} className="h-2" />
                                <span className="text-xs text-muted-foreground">{percentage}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <Button onClick={handleSaveAllMarks} disabled={saving} size="lg">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save All Marks'}
                </Button>
              </div>
            </>
          )}

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
