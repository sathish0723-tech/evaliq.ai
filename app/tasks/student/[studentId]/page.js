"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { AppSidebar } from '@/components/app-sidebar'
import { useApp } from '@/contexts/app-context'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function StudentTasksPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.studentId
  const { user } = useApp()

  const [student, setStudent] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState(null)
  const [editStatus, setEditStatus] = useState('')
  const [editFeedback, setEditFeedback] = useState('')
  const [updating, setUpdating] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Check if user can edit tasks (admin or coach only)
  const canManageTasks = user?.role === 'admin' || user?.role === 'coach'

  useEffect(() => {
    if (studentId) {
      fetchStudentTasks()
    }
  }, [studentId])

  const fetchStudentTasks = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/tasks', { studentId })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
        if (data.tasks && data.tasks.length > 0) {
          setStudent({
            name: data.tasks[0].studentName,
            email: data.tasks[0].studentEmail,
            image: data.tasks[0].studentImage,
          })
        }
      }
    } catch (error) {
      console.error('Error fetching student tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTask = async () => {
    if (!editingTask) return

    setUpdating(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          taskId: editingTask.taskId,
          status: editStatus,
          feedback: editFeedback,
        }),
      })

      if (response.ok) {
        fetchStudentTasks()
        setEditingTask(null)
        setEditStatus('')
        setEditFeedback('')
        setEditDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update task')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task')
    } finally {
      setUpdating(false)
    }
  }

  const openEditDialog = (task) => {
    setEditingTask(task)
    setEditStatus(task.status)
    setEditFeedback(task.feedback || '')
    setEditDialogOpen(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500'
      case 'process':
        return 'bg-blue-500/10 text-blue-500'
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500'
      default:
        return 'bg-gray-500/10 text-gray-500'
    }
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    process: tasks.filter(t => t.status === 'process').length,
    completed: tasks.filter(t => t.status === 'completed').length,
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
                <BreadcrumbItem>
                  <BreadcrumbLink href="/tasks">Task Management</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Student Tasks</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <>
              {student && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.image} alt={student.name} />
                        <AvatarFallback className="text-sm">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{student.name}</CardTitle>
                        <CardDescription className="text-xs">{student.email}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <div className="text-xl font-bold">{taskStats.total}</div>
                        <div className="text-xs text-muted-foreground">Total Tasks</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-yellow-500">{taskStats.pending}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-blue-500">{taskStats.process}</div>
                        <div className="text-xs text-muted-foreground">In Process</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-500">{taskStats.completed}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>All Tasks</CardTitle>
                  <CardDescription>
                    {canManageTasks ? 'View and update task status and feedback' : 'View task status and feedback'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No tasks found for this student
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <Card key={task._id.toString()}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Badge className={getStatusColor(task.status)}>
                                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(task.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <CardTitle className="text-sm">{task.description}</CardTitle>
                              </div>
                              {canManageTasks && (
                                <Dialog open={editDialogOpen && editingTask?._id.toString() === task._id.toString()} onOpenChange={setEditDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                      onClick={() => openEditDialog(task)}
                                    >
                                      Update
                                    </Button>
                                  </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Update Task</DialogTitle>
                                    <DialogDescription>
                                      Update task status and add feedback
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Status</Label>
                                      <Select
                                        value={editStatus}
                                        onValueChange={setEditStatus}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">Pending</SelectItem>
                                          <SelectItem value="process">In Process</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Feedback</Label>
                                      <Textarea
                                        placeholder="Enter feedback..."
                                        value={editFeedback}
                                        onChange={(e) => setEditFeedback(e.target.value)}
                                        rows={4}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setEditingTask(null)
                                        setEditStatus('')
                                        setEditFeedback('')
                                        setEditDialogOpen(false)
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button onClick={handleUpdateTask} disabled={updating}>
                                      {updating ? 'Updating...' : 'Update Task'}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              )}
                            </div>
                          </CardHeader>
                          {task.feedback && (
                            <CardContent className="pt-0">
                              <div className="rounded-lg bg-muted p-2.5">
                                <div className="text-xs font-medium mb-1">Feedback:</div>
                                <div className="text-xs text-muted-foreground">{task.feedback}</div>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

