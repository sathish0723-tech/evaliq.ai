"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppSidebar } from '@/components/app-sidebar'
import { useApp } from '@/contexts/app-context'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, ArrowLeft, Calendar, Clock, BookOpen, Trash2, Pencil, Play, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function TestsByClassPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useApp()
  const classId = params.classId
  const [tests, setTests] = useState([])
  const [subjects, setSubjects] = useState([])
  const [coaches, setCoaches] = useState([])
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [completedTests, setCompletedTests] = useState([])
  const isStudent = user?.role === 'student'
  const { toast } = useToast()

  const [testFormData, setTestFormData] = useState({
    name: '',
    date: '',
    time: '',
    subjectId: '',
    coachId: '',
  })

  useEffect(() => {
    if (classId) {
      fetchClassData()
      fetchSubjects()
      fetchCoaches()
      fetchTests()
    }
  }, [classId])

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

  const fetchSubjects = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/subjects', { classId })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setSubjects(data.subjects || [])
        // Set default subject if available
        if (data.subjects?.length > 0 && !testFormData.subjectId) {
          setTestFormData(prev => ({ ...prev, subjectId: data.subjects[0].subjectId }))
        }
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
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

  const isScheduledTimeReached = (test) => {
    if (!test.date) return false
    
    const now = new Date()
    
    // Parse the scheduled date (assuming YYYY-MM-DD format)
    const dateParts = test.date.split('-')
    if (dateParts.length !== 3) return false
    
    const scheduledDate = new Date()
    scheduledDate.setFullYear(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
    
    // If time is provided, combine date and time
    if (test.time && test.time.trim()) {
      const [hours, minutes] = test.time.split(':').map(Number)
      scheduledDate.setHours(hours || 0, minutes || 0, 0, 0)
    } else {
      // If no time, set to start of day (00:00:00) in local timezone
      scheduledDate.setHours(0, 0, 0, 0)
    }
    
    // Only show if current time is >= scheduled time
    return now >= scheduledDate
  }

  const fetchTests = async () => {
    try {
      setLoading(true)
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/tests', { classId })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        let allTests = data.tests || []
        
        // For students, filter by published status and scheduled time
        if (isStudent) {
          allTests = allTests.filter(test => {
            // Must be published
            if (!test.published) return false
            // Must have reached scheduled date/time
            return isScheduledTimeReached(test)
          })
        }
        
        setTests(allTests)
        
        // Fetch completed tests for students
        if (isStudent) {
          fetchCompletedTests(allTests.map(t => t.testId))
        }
      } else {
        console.error('Failed to fetch tests')
        setTests([])
      }
    } catch (error) {
      console.error('Error fetching tests:', error)
      setTests([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCompletedTests = async (testIds) => {
    try {
      // Get current student's email from user context
      if (!user?.email) return
      
      const response = await fetch('/api/test-completed', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        // Filter completed tests for current student and matching testIds
        const completed = (data.completedTests || [])
          .filter(ct => 
            ct.studentEmail === user.email && 
            testIds.includes(ct.testId)
          )
          .map(ct => ct.testId)
        setCompletedTests(completed)
      }
    } catch (error) {
      console.error('Error fetching completed tests:', error)
    }
  }

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true)
    // Reset form
    setTestFormData({
      name: '',
      date: '',
      time: '',
      subjectId: subjects.length > 0 ? subjects[0].subjectId : '',
      coachId: classData?.coachId || '',
    })
  }

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false)
    setTestFormData({
      name: '',
      date: '',
      time: '',
      subjectId: subjects.length > 0 ? subjects[0].subjectId : '',
      coachId: classData?.coachId || '',
    })
  }

  const handleCreateTest = async (e) => {
    e.preventDefault()
    
    if (!testFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Test name is required",
        variant: "destructive",
      })
      return
    }

    if (!testFormData.date) {
      toast({
        title: "Error",
        description: "Test date is required",
        variant: "destructive",
      })
      return
    }

    if (!testFormData.subjectId) {
      toast({
        title: "Error",
        description: "Please select a subject",
        variant: "destructive",
      })
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: testFormData.name.trim(),
          date: testFormData.date,
          time: testFormData.time || '',
          classId: classId,
          subjectId: testFormData.subjectId,
          coachId: testFormData.coachId || '',
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Test created successfully",
        })
        handleCloseCreateDialog()
        // Redirect to questions page
        if (result.test?.testId) {
          router.push(`/tests/${classId}/${result.test.testId}`)
        } else {
          fetchTests()
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create test",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating test:', error)
      toast({
        title: "Error",
        description: "Failed to create test",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteTest = async (testId) => {
    if (!confirm('Are you sure you want to delete this test? All marks for this test will also be deleted.')) return

    try {
      const response = await fetch(`/api/tests?id=${testId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Test deleted successfully",
        })
        fetchTests()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete test",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting test:', error)
      toast({
        title: "Error",
        description: "Failed to delete test",
        variant: "destructive",
      })
    }
  }

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.subjectId === subjectId)
    return subject?.name || 'Unknown Subject'
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    if (timeString) {
      return `${dateStr} at ${timeString}`
    }
    return dateStr
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    }
    const config = statusConfig[status] || statusConfig.scheduled
    const Icon = config.icon
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </div>
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/tests">
                    Tests
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{classData?.name || 'Class'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/tests')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-lg font-semibold tracking-tight">
                  Tests - {classData?.name || 'Class'}
                </h1>
              </div>
              <p className="text-xs text-muted-foreground">
                {isStudent 
                  ? 'View and take available tests for this class'
                  : 'Create and manage tests for this class'}
              </p>
            </div>
            {!isStudent && (
              <Button onClick={handleOpenCreateDialog} disabled={subjects.length === 0} size="sm">
                <Plus className="h-3 w-3 mr-1.5" />
                Create Test
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading tests...</div>
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  No subjects found. Please add subjects to this class first.
                </p>
                <Button onClick={() => router.push(`/marks/${classId}`)}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Manage Subjects
                </Button>
              </div>
            </div>
          ) : tests.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {isStudent 
                    ? 'No published tests available for this class.'
                    : 'No tests found. Create your first test.'}
                </p>
                {!isStudent && (
                  <Button onClick={handleOpenCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Test
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tests.map((test) => {
                const isCompleted = completedTests.includes(test.testId)
                return (
                  <Card key={test.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base font-medium">{test.name}</CardTitle>
                      <CardDescription className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2 text-xs">
                          <BookOpen className="h-3 w-3" />
                          <span>{getSubjectName(test.subjectId)}</span>
                        </div>
                        {test.status && (
                          <div className="flex items-center gap-2">
                            {getStatusBadge(test.status)}
                          </div>
                        )}
                        {isStudent && test.status === 'scheduled' && (test.date || test.time) && (
                          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-2">
                              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                                  Scheduled
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  {formatDateTime(test.date, test.time)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {!isStudent && (
                          <>
                            <div className="flex items-center gap-2 text-xs">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(test.date)}</span>
                            </div>
                            {test.time && (
                              <div className="flex items-center gap-2 text-xs">
                                <Clock className="h-3 w-3" />
                                <span>{test.time}</span>
                              </div>
                            )}
                          </>
                        )}
                        {isStudent && isCompleted && (
                          <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>You Completed</span>
                          </div>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isStudent ? (
                        <Button
                          variant={isCompleted || test.status === 'completed' ? "outline" : "default"}
                          size="sm"
                          className="w-full"
                          onClick={() => router.push(`/tests/take/${test.testId}`)}
                          disabled={isCompleted || test.status === 'completed' || test.status === 'cancelled'}
                        >
                          {isCompleted || test.status === 'completed' ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Already Completed
                            </>
                          ) : test.status === 'cancelled' ? (
                            <>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Test Cancelled
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Take Test
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/tests/${classId}/${test.testId}`)}
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            Manage Questions
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteTest(test.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Create Test Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Test</DialogTitle>
                <DialogDescription>
                  Create a new test for this class. Fill in the required information.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTest}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="testName">Test Name *</Label>
                    <Input
                      id="testName"
                      value={testFormData.name}
                      onChange={(e) => setTestFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Midterm Exam, Quiz 1"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="subjectId">Subject *</Label>
                    <select
                      id="subjectId"
                      value={testFormData.subjectId}
                      onChange={(e) => setTestFormData(prev => ({ ...prev, subjectId: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Select a subject</option>
                      {subjects.map((subject) => (
                        <option key={subject.subjectId} value={subject.subjectId}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="testDate">Date *</Label>
                    <Input
                      id="testDate"
                      type="date"
                      value={testFormData.date}
                      onChange={(e) => setTestFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="testTime">Time (Optional)</Label>
                    <Input
                      id="testTime"
                      type="time"
                      value={testFormData.time}
                      onChange={(e) => setTestFormData(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                  {coaches.length > 0 && (
                    <div className="grid gap-2">
                      <Label htmlFor="coachId">Coach (Optional)</Label>
                      <select
                        id="coachId"
                        value={testFormData.coachId}
                        onChange={(e) => setTestFormData(prev => ({ ...prev, coachId: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">No coach</option>
                        {coaches.map((coach) => (
                          <option key={coach.coachId} value={coach.coachId}>
                            {coach.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseCreateDialog}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Test'}
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

