"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { AttendanceTable } from "@/components/attendance-table"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import Calendar from '@/components/calendar-range'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Save, Calendar as CalendarIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

// Get Indian timezone date
function getIndianDate() {
  const now = new Date()
  const indianDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  return indianDate.toISOString().split('T')[0]
}

// Get day name from date
function getDayName(dateString) {
  const date = new Date(dateString + 'T00:00:00')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[date.getDay()]
}

export default function AttendanceByClassPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.classId
  const [students, setStudents] = useState([])
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(getIndianDate())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [attendanceData, setAttendanceData] = useState({}) // { studentId: status }
  const [leaveReasons, setLeaveReasons] = useState({}) // { studentId: reason }
  const { toast } = useToast()
  const studentsRef = useRef([]) // Ref to track latest students for use in async functions

  useEffect(() => {
    if (classId) {
      fetchClassData()
      fetchStudents()
    }
  }, [classId])

  useEffect(() => {
    if (classId && date) {
      // Clear attendance data when date changes to prevent showing old data
      setAttendanceData({})
      setLeaveReasons({})
      setAttendanceLoading(true)
      fetchAttendanceForDate()
    }
  }, [classId, date])

  // Listen for batch changes and refetch data
  useEffect(() => {
    if (!classId) return
    
    const { getSelectedBatch } = require('@/lib/utils-batch')
    let currentBatch = getSelectedBatch()
    
    const handleBatchChange = () => {
      const newBatch = getSelectedBatch()
      if (newBatch !== currentBatch) {
        console.log(`[AttendanceByClass] Batch changed from "${currentBatch}" to "${newBatch}"`)
        currentBatch = newBatch
        // Clear existing data immediately
        studentsRef.current = []
        setStudents([])
        setAttendanceData({})
        setClassData(null)
        // Refetch all data when batch changes
        fetchClassData()
        fetchStudents()
        if (date) {
          // Use setTimeout to ensure students are fetched first
          setTimeout(() => {
            fetchAttendanceForDate()
          }, 200)
        }
      }
    }
    
    // Listen for storage events (cross-tab)
    const handleStorageChange = (e) => {
      if (e.key === 'selectedBatch') {
        handleBatchChange()
      }
    }
    
    // Listen for custom batch change event (same-tab)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('batchChanged', handleBatchChange)
    
    // Poll for batch changes (fallback)
    const pollInterval = setInterval(handleBatchChange, 500)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('batchChanged', handleBatchChange)
      clearInterval(pollInterval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]) // Only depend on classId and date, functions are stable

  const fetchClassData = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/classes')
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store', // Prevent caching
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

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/students', { classId })
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store', // Prevent caching
      })
      if (response.ok) {
        const data = await response.json()
        const studentsList = data.students || []
        studentsRef.current = studentsList // Update ref
        setStudents(studentsList)
        
        // Initialize attendance data with default 'present' status
        // This will be overridden by fetchAttendanceForDate if date is set
        const initialAttendance = {}
        studentsList.forEach(student => {
          initialAttendance[student.id] = 'present' // Always default to 'present', not from student.attendanceStatus
        })
        setAttendanceData(initialAttendance)
        console.log(`[AttendanceByClass] Fetched ${studentsList.length} students for batch: "${require('@/lib/utils-batch').getSelectedBatch()}"`)
        
        // Fetch attendance for current date after students are loaded
        if (date) {
          // Use setTimeout to ensure state is updated
          setTimeout(() => {
            fetchAttendanceForDate()
          }, 100)
        }
      } else {
        console.error('Failed to fetch students')
        studentsRef.current = []
        setStudents([])
        setAttendanceData({})
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
      setAttendanceData({})
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceForDate = async () => {
    try {
      setAttendanceLoading(true)
      // Use ref to get latest students (avoids closure issues)
      const currentStudents = studentsRef.current
      
      // Wait for students to be loaded before fetching attendance
      if (currentStudents.length === 0) {
        console.log('[AttendanceByClass] Waiting for students to load before fetching attendance')
        setAttendanceLoading(false)
        return
      }
      
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/attendance', { date, classId })
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store', // Prevent caching
      })
      if (response.ok) {
        const data = await response.json()
        const attendanceRecords = data.attendance || []
        
        // Build fresh attendance data object from current students
        const freshAttendance = {}
        const freshLeaveReasons = {}
        const updatedStudents = currentStudents.map(student => {
            const record = attendanceRecords.find(r => r.studentId === student.id)
          const status = record ? record.status : 'present'
          // Build attendance data map
          freshAttendance[student.id] = status
          // Store leave reason if available
          if (status === 'approved_leave' && record?.reason) {
            freshLeaveReasons[student.id] = record.reason
          }
          // Update student's attendance status
            return {
              ...student,
            attendanceStatus: status
          }
        })
        
        // Update ref and both states - React will batch these updates
        studentsRef.current = updatedStudents
        setAttendanceData(freshAttendance)
        setLeaveReasons(freshLeaveReasons)
        setStudents(updatedStudents)
      }
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setAttendanceLoading(false)
    }
  }

  const handleAttendanceChange = (studentId, status, reason = null) => {
    // Update local state only, don't save to DB yet
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }))
    
    // Update leave reason if provided
    if (reason !== null) {
      setLeaveReasons(prev => ({
        ...prev,
        [studentId]: reason
      }))
    } else if (status !== 'approved_leave') {
      // Remove reason if status is not approved_leave
      setLeaveReasons(prev => {
        const updated = { ...prev }
        delete updated[studentId]
        return updated
      })
    }
    
    setStudents(prevStudents => {
      const updated = prevStudents.map(student =>
        student.id === studentId
          ? { ...student, attendanceStatus: status }
          : student
      )
      studentsRef.current = updated // Update ref
      return updated
    })
  }

  const handleSaveAttendance = async () => {
    if (!classData) {
      toast({
        title: "Error",
        description: "Class data not found",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const dayName = getDayName(date)
      const response = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          classId: classId,
          coachId: classData.coachId || '',
          date: date,
          day: dayName,
          attendance: Object.entries(attendanceData).map(([studentId, status]) => ({
            studentId,
            status,
            reason: status === 'approved_leave' ? (leaveReasons[studentId] || '') : undefined,
          })),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Attendance saved successfully",
        })
        // Refetch attendance data to ensure UI is in sync with database
        await fetchAttendanceForDate()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to save attendance",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast({
        title: "Error",
        description: "Failed to save attendance",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
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
                  <BreadcrumbLink href="/classes">
                    Classes
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Attendance</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {classData ? `${classData.name} - Attendance` : 'Student Attendance'}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Mark attendance for {classData ? classData.name : 'students'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[240px] justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(new Date(date + 'T00:00:00'), 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        showSidebar={true}
                        selectedRange={date ? {
                          from: new Date(date + 'T00:00:00'),
                          to: new Date(date + 'T00:00:00')
                        } : null}
                        onRangeChange={(range) => {
                          // Auto-apply when a single date is selected (from and to are the same)
                          if (range && range.from && range.to) {
                            const fromDate = range.from
                            const toDate = range.to
                            // Check if from and to are the same day
                            if (fromDate.toDateString() === toDate.toDateString()) {
                              const year = fromDate.getFullYear()
                              const month = String(fromDate.getMonth() + 1).padStart(2, '0')
                              const day = String(fromDate.getDate()).padStart(2, '0')
                              const dateString = `${year}-${month}-${day}`
                              setDate(dateString)
                              setCalendarOpen(false)
                            }
                          }
                        }}
                        onApply={(range) => {
                          if (range && range.from) {
                            // Use from date for single date selection
                            const selectedDate = range.from
                            const year = selectedDate.getFullYear()
                            const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
                            const day = String(selectedDate.getDate()).padStart(2, '0')
                            const dateString = `${year}-${month}-${day}`
                            setDate(dateString)
                            setCalendarOpen(false)
                          }
                        }}
                        onCancel={() => {
                          setCalendarOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                    <Button onClick={() => router.push('/students')}>
                      Add Students
                    </Button>
                  </div>
                </div>
              ) : attendanceLoading ? (
                <div className="space-y-4">
                  {/* Skeleton loading for attendance table */}
                  <div className="w-full">
                    <div className="flex items-center py-4">
                      <Skeleton className="h-10 w-full max-w-sm" />
                      <Skeleton className="h-10 w-32 ml-auto" />
                    </div>
                    <div className="overflow-hidden rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead><Skeleton className="h-4 w-8" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-48" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                              <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-end space-x-2 py-4">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <AttendanceTable
                    students={students}
                    onAttendanceChange={handleAttendanceChange}
                    attendanceData={attendanceData}
                    leaveReasons={leaveReasons}
                  />
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={handleSaveAttendance}
                      disabled={saving}
                      size="lg"
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Attendance'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

