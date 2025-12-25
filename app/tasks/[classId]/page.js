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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function ClassTasksPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.classId
  const { user } = useApp()

  const [students, setStudents] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [taskType, setTaskType] = useState(null) // 'manual' or 'common'
  const [selectedStudent, setSelectedStudent] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskStatus, setTaskStatus] = useState('pending')
  const [taskFeedback, setTaskFeedback] = useState('')
  const [taskDeadline, setTaskDeadline] = useState('')
  const [creating, setCreating] = useState(false)

  // Check if user can add/edit tasks (admin or coach only)
  const canManageTasks = user?.role === 'admin' || user?.role === 'coach'

  useEffect(() => {
    if (classId) {
      fetchStudents()
      fetchTasks()
    }
  }, [classId])

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

  const fetchTasks = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/tasks', { classId })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const handleCreateTask = async () => {
    if (taskType === 'manual' && !selectedStudent) {
      alert('Please select a student')
      return
    }
    
    if (!taskDescription.trim()) {
      alert('Please enter a task description')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          classId,
          studentId: taskType === 'manual' ? selectedStudent : null,
          isCommonTask: taskType === 'common',
          description: taskDescription,
          status: taskStatus,
          feedback: taskFeedback,
          deadline: taskDeadline || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // If common task, multiple tasks were created
        if (data.tasks && Array.isArray(data.tasks)) {
          setTasks([...data.tasks, ...tasks])
        } else if (data.task) {
        setTasks([data.task, ...tasks])
        }
        setShowCreateForm(false)
        setTaskType(null)
        setSelectedStudent('')
        setTaskDescription('')
        setTaskStatus('pending')
        setTaskFeedback('')
        setTaskDeadline('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create task')
      }
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task')
    } finally {
      setCreating(false)
    }
  }

  const handleDialogClose = (open) => {
    setShowCreateForm(open)
    if (!open) {
      // Reset form when dialog closes
      setTaskType(null)
      setSelectedStudent('')
      setTaskDescription('')
      setTaskStatus('pending')
      setTaskFeedback('')
      setTaskDeadline('')
    }
  }

  const handleUpdateTask = async (taskId, status, feedback) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          taskId,
          status,
          feedback,
        }),
      })

      if (response.ok) {
        fetchTasks()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update task')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task')
    }
  }

  // Calculate task statistics per student
  const getStudentTaskStats = (studentId) => {
    // Tasks have studentId as ObjectId, so we need to compare properly
    const studentTasks = tasks.filter(t => {
      const taskStudentId = t.studentId?.toString() || t.studentId
      return taskStudentId === studentId
    })
    return {
      total: studentTasks.length,
      pending: studentTasks.filter(t => t.status === 'pending').length,
      process: studentTasks.filter(t => t.status === 'process').length,
      completed: studentTasks.filter(t => t.status === 'completed').length,
    }
  }

  // Get unique students with their task counts
  const studentsWithStats = students.map(student => {
    // Students API returns 'id' field, not '_id'
    const studentId = student.id || student._id?.toString()
    if (!studentId) {
      return {
        ...student,
        taskStats: { total: 0, pending: 0, process: 0, completed: 0 },
      }
    }
    const stats = getStudentTaskStats(studentId)
    return {
      ...student,
      taskStats: stats,
    }
  })

  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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
                  <BreadcrumbPage>Class Tasks</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Task Management</h1>
              <p className="text-muted-foreground">
                {canManageTasks ? 'Create and manage tasks for students' : 'View tasks for students'}
              </p>
            </div>
            {canManageTasks && (
              <Dialog open={showCreateForm} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    {taskType === null
                      ? 'Choose the type of task you want to create'
                      : taskType === 'manual'
                      ? 'Assign a task to a specific student'
                      : 'Assign a task to all students in this class'}
                  </DialogDescription>
                </DialogHeader>
                {taskType === null ? (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center gap-2"
                        onClick={() => setTaskType('manual')}
                      >
                        <div className="text-lg font-semibold">Manual Task</div>
                        <div className="text-sm text-muted-foreground">For one student only</div>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center gap-2"
                        onClick={() => setTaskType('common')}
                      >
                        <div className="text-lg font-semibold">Common Task</div>
                        <div className="text-sm text-muted-foreground">For all students</div>
                      </Button>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        Task Type: {taskType === 'manual' ? 'Manual Task' : 'Common Task'}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTaskType(null)}
                      >
                        Change Type
                      </Button>
                    </div>
                    {taskType === 'manual' && (
                  <div className="space-y-2">
                    <Label htmlFor="student">Student</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger id="student">
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => {
                          const studentId = student.id || student._id?.toString()
                          return (
                            <SelectItem key={studentId} value={studentId}>
                              {student.name}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                    )}
                    {taskType === 'common' && (
                      <div className="rounded-lg bg-muted p-3">
                        <div className="text-sm font-medium mb-1">All Students</div>
                        <div className="text-xs text-muted-foreground">
                          This task will be assigned to all {students.length} students in this class
                        </div>
                      </div>
                    )}
                  <div className="space-y-2">
                    <Label htmlFor="description">Task Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter task description..."
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={taskStatus} onValueChange={setTaskStatus}>
                      <SelectTrigger id="status">
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
                      <Label htmlFor="deadline">Deadline (Optional)</Label>
                      <Input
                        id="deadline"
                        type="datetime-local"
                        value={taskDeadline}
                        onChange={(e) => setTaskDeadline(e.target.value)}
                      />
                    </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Feedback (Optional)</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Enter feedback..."
                      value={taskFeedback}
                      onChange={(e) => setTaskFeedback(e.target.value)}
                      rows={3}
                    />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTask} disabled={creating}>
                    {creating ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Students & Tasks</CardTitle>
                <CardDescription>
                  View task statistics and manage tasks for each student
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Total Tasks</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>In Process</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsWithStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No students found
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentsWithStats.map((student) => {
                        const studentId = student.id || student._id?.toString()
                        return (
                          <TableRow key={studentId}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={student.photo || student.image} alt={student.name} />
                                  <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{student.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{student.taskStats.total}</TableCell>
                            <TableCell>{student.taskStats.pending}</TableCell>
                            <TableCell>{student.taskStats.process}</TableCell>
                            <TableCell>{student.taskStats.completed}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/tasks/student/${studentId}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

