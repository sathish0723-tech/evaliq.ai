"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

export default function SubjectsPage() {
  const router = useRouter()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false)
  const [subjectFormData, setSubjectFormData] = useState({ name: '' })
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchClasses()
  }, [])

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
    router.push(`/subjects/${classId}`)
  }

  const handleOpenSubjectDialog = () => {
    setIsSubjectDialogOpen(true)
    setSubjectFormData({ name: '' })
  }

  const handleCloseSubjectDialog = () => {
    setIsSubjectDialogOpen(false)
    setSubjectFormData({ name: '' })
  }

  const handleCreateSubjectForAllClasses = async (e) => {
    e.preventDefault()
    
    if (!subjectFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Subject name is required",
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

      // Create subject for each class
      for (const cls of classes) {
        try {
          const response = await fetch('/api/subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: subjectFormData.name.trim(),
              classId: cls.classId,
            }),
          })

          const result = await response.json()

          if (response.ok) {
            successCount++
          } else {
            errorCount++
            errors.push(`${cls.name}: ${result.error || 'Failed to create subject'}`)
          }
        } catch (error) {
          errorCount++
          errors.push(`${cls.name}: ${error.message || 'Failed to create subject'}`)
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `Subject "${subjectFormData.name.trim()}" created for ${successCount} class${successCount !== 1 ? 'es' : ''}${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
        })
        handleCloseSubjectDialog()
        // Optionally refresh the page or classes
      } else {
        toast({
          title: "Error",
          description: `Failed to create subject for all classes. ${errors.join('; ')}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating subject:', error)
      toast({
        title: "Error",
        description: "Failed to create subject",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
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
                  <BreadcrumbPage>Subjects</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Subjects</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Select a class to create and manage subjects
              </p>
            </div>
            <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleOpenSubjectDialog} disabled={classes.length === 0}>
                  <Plus className="mr-1.5 h-3 w-3" />
                  Create Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateSubjectForAllClasses}>
                  <DialogHeader>
                    <DialogTitle>Create Subject for All Classes</DialogTitle>
                    <DialogDescription>
                      Create a subject that will be added to all classes. This subject will be available across all sections.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="subjectName">Subject Name *</Label>
                      <Input
                        id="subjectName"
                        value={subjectFormData.name}
                        onChange={(e) => setSubjectFormData({ name: e.target.value })}
                        placeholder="e.g., Mathematics, Science, English"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        This subject will be created for all {classes.length} class{classes.length !== 1 ? 'es' : ''}.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseSubjectDialog}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating || classes.length === 0}>
                      {creating ? 'Creating...' : 'Create for All Classes'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {loading ? (
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
                        <span>Click to manage subjects</span>
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

