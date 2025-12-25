"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { User, BookOpen, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function TestsPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useApp()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [creating, setCreating] = useState(false)
  const [testFormData, setTestFormData] = useState({
    name: '',
    date: '',
    time: '',
    subjectId: '',
  })
  const { toast } = useToast()
  const isStudent = user?.role === 'student'

  useEffect(() => {
    // Wait for user to be loaded before fetching classes
    if (!userLoading && user) {
      fetchClasses()
      if (!isStudent) {
        fetchAllSubjects()
      }
    } else if (!userLoading && !user) {
      setLoading(false)
      setError('Please log in to view tests')
    }
  }, [user, userLoading, isStudent])

  const fetchClasses = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/classes')
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch classes:', response.status, errorData)
        if (response.status === 401) {
          setError('Session expired. Please refresh the page or log in again.')
          console.error('Unauthorized - Session may have expired')
        } else {
          setError('Failed to load classes. Please try again.')
        }
        setClasses([])
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      setError('An error occurred while loading classes. Please try again.')
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  const handleClassClick = (classId) => {
    router.push(`/tests/${classId}`)
  }

  const fetchAllSubjects = async () => {
    try {
      setLoadingSubjects(true)
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/subjects')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        // Get unique subjects by name (since same subject name might exist in multiple classes)
        const uniqueSubjects = []
        const seenNames = new Set()
        data.subjects?.forEach(subject => {
          if (!seenNames.has(subject.name)) {
            seenNames.add(subject.name)
            uniqueSubjects.push(subject)
          }
        })
        setSubjects(uniqueSubjects)
        // Set default subject if available
        if (uniqueSubjects.length > 0 && !testFormData.subjectId) {
          setTestFormData(prev => ({ ...prev, subjectId: uniqueSubjects[0].subjectId }))
        }
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
      setSubjects([])
    } finally {
      setLoadingSubjects(false)
    }
  }

  const handleOpenTestDialog = () => {
    setIsTestDialogOpen(true)
    setTestFormData({
      name: '',
      date: '',
      time: '',
      subjectId: subjects.length > 0 ? subjects[0].subjectId : '',
    })
  }

  const handleCloseTestDialog = () => {
    setIsTestDialogOpen(false)
    setTestFormData({
      name: '',
      date: '',
      time: '',
      subjectId: subjects.length > 0 ? subjects[0].subjectId : '',
    })
  }

  const handleCreateTestForAllClasses = async (e) => {
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

    if (classes.length === 0) {
      toast({
        title: "Error",
        description: "No classes available. Please create a class first.",
        variant: "destructive",
      })
      return
    }

    try {
      setCreating(true)
      let successCount = 0
      let errorCount = 0
      const errors = []
      const createdTests = []

      // Create test for each class
      for (const cls of classes) {
        try {
          // Find subject for this class (by name match)
          const subjectForClass = await findSubjectForClass(cls.classId, testFormData.subjectId)
          
          if (!subjectForClass) {
            errorCount++
            errors.push(`${cls.name}: Subject not found in this class`)
            continue
          }

          const response = await fetch('/api/tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: testFormData.name.trim(),
              date: testFormData.date,
              time: testFormData.time || '',
              classId: cls.classId,
              subjectId: subjectForClass.subjectId,
              coachId: cls.coachId || '',
            }),
          })

          const result = await response.json()

          if (response.ok) {
            successCount++
            if (result.test?.testId) {
              createdTests.push({ classId: cls.classId, testId: result.test.testId, className: cls.name })
            }
          } else {
            errorCount++
            errors.push(`${cls.name}: ${result.error || 'Failed to create test'}`)
          }
        } catch (error) {
          errorCount++
          errors.push(`${cls.name}: ${error.message || 'Failed to create test'}`)
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `Test "${testFormData.name.trim()}" created for ${successCount} class${successCount !== 1 ? 'es' : ''}${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
        })
        handleCloseTestDialog()
        // Optionally redirect to first created test or refresh
        if (createdTests.length > 0) {
          // Could redirect to first test's questions page
          // router.push(`/tests/${createdTests[0].classId}/${createdTests[0].testId}`)
        }
      } else {
        toast({
          title: "Error",
          description: `Failed to create test for all classes. ${errors.join('; ')}`,
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

  const findSubjectForClass = async (classId, subjectId) => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/subjects', { classId })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        // First try to find by subjectId
        let subject = data.subjects?.find(s => s.subjectId === subjectId)
        // If not found, try to find by name (in case subjectId doesn't match but name does)
        if (!subject && subjects.length > 0) {
          const selectedSubject = subjects.find(s => s.subjectId === subjectId)
          if (selectedSubject) {
            subject = data.subjects?.find(s => s.name === selectedSubject.name)
          }
        }
        return subject
      }
    } catch (error) {
      console.error('Error finding subject for class:', error)
    }
    return null
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
                  <BreadcrumbPage>Tests</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Tests</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.role === 'student' 
                  ? 'Select a class to view available tests'
                  : 'Select a class to create and manage tests'}
              </p>
            </div>
            {!isStudent && (
              <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={handleOpenTestDialog} disabled={classes.length === 0 || subjects.length === 0}>
                    <Plus className="mr-1.5 h-3 w-3" />
                    Create Test
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <form onSubmit={handleCreateTestForAllClasses}>
                    <DialogHeader>
                      <DialogTitle>Create Test for All Classes</DialogTitle>
                      <DialogDescription>
                        Create a test that will be added to all classes. This test will be available across all sections.
                      </DialogDescription>
                    </DialogHeader>
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
                          disabled={loadingSubjects}
                        >
                          <option value="">
                            {loadingSubjects ? 'Loading subjects...' : 'Select a subject'}
                          </option>
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
                      <p className="text-xs text-muted-foreground">
                        This test will be created for all {classes.length} class{classes.length !== 1 ? 'es' : ''} with the selected subject.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseTestDialog}
                        disabled={creating}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creating || classes.length === 0 || subjects.length === 0}>
                        {creating ? 'Creating...' : 'Create for All Classes'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {loading || userLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading classes...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => {
                  setError(null)
                  fetchClasses()
                }}>
                  Retry
                </Button>
              </div>
            </div>
          ) : classes.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No classes found</p>
                <Button onClick={() => router.push('/classes')}>
                  Create Class
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => (
                <Card 
                  key={cls.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleClassClick(cls.classId)}
                >
                  <CardHeader>
                    <CardTitle className="text-base font-medium">{cls.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1 text-xs">
                      <User className="h-3 w-3" />
                      <span>Coach: {cls.coachName || 'Not assigned'}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      {cls.description && (
                        <p className="text-xs text-muted-foreground">
                          {cls.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        <span>{user?.role === 'student' ? 'Click to view tests' : 'Click to manage tests'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

