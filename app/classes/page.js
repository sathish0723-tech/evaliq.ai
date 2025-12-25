"use client"

import { useState, useEffect } from "react"
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
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ClassesPage() {
  const [classes, setClasses] = useState([])
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '', coachId: 'none' })
  const { toast } = useToast()

  useEffect(() => {
    fetchClasses()
    fetchCoaches()
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
        toast({
          title: "Error",
          description: "Failed to fetch classes",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      toast({
        title: "Error",
        description: "Failed to fetch classes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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

  const handleOpenDialog = (cls = null) => {
    if (cls) {
      setEditingClass(cls)
      setFormData({ 
        name: cls.name, 
        description: cls.description || '',
        coachId: cls.coachId || 'none'
      })
    } else {
      setEditingClass(null)
      setFormData({ name: '', description: '', coachId: 'none' })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingClass(null)
    setFormData({ name: '', description: '', coachId: 'none' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const url = '/api/classes'
      const method = editingClass ? 'PUT' : 'POST'
      const body = editingClass
        ? { 
            id: editingClass.id, 
            name: formData.name,
            description: formData.description,
            coachId: formData.coachId !== 'none' ? formData.coachId : ''
          }
        : {
            name: formData.name,
            description: formData.description,
            coachId: formData.coachId !== 'none' ? formData.coachId : ''
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
          description: editingClass ? "Class updated successfully" : "Class created successfully",
        })
        handleCloseDialog()
        fetchClasses()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save class",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving class:', error)
      toast({
        title: "Error",
        description: "Failed to save class",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this class?')) return

    try {
      const response = await fetch(`/api/classes?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Class deleted successfully",
        })
        fetchClasses()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete class",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting class:', error)
      toast({
        title: "Error",
        description: "Failed to delete class",
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
                <BreadcrumbItem>
                  <BreadcrumbPage>Classes</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Classes</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your classes
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-3 w-3" />
                  Add Class
                </Button>
              </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleSubmit}>
                      <DialogHeader>
                        <DialogTitle>
                          {editingClass ? 'Edit Class' : 'Create New Class'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingClass ? 'Update class information' : 'Add a new class to your system'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Class Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Math 101"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Optional description"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="coach">Coach</Label>
                          <Select 
                            value={formData.coachId} 
                            onValueChange={(value) => setFormData({ ...formData, coachId: value })}
                          >
                            <SelectTrigger id="coach">
                              <SelectValue placeholder="Select a coach" />
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
                        <Button type="button" variant="outline" onClick={handleCloseDialog}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingClass ? 'Update' : 'Create'}
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
              ) : classes.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">No classes found</p>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Class
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-sm">Class ID</TableHead>
                        <TableHead className="text-sm">Name</TableHead>
                        <TableHead className="text-sm">Description</TableHead>
                        <TableHead className="text-sm">Coach</TableHead>
                        <TableHead className="text-sm">Students</TableHead>
                        <TableHead className="text-right text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classes.map((cls) => (
                        <TableRow key={cls.id}>
                          <TableCell className="font-mono text-xs">{cls.classId}</TableCell>
                          <TableCell className="text-sm">{cls.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {cls.description || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {cls.coachName || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {cls.studentCount || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleOpenDialog(cls)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDelete(cls.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

