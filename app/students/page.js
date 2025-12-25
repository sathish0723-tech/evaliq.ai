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
import { User } from 'lucide-react'

export default function StudentsPage() {
  const router = useRouter()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/classes')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      } else {
        console.error('Failed to fetch classes')
        setClasses([])
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  const handleClassClick = (classId) => {
    router.push(`/students/${classId}`)
  }

  const handleOpenDialog = (student = null) => {
    if (student) {
      setEditingStudent(student)
      setFormData({
        name: student.name,
        email: student.email,
        phone: student.phone || '',
        photo: student.photo || '',
      })
      setPhotoPreview(student.photo || '')
      setSelectedClass(student.classId || 'none')
    } else {
      setEditingStudent(null)
      setFormData({ name: '', email: '', phone: '', photo: '' })
      setPhotoPreview('')
      setSelectedClass('none')
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingStudent(null)
    setFormData({ name: '', email: '', phone: '', photo: '' })
    setPhotoPreview('')
    setSelectedClass('')
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const uploadResult = await uploadResponse.json()

      if (uploadResponse.ok) {
        setFormData(prev => ({ ...prev, photo: uploadResult.url }))
        setPhotoPreview(uploadResult.url)
        toast({
          title: "Success",
          description: "Photo uploaded successfully",
        })
      } else {
        toast({
          title: "Error",
          description: uploadResult.error || "Failed to upload photo",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      })
      return
    }

    try {
      const url = '/api/students'
      const method = editingStudent ? 'PUT' : 'POST'
      const body = editingStudent
        ? {
            id: editingStudent.id,
            ...formData,
            classId: selectedClass || '',
          }
        : {
            ...formData,
            classId: selectedClass || '',
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
          description: editingStudent ? "Student updated successfully" : "Student created successfully",
        })
        handleCloseDialog()
        fetchStudents()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save student",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving student:', error)
      toast({
        title: "Error",
        description: "Failed to save student",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    try {
      const response = await fetch(`/api/students?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Student deleted successfully",
        })
        fetchStudents()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete student",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting student:', error)
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      })
    }
  }

  const getClassName = (classId) => {
    const cls = classes.find(c => c.classId === classId)
    return cls ? cls.name : classId || 'No Class'
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
                  <BreadcrumbPage>Students</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Students</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select a class to view students
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading classes...</div>
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
                      <p className="text-xs text-muted-foreground">
                        Students: {cls.studentCount || 0}
                      </p>
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

