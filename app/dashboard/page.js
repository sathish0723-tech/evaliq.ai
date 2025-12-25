"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarIcon, ArrowUpDown, Search, Check, ChevronDown } from 'lucide-react'
import Calendar from '@/components/calendar-range'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { DashboardChart } from '@/components/dashboard-chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LineChart, Line } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Get Indian timezone date
function getIndianDate() {
  const now = new Date()
  const indianDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  return indianDate.toISOString().split('T')[0]
}

// Get date range based on selection
function getDateRange(timeRange) {
  const endDate = new Date()
  const indianEndDate = new Date(endDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  const endDateStr = indianEndDate.toISOString().split('T')[0]
  
  let daysToSubtract = 90
  if (timeRange === '30d') daysToSubtract = 30
  else if (timeRange === '7d') daysToSubtract = 7
  
  const startDate = new Date(indianEndDate)
  startDate.setDate(startDate.getDate() - daysToSubtract)
  const startDateStr = startDate.toISOString().split('T')[0]
  
  return { startDate: startDateStr, endDate: endDateStr }
}

// Marks Line Chart Component
const MarksLineChart = React.memo(function MarksLineChart({ data, config, title, description, loading, selectedSubjects, allSubjects, selectedClass, classes }) {
  const getSubjectKey = React.useCallback((subjectName) => {
    return subjectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  }, [])
  
  if (loading) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Check for selected subjects
  if (!data || data.length === 0 || selectedSubjects.length === 0) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-muted-foreground">
              {selectedSubjects.length === 0 ? 'Please select at least one subject' : 'No data available'}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get unique selected subjects for rendering lines (remove duplicates by name)
  const selectedSubjectDataMap = new Map()
  allSubjects
    .filter(s => selectedSubjects.includes(s.subjectId))
    .forEach(s => {
      const normalizedName = s.name?.trim().toLowerCase()
      if (normalizedName && !selectedSubjectDataMap.has(normalizedName)) {
        selectedSubjectDataMap.set(normalizedName, s)
      }
    })
  const selectedSubjectData = Array.from(selectedSubjectDataMap.values())
  
  // Get data keys for rendering lines
  const dataKeys = selectedSubjectData.map(subject => ({
    key: getSubjectKey(subject.name),
    name: subject.name
  }))

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={config}
          className="aspect-auto h-[300px] w-full"
        >
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value)
                return format(date, 'MMM d')
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return format(new Date(value), 'MMM d, yyyy')
                  }}
                  formatter={(value, name) => {
                    const dataItem = dataKeys.find(d => d.key === name)
                    return [`${value?.toFixed(1)}%`, dataItem?.name || name]
                  }}
                />
              }
            />
            {dataKeys.map((dataItem) => {
              return (
                <Line
                  key={`line-${dataItem.key}`}
                  type="monotone"
                  dataKey={dataItem.key}
                  stroke={`var(--color-${dataItem.key})`}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name={dataItem.name}
                />
              )
            })}
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})

const attendanceChartConfig = {
  present: {
    label: "Present",
    theme: {
      light: "hsl(142, 76%, 36%)",
      dark: "hsl(142, 70%, 50%)",
    },
  },
  absent: {
    label: "Absent",
    theme: {
      light: "hsl(0, 84%, 60%)",
      dark: "hsl(0, 72%, 58%)",
    },
  },
  late: {
    label: "Late",
    theme: {
      light: "hsl(45, 93%, 47%)",
      dark: "hsl(45, 93%, 60%)",
    },
  },
}

const marksChartConfig = {
  averageMarks: {
    label: "Average Marks",
    theme: {
      light: "hsl(217, 91%, 60%)",
      dark: "hsl(217, 91%, 70%)",
    },
  },
  averagePercentage: {
    label: "Average %",
    theme: {
      light: "hsl(280, 70%, 50%)",
      dark: "hsl(280, 70%, 60%)",
    },
  },
}

export default function DashboardPage() {
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedSubjects, setSelectedSubjects] = useState([]) // Array of selected subject IDs for marks view
  const [allSubjects, setAllSubjects] = useState([]) // All available subjects
  const [timeRange, setTimeRange] = useState('7d')
  const [dateRange, setDateRange] = useState(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [viewType, setViewType] = useState('attendance')
  const [chartTimeRange, setChartTimeRange] = useState('7d')
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false)
  
  // Attendance state
  const [attendanceChartData, setAttendanceChartData] = useState([])
  const [attendanceStats, setAttendanceStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalStudents: 0,
  })
  
  // Marks state
  const [marksChartData, setMarksChartData] = useState([])
  const [marksStats, setMarksStats] = useState({
    totalTests: 0,
    totalStudents: 0,
    averageMarks: 0,
    averagePercentage: 0,
  })
  const [subjectAverages, setSubjectAverages] = useState([]) // Subject-wise averages for All Classes
  const [studentMarksData, setStudentMarksData] = useState([])
  const [studentAttendanceData, setStudentAttendanceData] = useState([])
  const [combinedStudentData, setCombinedStudentData] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  const [loading, setLoading] = useState(true)
  const [marksLoading, setMarksLoading] = useState(false)

  useEffect(() => {
    fetchClasses()
  }, [])

  // Set default class when classes are loaded
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].classId)
    }
  }, [classes])

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects()
    } else {
      setSubjects([])
      setSelectedSubject('all')
    }
    // Fetch all subjects for marks view
    if (viewType === 'marks') {
      fetchAllSubjects()
    } else {
      // Clear subjects when switching away from marks view
      setAllSubjects([])
      setSelectedSubjects([])
    }
  }, [selectedClass, viewType])

  useEffect(() => {
    fetchAttendanceData()
    fetchMarksData()
  }, [selectedClass, selectedSubject, selectedSubjects, timeRange, dateRange])

  useEffect(() => {
    combineStudentData()
  }, [studentMarksData, studentAttendanceData])

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

  const fetchSubjects = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/subjects', { classId: selectedClass })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setSubjects(data.subjects || [])
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const fetchAllSubjects = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/subjects')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const subjects = data.subjects || []
        
        // Remove duplicates by subject name (keep first occurrence)
        // Normalize names to handle case and whitespace differences
        const uniqueSubjectsMap = new Map()
        subjects.forEach(subject => {
          if (!subject.name) return
          const normalizedName = subject.name.trim().toLowerCase()
          if (normalizedName && !uniqueSubjectsMap.has(normalizedName)) {
            uniqueSubjectsMap.set(normalizedName, subject)
          }
        })
        
        const uniqueSubjects = Array.from(uniqueSubjectsMap.values())
        // Sort by name for consistent display
        uniqueSubjects.sort((a, b) => a.name.localeCompare(b.name))
        setAllSubjects(uniqueSubjects)
        
        // Clean up selectedSubjects to only include unique subject IDs
        const uniqueSubjectIds = uniqueSubjects.map(s => s.subjectId)
        setSelectedSubjects(prev => {
          // Filter to only include IDs that exist in unique subjects
          const validIds = prev.filter(id => uniqueSubjectIds.includes(id))
          // Remove duplicates by checking if subject name is already selected
          const selectedNames = new Set()
          const deduplicatedIds = []
          validIds.forEach(id => {
            const subject = uniqueSubjects.find(s => s.subjectId === id)
            if (subject) {
              const normalizedName = subject.name.trim().toLowerCase()
              if (!selectedNames.has(normalizedName)) {
                selectedNames.add(normalizedName)
                deduplicatedIds.push(id)
              }
            }
          })
          return deduplicatedIds
        })
        
        // Auto-select all unique subjects if none selected
        if (selectedSubjects.length === 0 && uniqueSubjects.length > 0) {
          setSelectedSubjects(uniqueSubjects.map(s => s.subjectId))
        }
      }
    } catch (error) {
      console.error('Error fetching all subjects:', error)
    }
  }

  const fetchAttendanceData = async () => {
    setLoading(true)
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      let startDate, endDate
      
      if (dateRange && dateRange.from && dateRange.to) {
        startDate = format(dateRange.from, 'yyyy-MM-dd')
        endDate = format(dateRange.to, 'yyyy-MM-dd')
      } else {
        const range = getDateRange(timeRange)
        startDate = range.startDate
        endDate = range.endDate
      }

      const classId = selectedClass
      const url = buildUrlWithBatch('/api/attendance/stats', {
        startDate,
        endDate,
        ...(classId ? { classId } : {})
      })
      
      const response = await fetch(url, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        setAttendanceChartData(data.chartData || [])
        setAttendanceStats(data.stats || {
          totalPresent: 0,
          totalAbsent: 0,
          totalLate: 0,
          totalStudents: 0,
        })
        setStudentAttendanceData(data.studentStats || [])
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMarksData = async () => {
    setMarksLoading(true)
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      let startDate, endDate
      
      if (dateRange && dateRange.from && dateRange.to) {
        startDate = format(dateRange.from, 'yyyy-MM-dd')
        endDate = format(dateRange.to, 'yyyy-MM-dd')
      } else {
        const range = getDateRange(timeRange)
        startDate = range.startDate
        endDate = range.endDate
      }

      const classId = selectedClass
      // Don't filter by single subject when multiple subjects are selected in marks view
      const subjectId = (viewType === 'marks' && selectedSubjects.length > 0) ? '' : (selectedSubject === 'all' ? '' : selectedSubject)
      const url = buildUrlWithBatch('/api/marks/stats', {
        startDate,
        endDate,
        ...(classId ? { classId } : {}),
        ...(subjectId ? { subjectId } : {})
      })
      
      const response = await fetch(url, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        setMarksChartData(data.chartData || [])
        setMarksStats(data.stats || {
          totalTests: 0,
          totalStudents: 0,
          averageMarks: 0,
          averagePercentage: 0,
        })
        setStudentMarksData(data.studentStats || [])
        setSubjectAverages(data.subjectAverages || []) // Set subject averages
      }
    } catch (error) {
      console.error('Error fetching marks data:', error)
    } finally {
      setMarksLoading(false)
    }
  }

  const combineStudentData = () => {
    const combined = []
    const studentMap = new Map()

    // Add marks data (already has student details)
    studentMarksData.forEach(student => {
      studentMap.set(student.studentId, {
        studentId: student.studentId,
        studentName: student.studentName,
        studentEmail: student.studentEmail,
        batch: student.batch,
        // Marks data
        totalMarks: student.totalMarks,
        totalMaxMarks: student.totalMaxMarks,
        averageMarks: student.averageMarks,
        averagePercentage: student.averagePercentage,
        testCount: student.testCount,
        // Attendance data (will be filled from attendance data)
        attendancePercentage: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
      })
    })

    // Add attendance data - for students with only attendance, use studentId as name
    studentAttendanceData.forEach(attendance => {
      if (studentMap.has(attendance.studentId)) {
        const existing = studentMap.get(attendance.studentId)
        existing.attendancePercentage = attendance.attendancePercentage || 0
        existing.totalPresent = attendance.present || 0
        existing.totalAbsent = attendance.absent || 0
        existing.totalLate = attendance.late || 0
      } else {
        // Student has attendance but no marks - use studentId as identifier
        studentMap.set(attendance.studentId, {
          studentId: attendance.studentId,
          studentName: `Student ${attendance.studentId.slice(-6)}`, // Show last 6 chars of ID
          studentEmail: '',
          batch: '',
          // Marks data (empty)
          totalMarks: 0,
          totalMaxMarks: 0,
          averageMarks: 0,
          averagePercentage: 0,
          testCount: 0,
          // Attendance data
          attendancePercentage: attendance.attendancePercentage || 0,
          totalPresent: attendance.present || 0,
          totalAbsent: attendance.absent || 0,
          totalLate: attendance.late || 0,
        })
      }
    })

    // Convert map to array
    combined.push(...Array.from(studentMap.values()))
    setCombinedStudentData(combined)
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Filter and sort student data
  const filteredAndSortedStudentData = useMemo(() => {
    let filtered = combinedStudentData

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(student => 
        student.studentName?.toLowerCase().includes(query) ||
        student.studentEmail?.toLowerCase().includes(query) ||
        student.batch?.toLowerCase().includes(query) ||
        student.studentId?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
    }

    return filtered
  }, [combinedStudentData, sortConfig, searchQuery])

  // Paginate the filtered data
  const paginatedStudentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAndSortedStudentData.slice(startIndex, endIndex)
  }, [filteredAndSortedStudentData, currentPage, itemsPerPage])

  // Calculate total pages
  const totalPages = Math.ceil(filteredAndSortedStudentData.length / itemsPerPage)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const handleCalendarApply = (range) => {
    if (range && range.from && range.to) {
      setDateRange(range)
      setTimeRange('custom')
    }
    setCalendarOpen(false)
  }

  const handleCalendarCancel = () => {
    setCalendarOpen(false)
  }

  const handlePresetClick = (presetKey, range) => {
    // This function is no longer needed since presets don't auto-apply
    // The Apply button will handle applying the filter
    // But we can still update the timeRange for display purposes
    switch (presetKey) {
      case 'last7days':
        setTimeRange('7d')
        break
      case 'last14days':
        setTimeRange('14d')
        break
      case 'last30days':
        setTimeRange('30d')
        break
      case 'thisWeek':
      case 'thisMonth':
      case 'previousWeek':
      case 'previousMonth':
      case 'custom':
        setTimeRange('custom')
        break
      default:
        setTimeRange('custom')
    }
    // Don't set dateRange or close calendar - let user click Apply
  }

  const getDateRangeDisplay = () => {
    if (dateRange && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
    }
    if (timeRange === '7d') return 'Last 7 days'
    if (timeRange === '30d') return 'Last 30 days'
    if (timeRange === '90d') return 'Last 90 days'
    return 'Select date range'
  }

  const getDateRangeFromTimeRange = (range) => {
    const dateRangeObj = getDateRange(range)
    return {
      from: new Date(dateRangeObj.startDate),
      to: new Date(dateRangeObj.endDate)
    }
  }

  const getInitialCalendarRange = () => {
    if (dateRange && dateRange.from && dateRange.to) {
      return dateRange
    }
    if (timeRange !== 'custom') {
      return getDateRangeFromTimeRange(timeRange)
    }
    return null
  }

  const filteredAttendanceData = useMemo(() => {
    return attendanceChartData
  }, [attendanceChartData])

  const filteredMarksData = useMemo(() => {
    return marksChartData
  }, [marksChartData])

  // Helper to create a safe key from subject name
  const getSubjectKey = (subjectName) => {
    return subjectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  }

  // Prepare chart data based on view type
  const chartData = useMemo(() => {
    if (viewType === 'attendance') {
      return filteredAttendanceData.map(item => ({
        date: item.date,
        present: item.present || 0,
        absent: item.absent || 0,
        late: item.late || 0,
      }))
    } else {
      // For marks view, use time-based line chart data with selected subjects
      if (selectedSubjects.length > 0 && filteredMarksData.length > 0) {
        // For specific class, show per-subject values
        const dataMap = new Map()
        
        // Get unique selected subjects (by name) to avoid duplicates
        const selectedSubjectMap = new Map()
        allSubjects
          .filter(s => selectedSubjects.includes(s.subjectId))
          .forEach(s => {
            const normalizedName = s.name?.trim().toLowerCase()
            if (normalizedName && !selectedSubjectMap.has(normalizedName)) {
              selectedSubjectMap.set(normalizedName, {
                id: s.subjectId,
                name: s.name,
                key: getSubjectKey(s.name)
              })
            }
          })
        
        const selectedSubjectNames = Array.from(selectedSubjectMap.values())

        filteredMarksData.forEach(item => {
          if (!dataMap.has(item.date)) {
            dataMap.set(item.date, { date: item.date })
          }
          const dateData = dataMap.get(item.date)
          
          // Use per-subject data from API if available, otherwise fallback to average
          selectedSubjectNames.forEach(subject => {
            // For specific class, API uses subjectId as key
            const subjectKeyById = `subject_${subject.id}`
            
            if (item[subjectKeyById] !== undefined) {
              dateData[subject.key] = item[subjectKeyById]
            } else {
              // Fallback to overall average if per-subject data not available
              dateData[subject.key] = item.averagePercentage || 0
            }
          })
        })

        return Array.from(dataMap.values()).sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        )
      }
      // Fallback to default data
      return filteredMarksData.map(item => ({
        date: item.date,
        averageMarks: item.averageMarks || 0,
        averagePercentage: item.averagePercentage || 0,
      }))
    }
  }, [viewType, filteredAttendanceData, filteredMarksData, selectedClass, subjectAverages, selectedSubjects, allSubjects])

  const chartConfig = useMemo(() => {
    if (viewType === 'attendance') {
      return {
        present: {
          label: "Present",
          theme: {
            light: "hsl(142, 76%, 36%)",
            dark: "hsl(142, 70%, 50%)",
          },
        },
        absent: {
          label: "Absent",
          theme: {
            light: "hsl(0, 84%, 60%)",
            dark: "hsl(0, 72%, 58%)",
          },
        },
        late: {
          label: "Late",
          theme: {
            light: "hsl(45, 93%, 47%)",
            dark: "hsl(45, 93%, 60%)",
          },
        },
      }
    } else {
      // Create config for selected subjects (unique by name)
      if (selectedSubjects.length > 0) {
        const config = {}
        const colors = [
          { light: "hsl(217, 91%, 60%)", dark: "hsl(217, 91%, 70%)" },
          { light: "hsl(280, 70%, 50%)", dark: "hsl(280, 70%, 60%)" },
          { light: "hsl(142, 76%, 36%)", dark: "hsl(142, 70%, 50%)" },
          { light: "hsl(45, 93%, 47%)", dark: "hsl(45, 93%, 60%)" },
          { light: "hsl(0, 84%, 60%)", dark: "hsl(0, 72%, 58%)" },
          { light: "hsl(199, 89%, 48%)", dark: "hsl(199, 89%, 58%)" },
        ]
        
        // Get unique subjects by name
        const uniqueSubjectsMap = new Map()
        allSubjects
          .filter(s => selectedSubjects.includes(s.subjectId))
          .forEach(s => {
            const normalizedName = s.name?.trim().toLowerCase()
            if (normalizedName && !uniqueSubjectsMap.has(normalizedName)) {
              uniqueSubjectsMap.set(normalizedName, s)
            }
          })
        
        Array.from(uniqueSubjectsMap.values()).forEach((subject, index) => {
          const color = colors[index % colors.length]
          const subjectKey = getSubjectKey(subject.name)
          config[subjectKey] = {
            label: subject.name,
            theme: color,
          }
        })
        return config
      }
      // Fallback to default marks config
      return {
        averageMarks: {
          label: "Average Marks",
          theme: {
            light: "hsl(217, 91%, 60%)",
            dark: "hsl(217, 91%, 70%)",
          },
        },
        averagePercentage: {
          label: "Average %",
          theme: {
            light: "hsl(280, 70%, 50%)",
            dark: "hsl(280, 70%, 60%)",
          },
        },
      }
    }
  }, [viewType, selectedClass, subjectAverages, selectedSubjects, allSubjects, chartData])

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
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="class" className="text-xs">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger id="class" className="h-8 text-xs">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.classId} value={cls.classId}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="viewType" className="text-xs">View</Label>
              <Select value={viewType} onValueChange={setViewType}>
                <SelectTrigger id="viewType" className="h-8 text-xs">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="marks">Marks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="timeRange" className="text-xs">Date Range</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="timeRange"
                    className="h-8 w-full justify-start text-left font-normal text-xs"
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {getDateRangeDisplay()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    showSidebar={true}
                    selectedRange={dateRange || (timeRange !== 'custom' ? getDateRangeFromTimeRange(timeRange) : null)}
                    onRangeChange={setDateRange}
                    onApply={handleCalendarApply}
                    onCancel={handleCalendarCancel}
                    onPresetClick={handlePresetClick}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {viewType === 'marks' && (
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="subjects" className="text-xs">Subjects</Label>
                <DropdownMenu open={subjectDropdownOpen} onOpenChange={setSubjectDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-8 text-xs justify-between min-w-[200px]">
                      {(() => {
                        // Get unique selected subjects by name
                        const selectedUniqueMap = new Map()
                        allSubjects
                          .filter(s => selectedSubjects.includes(s.subjectId))
                          .forEach(s => {
                            const normalizedName = s.name?.trim().toLowerCase()
                            if (normalizedName && !selectedUniqueMap.has(normalizedName)) {
                              selectedUniqueMap.set(normalizedName, s)
                            }
                          })
                        const uniqueSelectedCount = selectedUniqueMap.size
                        
                        if (uniqueSelectedCount === 0) {
                          return 'Select subjects'
                        } else if (uniqueSelectedCount === 1) {
                          const subject = Array.from(selectedUniqueMap.values())[0]
                          return subject.name || '1 selected'
                        } else {
                          return `${uniqueSelectedCount} selected`
                        }
                      })()}
                      <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[250px] max-h-[300px] overflow-y-auto" align="start">
                    {allSubjects.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No subjects available</div>
                    ) : (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold border-b">
                          Select subjects to compare
                        </div>
                        {(() => {
                          // Ensure we only show truly unique subjects (by name)
                          const uniqueDisplayMap = new Map()
                          allSubjects.forEach(subject => {
                            if (!subject.name) return
                            const normalizedName = subject.name.trim().toLowerCase()
                            if (!uniqueDisplayMap.has(normalizedName)) {
                              uniqueDisplayMap.set(normalizedName, subject)
                            }
                          })
                          const uniqueDisplaySubjects = Array.from(uniqueDisplayMap.values())
                          uniqueDisplaySubjects.sort((a, b) => a.name.localeCompare(b.name))
                          
                          return uniqueDisplaySubjects.map((subject) => {
                            // Check if this subject name is already selected (by any subjectId with same name)
                            const normalizedName = subject.name?.trim().toLowerCase()
                            const isNameSelected = allSubjects.some(s => 
                              selectedSubjects.includes(s.subjectId) && 
                              s.name?.trim().toLowerCase() === normalizedName
                            )
                            
                            return (
                              <div
                                key={`subject-${subject.subjectId}-${subject.name}`}
                                className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  
                                  if (isNameSelected) {
                                    // Remove all subjects with same name
                                    setSelectedSubjects(prev => prev.filter(id => {
                                      const otherSubject = allSubjects.find(s => s.subjectId === id)
                                      return otherSubject?.name?.trim().toLowerCase() !== normalizedName
                                    }))
                                  } else {
                                    // Remove all subjects with same name, then add this one
                                    setSelectedSubjects(prev => {
                                      const filtered = prev.filter(id => {
                                        const otherSubject = allSubjects.find(s => s.subjectId === id)
                                        return otherSubject?.name?.trim().toLowerCase() !== normalizedName
                                      })
                                      return [...filtered, subject.subjectId]
                                    })
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={isNameSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      // Remove all subjects with same name, then add this one
                                      setSelectedSubjects(prev => {
                                        const filtered = prev.filter(id => {
                                          const otherSubject = allSubjects.find(s => s.subjectId === id)
                                          return otherSubject?.name?.trim().toLowerCase() !== normalizedName
                                        })
                                        return [...filtered, subject.subjectId]
                                      })
                                    } else {
                                      // Remove all subjects with same name
                                      setSelectedSubjects(prev => prev.filter(id => {
                                        const otherSubject = allSubjects.find(s => s.subjectId === id)
                                        return otherSubject?.name?.trim().toLowerCase() !== normalizedName
                                      }))
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-shrink-0"
                                />
                                <span 
                                  className="text-sm cursor-pointer flex-1 select-none"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    
                                    if (isNameSelected) {
                                      // Remove all subjects with same name
                                      setSelectedSubjects(prev => prev.filter(id => {
                                        const otherSubject = allSubjects.find(s => s.subjectId === id)
                                        return otherSubject?.name?.trim().toLowerCase() !== normalizedName
                                      }))
                                    } else {
                                      // Remove all subjects with same name, then add this one
                                      setSelectedSubjects(prev => {
                                        const filtered = prev.filter(id => {
                                          const otherSubject = allSubjects.find(s => s.subjectId === id)
                                          return otherSubject?.name?.trim().toLowerCase() !== normalizedName
                                        })
                                        return [...filtered, subject.subjectId]
                                      })
                                    }
                                  }}
                                >
                                  {subject.name}
                                </span>
                              </div>
                            )
                          })
                        })()}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            {selectedClass !== 'all' && viewType !== 'marks' && (
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="subject" className="text-xs">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger id="subject" className="h-8 text-xs">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subj) => (
                      <SelectItem key={subj.subjectId} value={subj.subjectId}>
                        {subj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Chart Section */}
          {viewType === 'marks' ? (
            <MarksLineChart
            data={chartData}
            config={chartConfig}
              title="Marks Trend"
              description="Showing marks trends over time"
              loading={marksLoading}
              selectedSubjects={selectedSubjects}
              allSubjects={allSubjects}
              selectedClass={selectedClass}
              classes={classes}
            />
          ) : (
          <DashboardChart
            data={chartData}
            config={chartConfig}
              title="Attendance Trend"
              description="Showing attendance trends over time"
              loading={loading}
            timeRange={chartTimeRange}
            onTimeRangeChange={setChartTimeRange}
          />
          )}

          {/* Combined Student Data Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
              <CardTitle>Student Overview</CardTitle>
              <CardDescription>
                Combined marks and attendance data for all students
              </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(loading || marksLoading) ? (
                <div className="flex items-center justify-center h-[250px]">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : filteredAndSortedStudentData.length === 0 ? (
                <div className="flex items-center justify-center h-[250px]">
                  <div className="text-muted-foreground">
                    {searchQuery ? 'No students found matching your search' : 'No student data available'}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedStudentData.length)} of {filteredAndSortedStudentData.length} students
                  </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('studentName')}>
                        <div className="flex items-center gap-2">
                          Student Name
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('batch')}>
                        <div className="flex items-center gap-2">
                          Batch
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('attendancePercentage')}>
                        <div className="flex items-center gap-2">
                          Attendance %
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('totalPresent')}>
                        <div className="flex items-center gap-2">
                          Present
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('totalAbsent')}>
                        <div className="flex items-center gap-2">
                          Absent
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('testCount')}>
                        <div className="flex items-center gap-2">
                          Tests
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('averageMarks')}>
                        <div className="flex items-center gap-2">
                          Avg Marks
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('averagePercentage')}>
                        <div className="flex items-center gap-2">
                          Avg %
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {paginatedStudentData.map((student) => (
                      <TableRow key={student.studentId}>
                        <TableCell className="font-medium">{student.studentName || '-'}</TableCell>
                        <TableCell>{student.batch || '-'}</TableCell>
                        <TableCell>{student.attendancePercentage.toFixed(1)}%</TableCell>
                        <TableCell>{student.totalPresent}</TableCell>
                        <TableCell>{student.totalAbsent}</TableCell>
                        <TableCell>{student.testCount}</TableCell>
                        <TableCell>{student.averageMarks > 0 ? student.averageMarks.toFixed(1) : '-'}</TableCell>
                        <TableCell>{student.averagePercentage > 0 ? `${student.averagePercentage.toFixed(1)}%` : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                  {totalPages > 1 && (
                    <div className="mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                if (currentPage > 1) setCurrentPage(prev => prev - 1)
                              }}
                              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          {(() => {
                            const pages = []
                            const showEllipsis = totalPages > 7
                            
                            if (!showEllipsis) {
                              // Show all pages if 7 or fewer
                              for (let i = 1; i <= totalPages; i++) {
                                pages.push(
                                  <PaginationItem key={i}>
                                    <PaginationLink
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        setCurrentPage(i)
                                      }}
                                      isActive={currentPage === i}
                                      className="cursor-pointer"
                                    >
                                      {i}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              }
                            } else {
                              // Show first page
                              pages.push(
                                <PaginationItem key={1}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setCurrentPage(1)
                                    }}
                                    isActive={currentPage === 1}
                                    className="cursor-pointer"
                                  >
                                    1
                                  </PaginationLink>
                                </PaginationItem>
                              )
                              
                              // Show ellipsis if needed
                              if (currentPage > 3) {
                                pages.push(
                                  <PaginationItem key="ellipsis-start">
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )
                              }
                              
                              // Show pages around current
                              const start = Math.max(2, currentPage - 1)
                              const end = Math.min(totalPages - 1, currentPage + 1)
                              
                              for (let i = start; i <= end; i++) {
                                if (i !== 1 && i !== totalPages) {
                                  pages.push(
                                    <PaginationItem key={i}>
                                      <PaginationLink
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          setCurrentPage(i)
                                        }}
                                        isActive={currentPage === i}
                                        className="cursor-pointer"
                                      >
                                        {i}
                                      </PaginationLink>
                                    </PaginationItem>
                                  )
                                }
                              }
                              
                              // Show ellipsis if needed
                              if (currentPage < totalPages - 2) {
                                pages.push(
                                  <PaginationItem key="ellipsis-end">
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )
                              }
                              
                              // Show last page
                              pages.push(
                                <PaginationItem key={totalPages}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setCurrentPage(totalPages)
                                    }}
                                    isActive={currentPage === totalPages}
                                    className="cursor-pointer"
                                  >
                                    {totalPages}
                                  </PaginationLink>
                                </PaginationItem>
                              )
                            }
                            
                            return pages
                          })()}
                          <PaginationItem>
                            <PaginationNext 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                if (currentPage < totalPages) setCurrentPage(prev => prev + 1)
                              }}
                              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
