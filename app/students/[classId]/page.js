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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, Pencil, Trash2, Upload, MessageSquare, Users, Calendar as CalendarIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getUserInitials } from '@/lib/utils-user'
import Copilot from '@/components/copilot'
import Calendar from '@/components/calendar-range'
import { format } from 'date-fns'

export default function StudentsByClassPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.classId
  const [students, setStudents] = useState([])
  const [classData, setClassData] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    photo: '',
    batch: '',
  })
  const [photoPreview, setPhotoPreview] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [selectedStudentsData, setSelectedStudentsData] = useState([])
  const [showCopilot, setShowCopilot] = useState(false)
  const [isSquadDialogOpen, setIsSquadDialogOpen] = useState(false)
  const [squadFormData, setSquadFormData] = useState({
    name: '',
    selectedStudentIds: [],
    squadLeaderId: '',
    durationType: 'monthly',
    dateRange: { from: new Date(), to: null },
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (classId) {
      fetchClassData()
      fetchClasses()
      fetchStudents()
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
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
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
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch students",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      toast({
        title: "Error",
        description: "Failed to fetch students",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (student = null) => {
    if (student) {
      setEditingStudent(student)
      setFormData({
        name: student.name,
        email: student.email,
        phone: student.phone || '',
        photo: student.photo || '',
        batch: student.batch || '',
      })
      setPhotoPreview(student.photo || '')
    } else {
      setEditingStudent(null)
      const currentYear = new Date().getFullYear()
      const batchNumber = currentYear - 2023 // 2024 = Batch-1, 2025 = Batch-2, etc.
      setFormData({ name: '', email: '', phone: '', photo: '', batch: `Batch-${batchNumber}` })
      setPhotoPreview('')
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingStudent(null)
    const currentYear = new Date().getFullYear()
    const batchNumber = currentYear - 2023
    setFormData({ name: '', email: '', phone: '', photo: '', batch: `Batch-${batchNumber}` })
    setPhotoPreview('')
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
            classId: classId,
          }
        : {
            ...formData,
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
          description: editingStudent ? "Student updated successfully" : "Student created successfully",
        })
        handleCloseDialog()
        fetchStudents()
        fetchClassData()
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
        fetchClassData()
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

  const handleStudentRemove = (studentId) => {
    // Remove from selectedStudents array
    setSelectedStudents(selectedStudents.filter(id => id !== studentId))
    // Remove from selectedStudentsData array
    setSelectedStudentsData(selectedStudentsData.filter(student => student.id !== studentId))
  }

  const calculateEndDate = (startDate, durationType) => {
    if (!startDate) return null
    const start = new Date(startDate)
    const end = new Date(start)
    
    if (durationType === 'daily') {
      end.setDate(end.getDate() + 1)
    } else {
      // monthly
      end.setMonth(end.getMonth() + 1)
    }
    
    return end
  }

  const handleOpenSquadDialog = () => {
    const today = new Date()
    const endDate = calculateEndDate(today, 'monthly')
    setSquadFormData({
      name: '',
      selectedStudentIds: [],
      squadLeaderId: '',
      durationType: 'monthly',
      dateRange: { from: today, to: endDate },
    })
    setIsSquadDialogOpen(true)
  }

  const handleCloseSquadDialog = () => {
    setIsSquadDialogOpen(false)
    const today = new Date()
    const endDate = calculateEndDate(today, 'monthly')
    setSquadFormData({
      name: '',
      selectedStudentIds: [],
      squadLeaderId: '',
      durationType: 'monthly',
      dateRange: { from: today, to: endDate },
    })
    setCalendarOpen(false)
  }

  const handleDurationTypeChange = (durationType) => {
    const startDate = squadFormData.dateRange?.from || new Date()
    const endDate = calculateEndDate(startDate, durationType)
    setSquadFormData({
      ...squadFormData,
      durationType,
      dateRange: { from: startDate, to: endDate },
    })
  }

  const handleDateRangeChange = (range) => {
    if (range && range.from) {
      const endDate = calculateEndDate(range.from, squadFormData.durationType)
      setSquadFormData({
        ...squadFormData,
        dateRange: { from: range.from, to: endDate },
      })
    }
  }

  const handleCalendarApply = (range) => {
    if (range && range.from) {
      const endDate = calculateEndDate(range.from, squadFormData.durationType)
      setSquadFormData({
        ...squadFormData,
        dateRange: { from: range.from, to: endDate },
      })
    }
    setCalendarOpen(false)
  }

  const handleSquadStudentToggle = (studentId) => {
    setSquadFormData(prev => {
      const isSelected = prev.selectedStudentIds.includes(studentId)
      const newSelectedIds = isSelected
        ? prev.selectedStudentIds.filter(id => id !== studentId)
        : [...prev.selectedStudentIds, studentId]
      
      // If the removed student was the squad leader, clear the leader
      const newLeaderId = (isSelected && prev.squadLeaderId === studentId) 
        ? '' 
        : prev.squadLeaderId
      
      return {
        ...prev,
        selectedStudentIds: newSelectedIds,
        squadLeaderId: newLeaderId,
      }
    })
  }

  const handleSquadSubmit = async (e) => {
    e.preventDefault()
    
    if (!squadFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Squad name is required",
        variant: "destructive",
      })
      return
    }

    if (squadFormData.selectedStudentIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one student",
        variant: "destructive",
      })
      return
    }

    if (!squadFormData.squadLeaderId) {
      toast({
        title: "Error",
        description: "Please select a squad leader",
        variant: "destructive",
      })
      return
    }

    if (!squadFormData.dateRange?.from) {
      toast({
        title: "Error",
        description: "Please select a start date",
        variant: "destructive",
      })
      return
    }

    try {
      const { getSelectedBatch } = await import('@/lib/utils-batch')
      const batch = getSelectedBatch()
      
      const startDate = squadFormData.dateRange.from
      const endDate = squadFormData.dateRange.to || calculateEndDate(startDate, squadFormData.durationType)
      
      const response = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: squadFormData.name,
          classId: classId,
          studentIds: squadFormData.selectedStudentIds,
          squadLeaderId: squadFormData.squadLeaderId,
          durationType: squadFormData.durationType,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate ? endDate.toISOString().split('T')[0] : null,
          batch: batch,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Squad created successfully",
        })
        handleCloseSquadDialog()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create squad",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating squad:', error)
      toast({
        title: "Error",
        description: "Failed to create squad",
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
                  <BreadcrumbLink href="/students">
                    Students
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{classData?.name || 'Students'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className={`flex flex-1 flex-col gap-4 p-4 md:p-6 relative transition-all duration-300 ${showCopilot ? 'md:mr-[400px]' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                Manage students in {classData ? classData.name : 'this class'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-normal"
                onClick={() => setShowCopilot(!showCopilot)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {showCopilot ? 'Hide Copilot' : 'Show Copilot'}
              </Button>
              <Dialog open={isSquadDialogOpen} onOpenChange={setIsSquadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="font-normal" onClick={handleOpenSquadDialog}>
                    <Users className="mr-2 h-4 w-4" />
                    Create Squad
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <form onSubmit={handleSquadSubmit}>
                    <DialogHeader>
                      <DialogTitle>Create New Squad</DialogTitle>
                      <DialogDescription>
                        Create a squad and assign students with a squad leader
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="squadName">Squad Name *</Label>
                        <Input
                          id="squadName"
                          value={squadFormData.name}
                          onChange={(e) => setSquadFormData({ ...squadFormData, name: e.target.value })}
                          placeholder="e.g., Alpha Squad, Team A"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Duration Type *</Label>
                        <Select
                          value={squadFormData.durationType}
                          onValueChange={handleDurationTypeChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily (Leader changes daily)</SelectItem>
                            <SelectItem value="monthly">Monthly (Leader changes monthly)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Date Range *</Label>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {squadFormData.dateRange?.from ? (
                                squadFormData.dateRange?.to ? (
                                  <>
                                    {format(squadFormData.dateRange.from, 'PPP')} - {format(squadFormData.dateRange.to, 'PPP')}
                                  </>
                                ) : (
                                  format(squadFormData.dateRange.from, 'PPP')
                                )
                              ) : (
                                <span>Pick a date range</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              showSidebar={true}
                              selectedRange={squadFormData.dateRange}
                              onRangeChange={handleDateRangeChange}
                              onApply={handleCalendarApply}
                              onCancel={() => setCalendarOpen(false)}
                            />
                          </PopoverContent>
                        </Popover>
                        {squadFormData.dateRange?.from && squadFormData.dateRange?.to && (
                          <div className="text-xs text-muted-foreground">
                            Start: {format(squadFormData.dateRange.from, 'MMM dd, yyyy')} | 
                            End: {format(squadFormData.dateRange.to, 'MMM dd, yyyy')} | 
                            Duration: {squadFormData.durationType === 'daily' ? '1 day' : '1 month'}
                          </div>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label>Select Students *</Label>
                        <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                          {students.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No students available</p>
                          ) : (
                            <div className="space-y-2">
                              {students.map((student) => (
                                <div key={student.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`student-${student.id}`}
                                    checked={squadFormData.selectedStudentIds.includes(student.id)}
                                    onCheckedChange={() => handleSquadStudentToggle(student.id)}
                                  />
                                  <Label
                                    htmlFor={`student-${student.id}`}
                                    className="flex items-center gap-2 flex-1 cursor-pointer"
                                  >
                                    <Avatar className="h-8 w-8">
                                      {student.photo && <AvatarImage src={student.photo} alt={student.name} />}
                                      <AvatarFallback>
                                        {getUserInitials(student.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="text-sm font-medium">{student.name}</div>
                                      <div className="text-xs text-muted-foreground">{student.email}</div>
                                    </div>
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {squadFormData.selectedStudentIds.length > 0 && (
                        <div className="grid gap-2">
                          <Label>Select Squad Leader *</Label>
                          <Select
                            value={squadFormData.squadLeaderId}
                            onValueChange={(value) => setSquadFormData({ ...squadFormData, squadLeaderId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a squad leader" />
                            </SelectTrigger>
                            <SelectContent>
                              {squadFormData.selectedStudentIds.map((studentId) => {
                                const student = students.find(s => s.id === studentId)
                                return student ? (
                                  <SelectItem key={studentId} value={studentId}>
                                    {student.name} ({student.email})
                                  </SelectItem>
                                ) : null
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleCloseSquadDialog}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        Create Squad
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <form onSubmit={handleSubmit}>
                      <DialogHeader>
                        <DialogTitle>
                          {editingStudent ? 'Edit Student' : 'Create New Student'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingStudent ? 'Update student information' : 'Add a new student to this class'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-2">
                            <Avatar className="h-24 w-24">
                              {photoPreview && <AvatarImage src={photoPreview} alt="Student photo" />}
                              <AvatarFallback className="text-lg">
                                {getUserInitials(formData.name || 'Student')}
                              </AvatarFallback>
                            </Avatar>
                            <Label htmlFor="photo" className="cursor-pointer">
                              <Button type="button" variant="outline" size="sm" asChild>
                                <span>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Upload Photo
                                </span>
                              </Button>
                              <Input
                                id="photo"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoChange}
                              />
                            </Label>
                          </div>
                          <div className="flex-1 grid gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="name">Student Name *</Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., John Doe"
                                required
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="email">Email *</Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="e.g., john.doe@example.com"
                                required
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder="e.g., +1234567890"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="batch">Batch</Label>
                            <Input
                              id="batch"
                              value={formData.batch}
                              onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                              placeholder="e.g., Batch-1, Batch-2"
                            />
                            <p className="text-xs text-muted-foreground">
                              {new Date().getFullYear()} = Batch-{new Date().getFullYear() - 2023}
                            </p>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCloseDialog}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingStudent ? 'Update' : 'Create'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
            </div>
          </div>
          {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading students...</div>
                </div>
              ) : students.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      {classData ? `No students found in ${classData.name}` : 'No students found'}
                    </p>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Student
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={selectedStudents.length === students.length && students.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents(students.map(s => s.id))
                                setSelectedStudentsData(students.map(s => ({
                                  id: s.id,
                                  name: s.name,
                                  studentId: s.studentId,
                                  email: s.email,
                                  batch: s.batch,
                                  phone: s.phone
                                })))
                              } else {
                                setSelectedStudents([])
                                setSelectedStudentsData([])
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="text-sm">Photo</TableHead>
                        <TableHead className="text-sm">Student ID</TableHead>
                        <TableHead className="text-sm">Name</TableHead>
                        <TableHead className="text-sm">Email</TableHead>
                        <TableHead className="text-sm">Phone</TableHead>
                        <TableHead className="text-sm">Batch</TableHead>
                        <TableHead className="text-right text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={selectedStudents.includes(student.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudents([...selectedStudents, student.id])
                                  setSelectedStudentsData([...selectedStudentsData, {
                                    id: student.id,
                                    name: student.name,
                                    studentId: student.studentId,
                                    email: student.email,
                                    batch: student.batch,
                                    phone: student.phone
                                  }])
                                } else {
                                  setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                                  setSelectedStudentsData(selectedStudentsData.filter(s => s.id !== student.id))
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Avatar className="h-10 w-10">
                              {student.photo && <AvatarImage src={student.photo} alt={student.name} />}
                              <AvatarFallback>
                                {getUserInitials(student.name)}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{student.studentId}</TableCell>
                          <TableCell className="text-sm">{student.name}</TableCell>
                          <TableCell className="text-xs lowercase">{student.email}</TableCell>
                          <TableCell className="text-xs">{student.phone || '-'}</TableCell>
                          <TableCell className="text-xs">{student.batch || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleOpenDialog(student)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDelete(student.id)}
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
        <Copilot 
          isOpen={showCopilot} 
          onClose={() => setShowCopilot(false)}
          selectedStudents={selectedStudentsData}
          onStudentRemove={handleStudentRemove}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

