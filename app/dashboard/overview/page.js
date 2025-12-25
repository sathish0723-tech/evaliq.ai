"use client"

import { useState, useEffect, useMemo } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Search, Check, ChevronDownIcon } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Line, LineChart, Area, AreaChart, CartesianGrid, XAxis, YAxis, PieChart, Pie, Label as PieLabel, Sector, BarChart, Bar, ComposedChart } from 'recharts'
import { format } from 'date-fns'

export default function OverviewPage() {
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [marksData, setMarksData] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
  const [testsData, setTestsData] = useState([])
  const [subjects, setSubjects] = useState([])
  const [marksLoading, setMarksLoading] = useState(false)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [activeMonth, setActiveMonth] = useState('')
  const [selectedSubject1, setSelectedSubject1] = useState('')
  const [selectedSubject2, setSelectedSubject2] = useState('')
  const [availableSubjects, setAvailableSubjects] = useState([]) // Unique subjects from marks data
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false)

  // Helper to create a safe key from subject name
  const getSubjectKey = (subjectName) => {
    return subjectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  }

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) {
      return students
    }
    const query = studentSearchQuery.toLowerCase()
    return students.filter(student => 
      student.name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.studentId?.toLowerCase().includes(query)
    )
  }, [students, studentSearchQuery])

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    if (selectedStudentId) {
      const student = students.find(s => s.id === selectedStudentId)
      setSelectedStudent(student)
      fetchStudentData(selectedStudentId)
      // Reset subject selections when student changes
      setSelectedSubject1('')
      setSelectedSubject2('')
      setAvailableSubjects([])
    } else {
      setSelectedStudent(null)
      setMarksData([])
      setAttendanceData([])
      setTestsData([])
      setSelectedSubject1('')
      setSelectedSubject2('')
      setAvailableSubjects([])
    }
  }, [selectedStudentId, students])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/students')
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

  const fetchStudentData = async (studentId) => {
    setMarksLoading(true)
    setAttendanceLoading(true)

    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      
      // Get the student object
      const student = students.find(s => s.id === studentId)
      
      // Calculate date range (last 90 days)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // Fetch marks
      const marksUrl = buildUrlWithBatch('/api/marks')
      const marksResponse = await fetch(marksUrl, {
        credentials: 'include',
      })

      let studentMarks = []
      if (marksResponse.ok) {
        const marksData = await marksResponse.json()
        // Filter marks for selected student
        studentMarks = (marksData.marks || []).filter(mark => mark.studentId === studentId)
        setMarksData(studentMarks)
      }

      // Fetch tests
      const testsUrl = buildUrlWithBatch('/api/tests')
      const testsResponse = await fetch(testsUrl, {
        credentials: 'include',
      })

      if (testsResponse.ok) {
        const testsData = await testsResponse.json()
        setTestsData(testsData.tests || [])
      }

      // Fetch subjects
      const subjectsUrl = buildUrlWithBatch('/api/subjects')
      const subjectsResponse = await fetch(subjectsUrl, {
        credentials: 'include',
      })

      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json()
        const allSubjects = subjectsData.subjects || []
        setSubjects(allSubjects)

        // Extract unique subjects from marks data
        const uniqueSubjectsMap = new Map()
        studentMarks.forEach(mark => {
          const subject = allSubjects.find(s => s.subjectId === mark.subjectId)
          if (subject && !uniqueSubjectsMap.has(subject.subjectId)) {
            uniqueSubjectsMap.set(subject.subjectId, {
              subjectId: subject.subjectId,
              name: subject.name,
              key: getSubjectKey(subject.name)
            })
          }
        })
        const uniqueSubjectsArray = Array.from(uniqueSubjectsMap.values())
        setAvailableSubjects(uniqueSubjectsArray)
        
        // Auto-select first two subjects if available and not already selected
        if (uniqueSubjectsArray.length > 0 && !selectedSubject1) {
          setSelectedSubject1(uniqueSubjectsArray[0].subjectId)
        }
        if (uniqueSubjectsArray.length > 1 && !selectedSubject2) {
          setSelectedSubject2(uniqueSubjectsArray[1].subjectId)
        }
      }

      // Fetch attendance stats for the selected student
      const attendanceUrl = buildUrlWithBatch('/api/attendance/stats', {
        startDate: startDateStr,
        endDate: endDateStr,
        studentId: studentId, // Filter by specific student
        ...(student?.classId ? { classId: student.classId } : {}),
      })
      const attendanceResponse = await fetch(attendanceUrl, {
        credentials: 'include',
      })

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        // Get student-specific stats (should only have one student when studentId is provided)
        const studentAttendance = (attendanceData.studentStats || []).find(
          stat => stat.studentId === studentId
        ) || { present: 0, absent: 0, late: 0, attendancePercentage: 0 }
        
        setAttendanceData({
          stats: studentAttendance,
          chartData: attendanceData.chartData || [], // This now contains only the selected student's data
        })
      }
    } catch (error) {
      console.error('Error fetching student data:', error)
    } finally {
      setMarksLoading(false)
      setAttendanceLoading(false)
    }
  }

  // Prepare marks chart data - filtered by selected subjects
  const marksChartData = useMemo(() => {
    if (!marksData.length || !testsData.length || !subjects.length) return []
    if (!selectedSubject1 && !selectedSubject2) return []

    // Get selected subjects
    const subject1 = subjects.find(s => s.subjectId === selectedSubject1)
    const subject2 = subjects.find(s => s.subjectId === selectedSubject2)
    const selectedSubjects = [subject1, subject2].filter(Boolean)

    if (selectedSubjects.length === 0) return []

    // Group marks by test date and selected subjects
    const dataMap = new Map()
    
    marksData.forEach(mark => {
      const test = testsData.find(t => t.testId === mark.testId)
      if (!test) return

      const subject = subjects.find(s => s.subjectId === mark.subjectId)
      if (!subject) return
      
      // Only include selected subjects
      if (!selectedSubjects.find(s => s.subjectId === subject.subjectId)) return

      const date = test.date
      if (!dataMap.has(date)) {
        dataMap.set(date, { date })
      }

      const dateData = dataMap.get(date)
      const percentage = mark.maxMarks > 0 ? (mark.marks / mark.maxMarks) * 100 : 0
      // Use sanitized key for chart data
      const subjectKey = getSubjectKey(subject.name)
      dateData[subjectKey] = percentage
    })

    // Convert to array and sort by date
    const chartData = Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    )

    return chartData
  }, [marksData, testsData, subjects, selectedSubject1, selectedSubject2])

  // Prepare marks chart config - only for selected subjects
  const marksChartConfig = useMemo(() => {
    const config = {}
    const colors = [
      { light: "hsl(217, 91%, 60%)", dark: "hsl(217, 91%, 70%)" },
      { light: "hsl(280, 70%, 50%)", dark: "hsl(280, 70%, 60%)" },
      { light: "hsl(142, 76%, 36%)", dark: "hsl(142, 70%, 50%)" },
      { light: "hsl(45, 93%, 47%)", dark: "hsl(45, 93%, 60%)" },
      { light: "hsl(0, 84%, 60%)", dark: "hsl(0, 72%, 58%)" },
      { light: "hsl(199, 89%, 48%)", dark: "hsl(199, 89%, 58%)" },
    ]

    // Only include selected subjects
    const subject1 = subjects.find(s => s.subjectId === selectedSubject1)
    const subject2 = subjects.find(s => s.subjectId === selectedSubject2)
    const selectedSubjects = [subject1, subject2].filter(Boolean)

    selectedSubjects.forEach((subject, index) => {
      if (!subject) return
      const color = colors[index % colors.length]
      const subjectKey = getSubjectKey(subject.name)
      config[subjectKey] = {
        label: subject.name,
        theme: color,
      }
    })

    return config
  }, [subjects, selectedSubject1, selectedSubject2])

  // Prepare monthly attendance data for pie chart
  const monthlyAttendanceData = useMemo(() => {
    if (!attendanceData.chartData || attendanceData.chartData.length === 0) return []
    
    const monthMap = new Map()
    
    attendanceData.chartData.forEach(day => {
      const date = new Date(day.date)
      const monthKey = format(date, 'MMMM yyyy')
      const monthShort = format(date, 'MMMM').toLowerCase()
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthShort,
          monthKey: monthKey,
          present: 0,
          absent: 0,
          late: 0,
          fill: `var(--color-${monthShort})`,
        })
      }
      
      const monthData = monthMap.get(monthKey)
      // Count days - for a single student, values are 0 or 1
      // Count each day only once (present, absent, or late)
      if (day.present > 0) {
        monthData.present++
      }
      if (day.absent > 0) {
        monthData.absent++
      }
      if (day.late > 0) {
        monthData.late++
      }
    })
    
    return Array.from(monthMap.values()).sort((a, b) => {
      const dateA = new Date(a.monthKey)
      const dateB = new Date(b.monthKey)
      return dateA - dateB
    })
  }, [attendanceData])

  // Set active month to first month if available
  useEffect(() => {
    if (monthlyAttendanceData.length > 0 && !activeMonth) {
      setActiveMonth(monthlyAttendanceData[0].month)
    }
  }, [monthlyAttendanceData, activeMonth])

  // Get active month data
  const activeMonthData = useMemo(() => {
    if (!activeMonth) return null
    return monthlyAttendanceData.find(m => m.month === activeMonth)
  }, [activeMonth, monthlyAttendanceData])

  // Prepare pie chart data for selected month (present, absent, late)
  const pieChartData = useMemo(() => {
    if (!activeMonthData) return []
    
    return [
      {
        name: 'Present',
        value: activeMonthData.present,
        fill: 'var(--color-present)',
      },
      {
        name: 'Absent',
        value: activeMonthData.absent,
        fill: 'var(--color-absent)',
      },
      {
        name: 'Late',
        value: activeMonthData.late,
        fill: 'var(--color-late)',
      },
    ].filter(item => item.value > 0) // Only show segments with data
  }, [activeMonthData])

  const activeIndex = useMemo(() => {
    if (!activeMonthData) return 0
    return pieChartData.findIndex(item => item.name === 'Present')
  }, [activeMonthData, pieChartData])

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
    // Month colors
    january: {
      label: "January",
      color: "var(--chart-1)",
    },
    february: {
      label: "February",
      color: "var(--chart-2)",
    },
    march: {
      label: "March",
      color: "var(--chart-3)",
    },
    april: {
      label: "April",
      color: "var(--chart-4)",
    },
    may: {
      label: "May",
      color: "var(--chart-5)",
    },
    june: {
      label: "June",
      color: "var(--chart-1)",
    },
    july: {
      label: "July",
      color: "var(--chart-2)",
    },
    august: {
      label: "August",
      color: "var(--chart-3)",
    },
    september: {
      label: "September",
      color: "var(--chart-4)",
    },
    october: {
      label: "October",
      color: "var(--chart-5)",
    },
    november: {
      label: "November",
      color: "var(--chart-1)",
    },
    december: {
      label: "December",
      color: "var(--chart-2)",
    },
  }

  // Prepare test data table
  const testTableData = useMemo(() => {
    if (!marksData.length || !testsData.length || !subjects.length) return []

    return marksData.map(mark => {
      const test = testsData.find(t => t.testId === mark.testId)
      const subject = subjects.find(s => s.subjectId === mark.subjectId)
      const percentage = mark.maxMarks > 0 ? (mark.marks / mark.maxMarks) * 100 : 0

      return {
        testId: mark.testId,
        testName: test?.name || 'Unknown Test',
        testDate: test?.date || '',
        subjectName: subject?.name || 'Unknown Subject',
        marks: mark.marks,
        maxMarks: mark.maxMarks,
        percentage: percentage.toFixed(1),
      }
    }).sort((a, b) => new Date(b.testDate) - new Date(a.testDate))
  }, [marksData, testsData, subjects])

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
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {/* Student Selection */}
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="student">Select Student</Label>
            <Popover open={studentDropdownOpen} onOpenChange={(open) => {
              setStudentDropdownOpen(open)
              if (!open) {
                setStudentSearchQuery('') // Clear search when closing
              }
            }}>
              <PopoverTrigger asChild>
                <button
                  id="student"
                  className="flex h-9 w-[300px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="truncate">
                    {selectedStudentId
                      ? (() => {
                          const student = students.find(s => s.id === selectedStudentId)
                          return student ? `${student.name}${student.email ? ` (${student.email})` : ''}` : 'Select a student'
                        })()
                      : 'Select a student'}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <div className="flex flex-col">
                  {/* Search Bar */}
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                      placeholder="Search students..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
                      autoFocus
                    />
                  </div>
                  {/* Student List */}
                  <div className="max-h-[200px] overflow-y-auto">
                    {loading ? (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        Loading students...
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        {studentSearchQuery ? 'No students found' : 'No students available'}
                      </div>
                    ) : (
                      <div className="p-1">
                        {filteredStudents.map((student) => (
                          <button
                            key={student.id}
                            onClick={() => {
                              setSelectedStudentId(student.id)
                              setStudentDropdownOpen(false)
                              setStudentSearchQuery('')
                            }}
                            className={`relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${
                              selectedStudentId === student.id ? 'bg-accent' : ''
                            }`}
                          >
                            <div className="flex flex-col items-start flex-1 min-w-0">
                              <span className="truncate font-medium">{student.name}</span>
                              {student.email && (
                                <span className="truncate text-xs text-muted-foreground">{student.email}</span>
                              )}
                            </div>
                            {selectedStudentId === student.id && (
                              <Check className="ml-2 h-4 w-4 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Student Information and Charts */}
          {selectedStudent && (
            <>
              {/* Student Info Card */}
              <Card className="w-fit max-w-md">
                <CardHeader>
                  <CardTitle>Student Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedStudent.photo || '/placeholder-user.jpg'} alt={selectedStudent.name} />
                      <AvatarFallback>{selectedStudent.name?.charAt(0) || 'S'}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1.5">
                      <div>
                        <h3 className="text-lg font-semibold">{selectedStudent.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div>
                          <span className="text-muted-foreground">Student ID:</span>
                          <p className="font-medium">{selectedStudent.studentId}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Batch:</span>
                          <p className="font-medium">{selectedStudent.batch || 'N/A'}</p>
                        </div>
                        {attendanceData.stats && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Attendance:</span>
                              <p className="font-medium">{attendanceData.stats.attendancePercentage?.toFixed(1) || 0}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Present/Absent/Late:</span>
                              <p className="font-medium">
                                {attendanceData.stats.present || 0} / {attendanceData.stats.absent || 0} / {attendanceData.stats.late || 0}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subject Selection and Chart Type */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Marks by Subject</CardTitle>
                      <CardDescription>Compare performance across selected subjects</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-0 mb-6">
                    <div className="flex flex-col space-y-1.5 flex-1 min-w-[200px]">
                      <Label htmlFor="subject1">Subject 1</Label>
                      <Select value={selectedSubject1} onValueChange={setSelectedSubject1}>
                        <SelectTrigger id="subject1">
                          <SelectValue placeholder="Select first subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubjects.map((subject) => (
                            <SelectItem key={subject.subjectId} value={subject.subjectId}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col space-y-1.5 flex-1 min-w-[200px]">
                      <Label htmlFor="subject2">Subject 2 (Optional)</Label>
                      <Select 
                        value={selectedSubject2 || undefined} 
                        onValueChange={(value) => {
                          if (value) {
                            setSelectedSubject2(value)
                          } else {
                            setSelectedSubject2('')
                          }
                        }}
                      >
                        <SelectTrigger id="subject2">
                          <SelectValue placeholder="Select second subject (for comparison)" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubjects.filter(s => s.subjectId !== selectedSubject1).map((subject) => (
                            <SelectItem key={subject.subjectId} value={subject.subjectId}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedSubject2 && (
                        <button
                          type="button"
                          onClick={() => setSelectedSubject2('')}
                          className="text-xs text-muted-foreground hover:text-foreground mt-1"
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                  </div>

                  {marksLoading ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <div className="text-muted-foreground">Loading marks data...</div>
                    </div>
                  ) : !selectedSubject1 ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <div className="text-muted-foreground">Please select at least one subject to view the chart</div>
                    </div>
                  ) : marksChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <div className="text-muted-foreground">No marks data available for selected subjects</div>
                    </div>
                  ) : (
                    <ChartContainer config={marksChartConfig} className="h-[300px] w-full">
                      {selectedSubject2 ? (
                        // Combined chart: Subject 1 as bars, Subject 2 as line
                        <ComposedChart data={marksChartData}>
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
                            yAxisId="left"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => `${value}%`}
                            label={{ value: subjects.find(s => s.subjectId === selectedSubject1)?.name || 'Subject 1', angle: -90, position: 'insideLeft' }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => `${value}%`}
                            label={{ value: subjects.find(s => s.subjectId === selectedSubject2)?.name || 'Subject 2', angle: 90, position: 'insideRight' }}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                labelFormatter={(value) => {
                                  return format(new Date(value), 'MMM d, yyyy')
                                }}
                                formatter={(value) => [`${value?.toFixed(1)}%`, 'Percentage']}
                              />
                            }
                          />
                          {(() => {
                            const subject1 = subjects.find(s => s.subjectId === selectedSubject1)
                            const subject2 = subjects.find(s => s.subjectId === selectedSubject2)
                            const elements = []
                            
                            // Subject 1 as Bar Chart
                            if (subject1) {
                              const subjectKey1 = getSubjectKey(subject1.name)
                              elements.push(
                                <Bar
                                  key={subject1.subjectId}
                                  yAxisId="left"
                                  dataKey={subjectKey1}
                                  fill={`var(--color-${subjectKey1})`}
                                  radius={[4, 4, 0, 0]}
                                />
                              )
                            }
                            
                            // Subject 2 as Line Chart
                            if (subject2) {
                              const subjectKey2 = getSubjectKey(subject2.name)
                              elements.push(
                                <Line
                                  key={subject2.subjectId}
                                  yAxisId="right"
                                  type="monotone"
                                  dataKey={subjectKey2}
                                  stroke={`var(--color-${subjectKey2})`}
                                  strokeWidth={2}
                                  dot={{ r: 4 }}
                                  activeDot={{ r: 6 }}
                                />
                              )
                            }
                            
                            return elements
                          })()}
                          <ChartLegend content={<ChartLegendContent />} />
                        </ComposedChart>
                      ) : (
                        // Single subject: Show as line chart
                        <LineChart data={marksChartData}>
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
                            tickFormatter={(value) => `${value}%`}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                labelFormatter={(value) => {
                                  return format(new Date(value), 'MMM d, yyyy')
                                }}
                                formatter={(value) => [`${value?.toFixed(1)}%`, 'Percentage']}
                              />
                            }
                          />
                          {(() => {
                            const subject1 = subjects.find(s => s.subjectId === selectedSubject1)
                            if (!subject1) return null
                            
                            const subjectKey1 = getSubjectKey(subject1.name)
                            return (
                              <Line
                                key={subject1.subjectId}
                                type="monotone"
                                dataKey={subjectKey1}
                                stroke={`var(--color-${subjectKey1})`}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            )
                          })()}
                          <ChartLegend content={<ChartLegendContent />} />
                        </LineChart>
                      )}
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Attendance Pie Chart */}
              <Card className="flex flex-col">
                <CardHeader className="flex-row items-start space-y-0 pb-0">
                  <div className="grid gap-1">
                    <CardTitle>Attendance Trend</CardTitle>
                    <CardDescription>Monthly attendance breakdown</CardDescription>
                  </div>
                  {monthlyAttendanceData.length > 0 && (
                    <Select value={activeMonth} onValueChange={setActiveMonth}>
                      <SelectTrigger
                        className="ml-auto h-7 w-[130px] rounded-lg pl-2.5"
                        aria-label="Select a month"
                      >
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent align="end" className="rounded-xl">
                        {monthlyAttendanceData.map((monthData) => {
                          const config = attendanceChartConfig[monthData.month]
                          if (!config) return null
                          return (
                            <SelectItem
                              key={monthData.monthKey}
                              value={monthData.month}
                              className="rounded-lg [&_span]:flex"
                            >
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className="flex h-3 w-3 shrink-0 rounded-xs"
                                  style={{
                                    backgroundColor: `var(--color-${monthData.month})`,
                                  }}
                                />
                                {monthData.monthKey}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </CardHeader>
                <CardContent className="flex flex-1 justify-center pb-0">
                  {attendanceLoading ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <div className="text-muted-foreground">Loading attendance data...</div>
                    </div>
                  ) : pieChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <div className="text-muted-foreground">No attendance data available</div>
                    </div>
                  ) : (
                    <ChartContainer
                      id="attendance-pie"
                      config={attendanceChartConfig}
                      className="mx-auto aspect-square w-full max-w-[300px]"
                    >
                      <PieChart>
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                          data={pieChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          strokeWidth={5}
                          activeIndex={activeIndex}
                          activeShape={({
                            outerRadius = 0,
                            ...props
                          }) => (
                            <g>
                              <Sector {...props} outerRadius={outerRadius + 10} />
                              <Sector
                                {...props}
                                outerRadius={outerRadius + 25}
                                innerRadius={outerRadius + 12}
                              />
                            </g>
                          )}
                        >
                          <PieLabel
                            content={({ viewBox }) => {
                              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                const totalDays = (activeMonthData?.present || 0) + (activeMonthData?.absent || 0) + (activeMonthData?.late || 0)
                                return (
                                  <text
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                  >
                                    <tspan
                                      x={viewBox.cx}
                                      y={viewBox.cy}
                                      className="fill-foreground text-3xl font-bold"
                                    >
                                      {totalDays}
                                    </tspan>
                                    <tspan
                                      x={viewBox.cx}
                                      y={(viewBox.cy || 0) + 24}
                                      className="fill-muted-foreground text-sm"
                                    >
                                      Total Days
                                    </tspan>
                                  </text>
                                )
                              }
                            }}
                          />
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  )}
                  {activeMonthData && (
                    <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-xs bg-[var(--color-present)]" />
                        <span className="text-muted-foreground">Present:</span>
                        <span className="font-semibold">{activeMonthData.present} days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-xs bg-[var(--color-absent)]" />
                        <span className="text-muted-foreground">Absent:</span>
                        <span className="font-semibold">{activeMonthData.absent} days</span>
                      </div>
                      {activeMonthData.late > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-xs bg-[var(--color-late)]" />
                          <span className="text-muted-foreground">Late:</span>
                          <span className="font-semibold">{activeMonthData.late} days</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Test Data Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Test Results</CardTitle>
                  <CardDescription>All test scores and performance</CardDescription>
                </CardHeader>
                <CardContent>
                  {marksLoading ? (
                    <div className="flex items-center justify-center h-[250px]">
                      <div className="text-muted-foreground">Loading test data...</div>
                    </div>
                  ) : testTableData.length === 0 ? (
                    <div className="flex items-center justify-center h-[250px]">
                      <div className="text-muted-foreground">No test data available</div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Test Name</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Marks</TableHead>
                          <TableHead>Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {testTableData.map((test) => (
                          <TableRow key={test.testId}>
                            <TableCell className="font-medium">{test.testName}</TableCell>
                            <TableCell>{test.subjectName}</TableCell>
                            <TableCell>
                              {test.testDate ? format(new Date(test.testDate), 'MMM d, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {test.marks} / {test.maxMarks}
                            </TableCell>
                            <TableCell>
                              <span className={parseFloat(test.percentage) >= 70 ? 'text-green-600' : parseFloat(test.percentage) >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                                {test.percentage}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

