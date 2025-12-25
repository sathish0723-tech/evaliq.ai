"use client"

import { useState, useEffect, useRef } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Download, Calculator, Award, X, ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { RankCard } from '@/components/rank-card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'

// Get Indian timezone date
function getIndianDate() {
  const now = new Date()
  const indianDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  return indianDate.toISOString().split('T')[0]
}

export default function MarksheetPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.classId
  const subjectId = params.subjectId
  const [students, setStudents] = useState([])
  const [subject, setSubject] = useState(null)
  const [allSubjects, setAllSubjects] = useState([]) // All subjects for the class
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodType, setPeriodType] = useState('monthly') // monthly or weekly
  // Store formula per subject: { subjectId: { calculation, weights, attendanceWeight, marksWeight } }
  const [subjectFormulas, setSubjectFormulas] = useState({})
  // Store calculated marks per subject: { subjectId: { studentId: { totalMarks, percentage, attendancePercentage } } }
  const [calculatedMarks, setCalculatedMarks] = useState({})
  // Store tests per subject: { subjectId: [tests] }
  const [subjectTests, setSubjectTests] = useState({})
  // Store selected tests per subject: { subjectId: [testIds] }
  const [selectedTestsBySubject, setSelectedTestsBySubject] = useState({})
  const [testDropdownOpen, setTestDropdownOpen] = useState(false) // Global test dropdown
  const [dateRange, setDateRange] = useState({
    start: getIndianDate(),
    end: getIndianDate(),
  })
  const { toast } = useToast()

  useEffect(() => {
    if (classId) {
      fetchClassData()
      fetchAllSubjects()
      fetchStudents()
    }
    if (classId && subjectId) {
      fetchSubject()
    }
  }, [classId, subjectId])

  // Use ref to track if we should recalculate
  const prevDepsRef = useRef({})

  useEffect(() => {
    if (students.length > 0 && classId && allSubjects.length > 0) {
      const currentDeps = {
        studentsLength: students.length,
        dateStart: dateRange.start,
        dateEnd: dateRange.end,
        period: periodType,
        formulas: JSON.stringify(subjectFormulas),
      }
      
      // Only recalculate if dependencies actually changed
      const prevDeps = prevDepsRef.current
      const hasChanged = 
        prevDeps.studentsLength !== currentDeps.studentsLength ||
        prevDeps.dateStart !== currentDeps.dateStart ||
        prevDeps.dateEnd !== currentDeps.dateEnd ||
        prevDeps.period !== currentDeps.period ||
        prevDeps.formulas !== currentDeps.formulas
      
      if (hasChanged || Object.keys(prevDeps).length === 0) {
        prevDepsRef.current = currentDeps
        calculateAllSubjectsMarks()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length, subjectFormulas, dateRange.start, dateRange.end, periodType, classId, allSubjects.length])
  
  // Separate effect for selectedTestsBySubject (user actions only)
  useEffect(() => {
    if (students.length > 0 && classId && allSubjects.length > 0) {
      calculateAllSubjectsMarks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestsBySubject])

  const fetchClassData = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/classes')
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
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

  const fetchSubject = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/subjects', { classId })
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (response.ok) {
        const data = await response.json()
        const foundSubject = data.subjects?.find(sub => sub.subjectId === subjectId)
        setSubject(foundSubject)
      }
    } catch (error) {
      console.error('Error fetching subject:', error)
    }
  }

  const fetchAllSubjects = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/subjects', { classId })
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (response.ok) {
        const data = await response.json()
        const subjects = data.subjects || []
        setAllSubjects(subjects)
        
        // Initialize formulas for each subject
        const initialFormulas = {}
        subjects.forEach(sub => {
          initialFormulas[sub.subjectId] = {
            calculation: 'average',
            weights: {},
            attendanceWeight: 10,
            marksWeight: 90,
          }
        })
        setSubjectFormulas(initialFormulas)
        
        // Fetch tests for each subject and auto-select them
        const initialSelectedTests = {}
        for (const subject of subjects) {
          const testsUrl = buildUrlWithBatch('/api/tests', { classId, subjectId: subject.subjectId })
          const testsResponse = await fetch(testsUrl, {
            credentials: 'include',
            cache: 'no-store',
          })
          if (testsResponse.ok) {
            const testsData = await testsResponse.json()
            const allTests = testsData.tests || []
            if (allTests.length > 0) {
              initialSelectedTests[subject.subjectId] = allTests.map(test => test.testId)
            }
          }
        }
        setSelectedTestsBySubject(prev => {
          // Only set if not already set (preserve user selections)
          const updated = { ...prev }
          Object.keys(initialSelectedTests).forEach(subjectId => {
            if (!updated[subjectId] || updated[subjectId].length === 0) {
              updated[subjectId] = initialSelectedTests[subjectId]
            }
          })
          return updated
        })
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/students', { classId })
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
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

  const calculateAllSubjectsMarks = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const allCalculatedMarks = {}
      const allSubjectTests = {}
      const allSelectedTests = {}
      
      // Calculate date range based on period type
      let startDate, endDate
      if (periodType === 'weekly') {
        // For weekly, get last 7 days
        const today = new Date()
        endDate = new Date(today)
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 7)
      } else {
        // For monthly, use the date range
        startDate = new Date(dateRange.start)
        endDate = new Date(dateRange.end)
      }
      
      // Process each subject
      for (const subject of allSubjects) {
        const subjectFormula = subjectFormulas[subject.subjectId] || {
          calculation: 'average',
          weights: {},
          attendanceWeight: 10,
          marksWeight: 90,
        }
        
        // Fetch tests for this subject
        const testsUrl = buildUrlWithBatch('/api/tests', { classId, subjectId: subject.subjectId })
      const testsResponse = await fetch(testsUrl, {
        credentials: 'include',
        cache: 'no-store',
      })
      
        if (!testsResponse.ok) continue
      
      const testsData = await testsResponse.json()
      const allTests = testsData.tests || []
        allSubjectTests[subject.subjectId] = allTests
        
        // Use existing selected tests (don't auto-select here to prevent infinite loop)
        allSelectedTests[subject.subjectId] = selectedTestsBySubject[subject.subjectId] || []
      
        // Filter tests by date range and selected tests
      const filteredTests = allTests.filter(test => {
        const testDate = new Date(test.date)
          const inDateRange = testDate >= startDate && testDate <= endDate
          const selectedTests = allSelectedTests[subject.subjectId] || []
          const isSelected = selectedTests.length === 0 || selectedTests.includes(test.testId)
          return inDateRange && isSelected
      })
      
      // Fetch marks for all tests
      const marksMap = {}
      for (const test of filteredTests) {
        const marksUrl = buildUrlWithBatch('/api/marks', { testId: test.testId })
        const marksResponse = await fetch(marksUrl, {
          credentials: 'include',
          cache: 'no-store',
        })
        
        if (marksResponse.ok) {
          const marksData = await marksResponse.json()
          marksData.marks?.forEach(mark => {
            if (!marksMap[mark.studentId]) {
              marksMap[mark.studentId] = []
            }
            marksMap[mark.studentId].push({
              testId: test.testId,
              testName: test.name,
              marks: mark.marks,
              maxMarks: mark.maxMarks,
              percentage: (mark.marks / mark.maxMarks) * 100,
                weight: subjectFormula.weights[test.testId] || 1,
              })
            })
          }
      }
      
      // Fetch attendance data
      const attendanceUrl = buildUrlWithBatch('/api/attendance/stats', { 
        classId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
      })
      const attendanceResponse = await fetch(attendanceUrl, {
        credentials: 'include',
        cache: 'no-store',
      })
      
      const attendanceMap = {}
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        if (attendanceData.studentStats) {
          attendanceData.studentStats.forEach(stat => {
            attendanceMap[stat.studentId] = stat.attendancePercentage || 0
          })
        }
      }
      
        // Calculate final marks for each student for this subject
      const calculated = {}
      students.forEach(student => {
        const studentMarks = marksMap[student.id] || []
        const attendancePercentage = attendanceMap[student.id] || 0
        
        let totalMarks = 0
        let totalMaxMarks = 0
        let weightedSum = 0
        let totalWeight = 0
        
        if (studentMarks.length > 0) {
            if (subjectFormula.calculation === 'average') {
            studentMarks.forEach(m => {
              totalMarks += m.marks
              totalMaxMarks += m.maxMarks
            })
            totalMarks = totalMarks / studentMarks.length
            totalMaxMarks = totalMaxMarks / studentMarks.length
            } else if (subjectFormula.calculation === 'sum') {
            studentMarks.forEach(m => {
              totalMarks += m.marks
              totalMaxMarks += m.maxMarks
            })
            } else if (subjectFormula.calculation === 'weighted') {
            studentMarks.forEach(m => {
              weightedSum += m.percentage * m.weight
              totalWeight += m.weight
            })
            totalMarks = (weightedSum / totalWeight) * 100
            totalMaxMarks = 100
          }
        }
        
        // Combine marks and attendance based on weights
        const marksPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0
          const finalPercentage = (marksPercentage * subjectFormula.marksWeight / 100) + 
                                  (attendancePercentage * subjectFormula.attendanceWeight / 100)
        
        calculated[student.id] = {
          totalMarks,
          totalMaxMarks,
          marksPercentage,
          attendancePercentage,
          finalPercentage,
          testCount: studentMarks.length,
        }
      })
      
        allCalculatedMarks[subject.subjectId] = calculated
      }
      
      setCalculatedMarks(allCalculatedMarks)
      setSubjectTests(allSubjectTests)
      // Don't update selectedTestsBySubject here - it's only updated by user actions
    } catch (error) {
      console.error('Error calculating marks:', error)
    }
  }

  const handleFormulaChange = (subjectId, field, value) => {
    setSubjectFormulas(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
      [field]: value,
      },
    }))
  }

  const handleWeightChange = (subjectId, testId, weight) => {
    setSubjectFormulas(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
      weights: {
          ...prev[subjectId]?.weights || {},
        [testId]: parseFloat(weight) || 1,
        },
      },
    }))
  }

  const handleTestToggle = (subjectId, testId) => {
    setSelectedTestsBySubject(prev => {
      const current = prev[subjectId] || []
      if (current.includes(testId)) {
        return {
          ...prev,
          [subjectId]: current.filter(id => id !== testId),
        }
      } else {
        return {
          ...prev,
          [subjectId]: [...current, testId],
        }
      }
    })
  }

  const handleRemoveTest = (subjectId, testId) => {
    setSelectedTestsBySubject(prev => ({
      ...prev,
      [subjectId]: (prev[subjectId] || []).filter(id => id !== testId),
    }))
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
                  <BreadcrumbLink href="/marks">
                    Marks
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Marksheet</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {classData ? `${classData.name} - Marksheet` : 'Marksheet'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Calculate marks and generate rank cards for all subjects in {classData?.name || 'class'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/marks/${classId}/${subjectId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Marks
            </Button>
          </div>

          {/* Period Selection - Global, appears once outside tabs */}
              <Card>
                <CardHeader>
              <CardTitle>Period Selection</CardTitle>
                  <CardDescription>
                Select the period type for calculation
                  </CardDescription>
                </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="periodType">Period Type</Label>
                <Select
                  value={periodType}
                  onValueChange={setPeriodType}
                >
                  <SelectTrigger id="periodType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range - Only show when Monthly is selected */}
              {periodType === 'monthly' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                  </div>
              )}

              {periodType === 'weekly' && (
                <div className="rounded-md border p-3 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Weekly calculation will use the last 7 days from today.
                  </p>
                </div>
              )}

              {/* Test Selection - Global for all subjects */}
              <div className="space-y-2">
                <Label>Select Tests</Label>
                <Popover open={testDropdownOpen} onOpenChange={setTestDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      role="combobox"
                    >
                      <span>
                        {(() => {
                          const totalSelected = Object.values(selectedTestsBySubject).reduce((sum, tests) => sum + (tests?.length || 0), 0)
                          return totalSelected === 0
                            ? 'Select tests...'
                            : `${totalSelected} test${totalSelected > 1 ? 's' : ''} selected`
                        })()}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="max-h-60 overflow-y-auto p-2">
                      {allSubjects.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No subjects available
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {allSubjects.map((subject) => {
                            const tests = subjectTests[subject.subjectId] || []
                            const selectedTests = selectedTestsBySubject[subject.subjectId] || []
                            
                            if (tests.length === 0) return null
                            
                            return (
                              <div key={subject.subjectId} className="space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground px-2">
                                  {subject.name}
                                </div>
                                {tests.map((test) => (
                                  <div
                                    key={test.testId}
                                    className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent"
                                  >
                                    <Checkbox
                                      id={`test-global-${subject.subjectId}-${test.testId}`}
                                      checked={selectedTests.includes(test.testId)}
                                      onCheckedChange={() => handleTestToggle(subject.subjectId, test.testId)}
                                    />
                                    <label
                                      htmlFor={`test-global-${subject.subjectId}-${test.testId}`}
                                      className="flex-1 cursor-pointer text-sm"
                                    >
                                      <div className="font-medium">{test.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(test.date).toLocaleDateString()}
                                      </div>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                
                {/* Selected Tests Chips - Show all selected tests from all subjects */}
                {(() => {
                  const allSelectedTests = Object.entries(selectedTestsBySubject).flatMap(([subjectId, testIds]) => {
                    const subject = allSubjects.find(s => s.subjectId === subjectId)
                    const tests = subjectTests[subjectId] || []
                    return testIds.map(testId => {
                      const test = tests.find(t => t.testId === testId)
                      return test ? { ...test, subjectId, subjectName: subject?.name } : null
                    }).filter(Boolean)
                  })
                  
                  return allSelectedTests.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      <Label className="text-xs text-muted-foreground">Selected Tests:</Label>
                      <div className="flex flex-wrap gap-2 p-3 rounded-md border bg-muted/30 min-h-[60px]">
                        {allSelectedTests.map((test) => (
                          <Badge
                            key={`${test.subjectId}-${test.testId}`}
                            variant="secondary"
                            className="flex items-center gap-1.5 pr-1.5"
                          >
                            <span>{test.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTest(test.subjectId, test.testId)}
                              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="formula" className="w-full">
            <TabsList>
              <TabsTrigger value="formula">
                <Calculator className="mr-2 h-4 w-4" />
                Formula & Calculation
              </TabsTrigger>
              <TabsTrigger value="rankcards">
                <Award className="mr-2 h-4 w-4" />
                Rank Cards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="formula" className="space-y-4">
              {/* Subject-wise Configuration */}
              {allSubjects.map((subject) => {
                const subjectFormula = subjectFormulas[subject.subjectId] || {
                  calculation: 'average',
                  weights: {},
                  attendanceWeight: 10,
                  marksWeight: 90,
                }
                const tests = subjectTests[subject.subjectId] || []

                return (
                  <Card key={subject.subjectId}>
                    <CardHeader>
                      <CardTitle>{subject.name} - Calculation Formula</CardTitle>
                      <CardDescription>
                        Configure how marks are calculated for {subject.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                  {/* Calculation Type */}
                  <div className="space-y-2">
                        <Label htmlFor={`calculationType-${subject.subjectId}`}>Calculation Type</Label>
                    <Select
                          value={subjectFormula.calculation}
                          onValueChange={(value) => handleFormulaChange(subject.subjectId, 'calculation', value)}
                    >
                          <SelectTrigger id={`calculationType-${subject.subjectId}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="average">Average (Mean)</SelectItem>
                        <SelectItem value="sum">Sum (Total)</SelectItem>
                        <SelectItem value="weighted">Weighted Average</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Weights */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                          <Label htmlFor={`marksWeight-${subject.subjectId}`}>Marks Weight (%)</Label>
                      <Input
                            id={`marksWeight-${subject.subjectId}`}
                        type="number"
                        min="0"
                        max="100"
                            value={subjectFormula.marksWeight}
                        onChange={(e) => {
                          const marksWeight = parseFloat(e.target.value) || 0
                              handleFormulaChange(subject.subjectId, 'marksWeight', marksWeight)
                              handleFormulaChange(subject.subjectId, 'attendanceWeight', 100 - marksWeight)
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                          <Label htmlFor={`attendanceWeight-${subject.subjectId}`}>Attendance Weight (%)</Label>
                      <Input
                            id={`attendanceWeight-${subject.subjectId}`}
                        type="number"
                        min="0"
                        max="100"
                            value={subjectFormula.attendanceWeight}
                        onChange={(e) => {
                          const attendanceWeight = parseFloat(e.target.value) || 0
                              handleFormulaChange(subject.subjectId, 'attendanceWeight', attendanceWeight)
                              handleFormulaChange(subject.subjectId, 'marksWeight', 100 - attendanceWeight)
                        }}
                      />
                    </div>
                  </div>

                  {/* Test Weights (for weighted calculation) */}
                      {subjectFormula.calculation === 'weighted' && tests.length > 0 && (
                    <div className="space-y-2">
                      <Label>Test Weights</Label>
                      <div className="rounded-md border p-4 space-y-2 max-h-60 overflow-y-auto">
                        {tests.map(test => (
                          <div key={test.testId} className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{test.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(test.date).toLocaleDateString()}
                              </div>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                                  value={subjectFormula.weights[test.testId] || 1}
                                  onChange={(e) => handleWeightChange(subject.subjectId, test.testId, e.target.value)}
                              className="w-20"
                              placeholder="1.0"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Set individual weights for each test. Higher weight = more importance.
                      </p>
                    </div>
                  )}

                  {/* Results Preview */}
                  <div className="space-y-2">
                    <Label>Calculation Preview</Label>
                    <div className="rounded-md border p-4 space-y-2">
                      <div className="text-sm text-muted-foreground">
                            Formula: ({subjectFormula.marksWeight}% × Marks) + ({subjectFormula.attendanceWeight}% × Attendance)
                      </div>
                      <div className="text-sm text-muted-foreground">
                            Calculation Method: {subjectFormula.calculation.charAt(0).toUpperCase() + subjectFormula.calculation.slice(1)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
                )
              })}

              {/* Students Results Table - Per Subject */}
              {allSubjects.map((subject) => {
                const subjectCalculatedMarks = calculatedMarks[subject.subjectId] || {}
                
                return (
                  <Card key={subject.subjectId}>
                <CardHeader>
                      <CardTitle>{subject.name} - Calculated Results</CardTitle>
                  <CardDescription>
                        Marks calculated based on the formula above for {subject.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Student</th>
                          <th className="text-left p-2">Tests</th>
                          <th className="text-right p-2">Marks %</th>
                          <th className="text-right p-2">Attendance %</th>
                          <th className="text-right p-2">Final %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => {
                              const calculated = subjectCalculatedMarks[student.id] || {}
                          return (
                            <tr key={student.id} className="border-b">
                              <td className="p-2 font-medium">{student.name}</td>
                              <td className="p-2 text-muted-foreground">{calculated.testCount || 0}</td>
                              <td className="p-2 text-right">{calculated.marksPercentage?.toFixed(2) || '0.00'}%</td>
                              <td className="p-2 text-right">{calculated.attendancePercentage?.toFixed(2) || '0.00'}%</td>
                              <td className="p-2 text-right font-semibold">{calculated.finalPercentage?.toFixed(2) || '0.00'}%</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
                )
              })}
            </TabsContent>

            <TabsContent value="rankcards" className="space-y-4">
              {allSubjects.map((subject) => {
                const subjectCalculatedMarks = calculatedMarks[subject.subjectId] || {}
                
                return (
                  <Card key={subject.subjectId}>
                <CardHeader>
                      <CardTitle>{subject.name} - Student Rank Cards</CardTitle>
                  <CardDescription>
                        Generate and download rank cards for each student in {subject.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-muted-foreground">Loading students...</div>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <p className="text-muted-foreground mb-4">No students found</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {students.map(student => {
                            const calculated = subjectCalculatedMarks[student.id] || {}
                        return (
                          <RankCard
                                key={`${subject.subjectId}-${student.id}`}
                            student={student}
                            classData={classData}
                            subject={subject}
                            calculatedMarks={calculated}
                            dateRange={dateRange}
                          />
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
                )
              })}
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

