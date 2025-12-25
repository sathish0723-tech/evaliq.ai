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
import { Plus, ArrowLeft, BookOpen, Trash2, Pencil } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function SubjectsByClassPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.classId
  const [subjects, setSubjects] = useState([])
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [subjectFormData, setSubjectFormData] = useState({ name: '' })
  const { toast } = useToast()

  useEffect(() => {
    if (classId) {
      fetchClassData()
      fetchSubjects()
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
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenSubjectDialog = (subject = null) => {
    if (subject) {
      setEditingSubject(subject)
      setSubjectFormData({ name: subject.name })
    } else {
      setEditingSubject(null)
      setSubjectFormData({ name: '' })
    }
    setIsSubjectDialogOpen(true)
  }

  const handleCloseSubjectDialog = () => {
    setIsSubjectDialogOpen(false)
    setEditingSubject(null)
    setSubjectFormData({ name: '' })
  }

  const handleSubmitSubject = async (e) => {
    e.preventDefault()
    
    if (!subjectFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Subject name is required",
        variant: "destructive",
      })
      return
    }

    try {
      const url = '/api/subjects'
      const method = editingSubject ? 'PUT' : 'POST'
      const body = editingSubject
        ? {
            id: editingSubject.id,
            name: subjectFormData.name.trim(),
          }
        : {
            name: subjectFormData.name.trim(),
            classId: classId,
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
          description: editingSubject ? "Subject updated successfully" : "Subject created successfully",
        })
        handleCloseSubjectDialog()
        fetchSubjects()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save subject",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving subject:', error)
      toast({
        title: "Error",
        description: "Failed to save subject",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSubject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this subject? All marks for this subject will also be deleted.')) return

    try {
      const response = await fetch(`/api/subjects?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Subject deleted successfully",
        })
        fetchSubjects()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete subject",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting subject:', error)
      toast({
        title: "Error",
        description: "Failed to delete subject",
        variant: "destructive",
      })
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/subjects">
                    Subjects
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
                  onClick={() => router.push('/subjects')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-lg font-semibold tracking-tight">
                  {classData ? `${classData.name} - Subjects` : 'Subjects'}
                </h1>
              </div>
              <p className="text-xs text-muted-foreground">
                Create and manage subjects for this class
              </p>
            </div>
            <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenSubjectDialog()}>
                  <Plus className="mr-1.5 h-3 w-3" />
                  Create Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmitSubject}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingSubject ? 'Edit Subject' : 'Create New Subject'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingSubject ? 'Update subject name' : 'Add a new subject to this class'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="subjectName">Subject Name *</Label>
                      <Input
                        id="subjectName"
                        value={subjectFormData.name}
                        onChange={(e) => setSubjectFormData({ name: e.target.value })}
                        placeholder="e.g., Mathematics, Science"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCloseSubjectDialog}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingSubject ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading subjects...</div>
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  No subjects found. Add a subject to get started.
                </p>
                <Button onClick={() => handleOpenSubjectDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Subject
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => (
                <Card 
                  key={subject.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">{subject.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleOpenSubjectDialog(subject)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => handleDeleteSubject(subject.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BookOpen className="h-3 w-3" />
                      <span>Subject for {classData?.name || 'this class'}</span>
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




