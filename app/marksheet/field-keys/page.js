"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Calendar from '@/components/calendar-range'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Key, 
  Calculator,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Trash2,
  Save,
  BookOpen,
  RefreshCw,
  Loader2,
  Check,
  User,
  School,
  Users,
  Phone,
  MapPin,
  Building,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

// Manual keys definition
const MANUAL_KEYS = [
  { id: 'studentName', label: 'Student Name', placeholder: '{{studentName}}', icon: User },
  { id: 'class', label: 'Class', placeholder: '{{class}}', icon: School },
  { id: 'batch', label: 'Batch', placeholder: '{{batch}}', icon: Users },
  { id: 'coachName', label: 'Coach Name', placeholder: '{{coachName}}', icon: User },
  { id: 'managementName', label: 'Management Name', placeholder: '{{managementName}}', icon: Building },
  { id: 'village', label: 'Village', placeholder: '{{village}}', icon: MapPin },
  { id: 'phoneNumber', label: 'Phone Number', placeholder: '{{phoneNumber}}', icon: Phone },
]

export default function FieldKeysPage() {
  const router = useRouter()
  
  // Manual keys state
  const [selectedManualKeys, setSelectedManualKeys] = useState([])
  
  // Test-based keys state
  const [dateRangeType, setDateRangeType] = useState('month') // 'month', 'week', 'custom'
  const [selectedMonth, setSelectedMonth] = useState('')
  const [dateRange, setDateRange] = useState({ from: null, to: null })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('all')
  const [availableSubjects, setAvailableSubjects] = useState([])
  const [selectedSubjects, setSelectedSubjects] = useState([]) // Multiple subjects
  const [availableTests, setAvailableTests] = useState([])
  const [testMarksData, setTestMarksData] = useState([]) // Array of { test, date, subject, marks: [{ studentId, marks, maxMarks }] }
  const [loadingTests, setLoadingTests] = useState(false)
  const [loadingMarks, setLoadingMarks] = useState(false)
  
  
  // Generated keys state
  const [generatedKeys, setGeneratedKeys] = useState([])
  
  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [editingKey, setEditingKey] = useState(null) // For editing existing keys
  
  // Saved keys state
  const [savedKeys, setSavedKeys] = useState([])
  const [loadingSavedKeys, setLoadingSavedKeys] = useState(false)

  // Calculation section state
  const [selectedSubjectForCalculation, setSelectedSubjectForCalculation] = useState('')
  const [useTotalMarks, setUseTotalMarks] = useState(false)
  const [customCalculationFormula, setCustomCalculationFormula] = useState('')
  const [verificationResults, setVerificationResults] = useState(null)
  const [verifyingCalculation, setVerifyingCalculation] = useState(false)
  const [aiPromptOpen, setAiPromptOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [generatingFormula, setGeneratingFormula] = useState(false)
  
  // Per-test calculation state
  const [perTestCalculation, setPerTestCalculation] = useState(false)
  const [selectedTestsForCalculation, setSelectedTestsForCalculation] = useState([]) // Array of { testId, testName, subjectName, formula }
  const [selectedSubjectsForCalculation, setSelectedSubjectsForCalculation] = useState([]) // Array of subject names for chips

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const months = []
    const today = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthKey = format(date, 'yyyy-MM')
      const monthLabel = format(date, 'MMMM yyyy')
      months.push({ value: monthKey, label: monthLabel, date })
    }
    return months
  }, [])

  useEffect(() => {
    fetchClasses()
    fetchSavedKeys()
  }, [])

  const fetchSavedKeys = async () => {
    setLoadingSavedKeys(true)
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/data-field-keys?custom=true')
      const response = await fetch(url, { credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json()
        setSavedKeys(data.savedKeys || [])
      }
    } catch (error) {
      console.error('Error fetching saved keys:', error)
    } finally {
      setLoadingSavedKeys(false)
    }
  }

  useEffect(() => {
    fetchAvailableSubjects()
    // Reset selected subjects when class changes
    if (selectedClass === 'all') {
      setSelectedSubjects([])
    }
  }, [selectedClass])

  // Update date range when month/week changes
  useEffect(() => {
    if (dateRangeType === 'month' && selectedMonth) {
      const monthDate = new Date(selectedMonth + '-01')
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      setDateRange({ from: startDate, to: endDate })
    } else if (dateRangeType === 'week') {
      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      setDateRange({ from: startOfWeek, to: endOfWeek })
    } else if (dateRangeType === 'custom' && !dateRange.from) {
      // Initialize custom date range to current month if not set
      const today = new Date()
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setDateRange({ from: startDate, to: endDate })
    }
  }, [dateRangeType, selectedMonth])

  // Fetch tests when subjects and date range are selected
  useEffect(() => {
    if (selectedSubjects.length > 0 && dateRange.from && dateRange.to) {
      fetchTestsForSubjects()
    } else {
      setAvailableTests([])
      setTestMarksData([])
    }
  }, [selectedSubjects, dateRange])

  const fetchClasses = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/classes')
      const response = await fetch(url, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchAvailableSubjects = async () => {
    try {
      let subjects = []
      
      if (selectedClass && selectedClass !== 'all') {
        const { buildUrlWithBatch } = await import('@/lib/utils-batch')
        const url = buildUrlWithBatch('/api/subjects', { classId: selectedClass })
        const response = await fetch(url, { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          subjects = data.subjects || []
        }
      } else {
        // Fetch all subjects if no class selected
        const { buildUrlWithBatch } = await import('@/lib/utils-batch')
        const url = buildUrlWithBatch('/api/subjects')
        const response = await fetch(url, { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          subjects = data.subjects || []
        }
      }
      
      // Deduplicate subjects by name to avoid duplicates
      const seenSubjectNames = new Set()
      const uniqueSubjects = []
      
      subjects.forEach(subj => {
        const subjectName = subj.name || subj.subjectName || ''
        if (subjectName && !seenSubjectNames.has(subjectName)) {
          seenSubjectNames.add(subjectName)
          uniqueSubjects.push(subj)
        }
      })
      
      setAvailableSubjects(uniqueSubjects)
    } catch (error) {
      console.error('Error fetching subjects:', error)
      setAvailableSubjects([])
    }
  }

  const fetchTestsForSubjects = async () => {
    if (selectedSubjects.length === 0 || !dateRange.from || !dateRange.to) return

    setLoadingTests(true)
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const allTests = []

      // Fetch tests for each selected subject
      for (const subjectId of selectedSubjects) {
        const url = buildUrlWithBatch('/api/tests', {
          ...(selectedClass && selectedClass !== 'all' ? { classId: selectedClass } : {}),
          subjectId
        })
        const response = await fetch(url, { credentials: 'include' })
        
        if (response.ok) {
          const data = await response.json()
          const tests = data.tests || []
          
          // Filter tests by date range
          const filteredTests = tests.filter(test => {
            if (!test.date) return false
            const testDate = new Date(test.date)
            return testDate >= dateRange.from && testDate <= dateRange.to
          })
          
          // Add subject info to each test
          filteredTests.forEach(test => {
            const subject = availableSubjects.find(s => s.subjectId === subjectId)
            allTests.push({
              ...test,
              subjectId,
              subjectName: subject?.name || 'Unknown'
            })
          })
        }
      }
      
      setAvailableTests(allTests)
    } catch (error) {
      console.error('Error fetching tests:', error)
      toast.error('Failed to fetch tests')
    } finally {
      setLoadingTests(false)
    }
  }

  const fetchMarksForTests = async () => {
    if (availableTests.length === 0) {
      toast.error('No tests available. Please select subjects and date range first.')
      return
    }

    setLoadingMarks(true)
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const testMarks = []
      const MAX_STUDENTS = 5 // Limit to 5 students

      // Fetch marks for each test
      for (const test of availableTests) {
        const marksUrl = buildUrlWithBatch('/api/marks', {
          testId: test.testId,
          ...(selectedClass && selectedClass !== 'all' ? { classId: selectedClass } : {}),
          subjectId: test.subjectId
        })

        const marksResponse = await fetch(marksUrl, { credentials: 'include' })
        if (marksResponse.ok) {
          const marksData = await marksResponse.json()
          const marks = marksData.marks || []

          // Get student names - limit to 5 students
          const studentsUrl = buildUrlWithBatch('/api/students', {
            ...(selectedClass && selectedClass !== 'all' ? { classId: selectedClass } : {})
          })
          const studentsResponse = await fetch(studentsUrl, { credentials: 'include' })
          let studentsMap = {}
          let allStudents = []
          if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json()
            allStudents = studentsData.students || []
            allStudents.forEach(s => {
              studentsMap[s.id] = s
              if (s.studentId) studentsMap[s.studentId] = s
            })
          }

          // Group marks by student and limit to 5 students
          const studentMarksMap = {}
          marks.forEach(mark => {
            const studentId = mark.studentId
            if (!studentMarksMap[studentId]) {
              const student = studentsMap[studentId] || studentsMap[mark.studentId] || {}
              studentMarksMap[studentId] = {
                studentId,
                studentName: student.name || `Student ${studentId.slice(-6)}`,
                marks: mark.marks || 0,
                maxMarks: mark.maxMarks || 100
              }
            }
          })

          // Limit to 5 students - if "All Classes", take first 5, otherwise take first 5 from the class
          const studentArray = Object.values(studentMarksMap).slice(0, MAX_STUDENTS)

          testMarks.push({
            test,
            date: test.date,
            subjectName: test.subjectName,
            students: studentArray,
            totalStudents: Object.keys(studentMarksMap).length // Store total count
          })
        }
      }

      // Sort by date
      testMarks.sort((a, b) => new Date(a.date) - new Date(b.date))
      setTestMarksData(testMarks)

      toast.success(`Fetched marks for ${testMarks.length} test(s)`)
    } catch (error) {
      console.error('Error fetching marks:', error)
      toast.error('Failed to fetch marks')
    } finally {
      setLoadingMarks(false)
    }
  }

  const handleManualKeyToggle = (keyId) => {
    setSelectedManualKeys(prev => 
      prev.includes(keyId) 
        ? prev.filter(id => id !== keyId)
        : [...prev, keyId]
    )
  }

  const handleSubjectToggle = (subjectId) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  // Get all marks for a specific subject from testMarksData
  const getSubjectMarks = (subjectName) => {
    if (!testMarksData.length) return []
    
    return testMarksData
      .filter(testData => testData.subjectName === subjectName)
      .flatMap(testData => testData.students)
  }

  // Calculate total marks for a student across all tests of a subject
  const calculateStudentTotalMarks = (studentId, subjectName) => {
    const subjectTests = testMarksData.filter(testData => testData.subjectName === subjectName)
    let totalMarks = 0
    let totalMaxMarks = 0
    
    subjectTests.forEach(testData => {
      const student = testData.students.find(s => s.studentId === studentId)
      if (student) {
        totalMarks += student.marks || 0
        totalMaxMarks += student.maxMarks || 100
      }
    })
    
    return { totalMarks, totalMaxMarks, count: subjectTests.length }
  }

  // Verify calculation with sample students
  const verifyCalculation = () => {
    if (!selectedSubjectForCalculation) {
      toast.error('Please select a subject')
      return
    }

    if (!useTotalMarks && !customCalculationFormula) {
      toast.error('Please enable Total Marks or provide a calculation formula')
      return
    }

    if (testMarksData.length === 0) {
      toast.error('Please fetch marks first')
      return
    }

    setVerifyingCalculation(true)
    try {
      // Get unique students from the selected subject's tests
      const subjectTests = testMarksData.filter(testData => testData.subjectName === selectedSubjectForCalculation)
      const allStudentIds = new Set()
      subjectTests.forEach(testData => {
        testData.students.forEach(s => allStudentIds.add(s.studentId))
      })

      // Get first 3 students
      const studentIds = Array.from(allStudentIds).slice(0, 3)
      const results = []

      studentIds.forEach(studentId => {
        const { totalMarks, totalMaxMarks, count } = calculateStudentTotalMarks(studentId, selectedSubjectForCalculation)
        
        // Get student name
        const firstTest = subjectTests[0]
        const student = firstTest?.students.find(s => s.studentId === studentId)
        const studentName = student?.studentName || `Student ${studentId.slice(-6)}`

        let calculatedValue = 0
        let formula = ''

        if (useTotalMarks && !customCalculationFormula) {
          // Just sum
          calculatedValue = totalMarks
          formula = 'sum'
        } else if (customCalculationFormula) {
          // Custom formula
          try {
            const sum = totalMarks
            const maxMarks = totalMaxMarks
            const avg = count > 0 ? totalMarks / count : 0
            
            const processedFormula = customCalculationFormula
              .replace(/\bsum\b/gi, sum.toString())
              .replace(/\btotalMarks\b/gi, totalMarks.toString())
              .replace(/\btotalMaxMarks\b/gi, totalMaxMarks.toString())
              .replace(/\bmaxMarks\b/gi, totalMaxMarks.toString())
              .replace(/\bcount\b/gi, count.toString())
              .replace(/\baverage\b/gi, avg.toString())
              .replace(/\bavg\b/gi, avg.toString())

            calculatedValue = Function('"use strict"; return (' + processedFormula + ')')()
            formula = customCalculationFormula
          } catch (error) {
            results.push({
              studentName,
              studentId,
              error: error.message,
              success: false
            })
            return
          }
        }

        results.push({
          studentName,
          studentId,
          totalMarks,
          totalMaxMarks,
          count,
          calculatedValue,
          formula: formula || customCalculationFormula,
          success: true
        })
      })

      setVerificationResults({
        subjectName: selectedSubjectForCalculation,
        results
      })
      toast.success('Verification completed')
    } catch (error) {
      toast.error('Verification failed: ' + error.message)
      setVerificationResults({
        subjectName: selectedSubjectForCalculation,
        error: error.message,
        success: false
      })
    } finally {
      setVerifyingCalculation(false)
    }
  }

  // Generate formula using AI
  const generateFormulaWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a description for the calculation')
      return
    }

    setGeneratingFormula(true)
    try {
      const response = await fetch('/api/calculate-formula', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: aiPrompt,
          availableVariables: ['sum', 'totalMarks', 'totalMaxMarks', 'count', 'average', 'avg']
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate formula')
      }

      const data = await response.json()
      if (data.formula) {
        setCustomCalculationFormula(data.formula)
        setAiPromptOpen(false)
        setAiPrompt('')
        toast.success('Formula generated successfully')
      } else {
        throw new Error('No formula returned')
      }
    } catch (error) {
      console.error('Error generating formula:', error)
      toast.error('Failed to generate formula: ' + error.message)
    } finally {
      setGeneratingFormula(false)
    }
  }

  const generateKeys = () => {
    const keys = []

    // Add selected manual keys
    selectedManualKeys.forEach(keyId => {
      const manualKey = MANUAL_KEYS.find(k => k.id === keyId)
      if (manualKey) {
        keys.push({
          id: manualKey.id,
          label: manualKey.label,
          placeholder: manualKey.placeholder,
          type: 'manual'
        })
      }
    })

    // Add test-based keys from fetched marks
    if (testMarksData.length > 0) {
      // Group by subject
      const subjectsMap = {}
      testMarksData.forEach(testData => {
        if (!subjectsMap[testData.subjectName]) {
          subjectsMap[testData.subjectName] = []
        }
        subjectsMap[testData.subjectName].push(testData)
      })

      Object.keys(subjectsMap).forEach(subjectName => {
        keys.push({
          id: `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}`,
          label: `${subjectName} Marks`,
          placeholder: `{{${subjectName.toLowerCase().replace(/\s+/g, '_')}_marks}}`,
          type: 'test',
          subjectName
        })
      })
    }

    // Add calculation-based keys
    if (perTestCalculation && selectedTestsForCalculation.length > 0) {
      // Per-test calculations
      selectedTestsForCalculation.forEach(test => {
        if (test.formula) {
          const calculationKey = {
            id: `calc_${test.testId}_${Date.now()}`,
            label: `${test.testName} Calculation`,
            placeholder: `{{${test.testName.toLowerCase().replace(/\s+/g, '_')}_calculation}}`,
            type: 'calculation',
            subjectName: test.subjectName,
            testId: test.testId,
            testName: test.testName,
            calculationConfig: {
              useTotalMarks: false,
              formula: test.formula,
              dateRange: {
                from: dateRange.from?.toISOString(),
                to: dateRange.to?.toISOString()
              },
              dateRangeType,
              selectedClass: selectedClass || 'all',
              selectedSubjects: selectedSubjects,
              perTest: true
            }
          }
          keys.push(calculationKey)
        }
      })
    } else if (selectedSubjectForCalculation && (useTotalMarks || customCalculationFormula)) {
      // Single subject calculation (original behavior)
      const calculationKey = {
        id: `calc_${selectedSubjectForCalculation.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
        label: `${selectedSubjectForCalculation} Calculation`,
        placeholder: `{{${selectedSubjectForCalculation.toLowerCase().replace(/\s+/g, '_')}_calculation}}`,
        type: 'calculation',
        subjectName: selectedSubjectForCalculation,
        calculationConfig: {
          useTotalMarks,
          formula: customCalculationFormula || (useTotalMarks ? 'sum' : ''),
          dateRange: {
            from: dateRange.from?.toISOString(),
            to: dateRange.to?.toISOString()
          },
          dateRangeType,
          selectedClass: selectedClass || 'all',
          selectedSubjects: selectedSubjects,
          perTest: false
        }
      }
      keys.push(calculationKey)
    }

    setGeneratedKeys(keys)
    
    // If editing, pre-fill the dialog
    if (editingKey) {
      setKeyName(editingKey.name || '')
    }
    
    // Open save dialog
    if (keys.length > 0) {
      setSaveDialogOpen(true)
    } else {
      toast.error('No keys to generate. Please select manual keys or fetch test marks.')
    }
  }

  const handleSaveKeys = async () => {
    if (!keyName.trim()) {
      toast.error('Please enter a name for the key')
      return
    }

    if (generatedKeys.length === 0) {
      toast.error('No keys to save')
      return
    }

    setSavingKey(true)
    try {
      const { buildUrlWithBatch, getSelectedBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/data-field-keys')
      const batchName = getSelectedBatch()
      
      // Prepare nested data structure
      const keysData = {
        name: keyName,
        batchName: batchName || 'All Batches',
        manualKeys: generatedKeys.filter(k => k.type === 'manual'),
        testBasedKeys: generatedKeys.filter(k => k.type === 'test'),
        calculationKeys: generatedKeys.filter(k => k.type === 'calculation'),
        config: {
          dateRange: {
            from: dateRange.from?.toISOString(),
            to: dateRange.to?.toISOString()
          },
          dateRangeType,
          selectedClass: selectedClass || 'all',
          selectedSubjects: selectedSubjects
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customKeySet: keysData,
          keyName: keyName,
          isEdit: !!editingKey,
          keySetId: editingKey?._id
        })
      })

      if (response.ok) {
        toast.success(editingKey ? `Successfully updated "${keyName}"` : `Successfully saved "${keyName}"`)
        setSaveDialogOpen(false)
        setKeyName('')
        setGeneratedKeys([])
        setEditingKey(null)
        // Reset calculation fields
        setSelectedSubjectForCalculation('')
        setUseTotalMarks(false)
        setCustomCalculationFormula('')
        // Refresh saved keys
        fetchSavedKeys()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save keys')
      }
    } catch (error) {
      console.error('Error saving keys:', error)
      toast.error('Failed to save keys')
    } finally {
      setSavingKey(false)
    }
  }

  const handleEditKey = (keySet) => {
    setEditingKey(keySet)
    setKeyName(keySet.name || '')
    
    // Restore manual keys
    if (keySet.manualKeys && keySet.manualKeys.length > 0) {
      const manualKeyIds = keySet.manualKeys.map(k => k.id)
      setSelectedManualKeys(manualKeyIds)
    }
    
    // Restore config
    if (keySet.config) {
      if (keySet.config.dateRangeType) setDateRangeType(keySet.config.dateRangeType)
      if (keySet.config.selectedClass) setSelectedClass(keySet.config.selectedClass)
      if (keySet.config.selectedSubjects) setSelectedSubjects(keySet.config.selectedSubjects)
      if (keySet.config.dateRange) {
        setDateRange({
          from: keySet.config.dateRange.from ? new Date(keySet.config.dateRange.from) : null,
          to: keySet.config.dateRange.to ? new Date(keySet.config.dateRange.to) : null
        })
      }
    }
    
    // Restore calculation
    if (keySet.calculationKeys && keySet.calculationKeys.length > 0) {
      const calcKey = keySet.calculationKeys[0]
      if (calcKey.subjectName) setSelectedSubjectForCalculation(calcKey.subjectName)
      if (calcKey.calculationConfig) {
        setUseTotalMarks(calcKey.calculationConfig.useTotalMarks || false)
        setCustomCalculationFormula(calcKey.calculationConfig.formula || '')
      }
    }
    
    // Generate keys from saved data
    const allKeys = [
      ...(keySet.manualKeys || []),
      ...(keySet.testBasedKeys || []),
      ...(keySet.calculationKeys || [])
    ]
    setGeneratedKeys(allKeys)
    setSaveDialogOpen(true)
  }

  const handleDeleteKey = async (keySetId) => {
    if (!confirm('Are you sure you want to delete this key set?')) return
    
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/data-field-keys')
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ keySetId })
      })

      if (response.ok) {
        toast.success('Key set deleted successfully')
        fetchSavedKeys()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete key set')
      }
    } catch (error) {
      console.error('Error deleting key set:', error)
      toast.error('Failed to delete key set')
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
                  <BreadcrumbLink href="/marksheet">
                    Marksheet
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Field Keys</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Field Keys Generator</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select manual keys and generate test-based keys from marks data
            </p>
          </div>

          {/* Manual Keys Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Manual Keys
              </CardTitle>
              <CardDescription>
                Select the manual field keys you want to include in your marksheet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MANUAL_KEYS.map(key => {
                  const Icon = key.icon
                  return (
                    <div
                      key={key.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedManualKeys.includes(key.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleManualKeyToggle(key.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedManualKeys.includes(key.id)}
                          onCheckedChange={() => handleManualKeyToggle(key.id)}
                        />
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <Label className="font-medium cursor-pointer">{key.label}</Label>
                          <p className="text-xs text-muted-foreground mt-1">{key.placeholder}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Test-based Keys Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Test-based Keys
              </CardTitle>
              <CardDescription>
                Select date range and subjects to fetch test marks and generate keys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Class Selection */}
                <div>
                  <Label>Class</Label>
                  <Select value={selectedClass || 'all'} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map(cls => (
                        <SelectItem key={cls.classId} value={cls.classId}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Type */}
                <div>
                  <Label>Date Range Type</Label>
                  <Select value={dateRangeType} onValueChange={setDateRangeType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Month Selection */}
                {dateRangeType === 'month' && (
                  <div>
                    <Label>Month</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map(month => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Custom Date Range */}
                {dateRangeType === 'custom' && (
                  <div>
                    <Label>Date Range</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {dateRange.from && dateRange.to
                            ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                            : 'Select range'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" side="right">
                        <Calendar
                          selectedRange={dateRange}
                          onRangeChange={setDateRange}
                          onApply={(range) => {
                            setDateRange(range)
                            setCalendarOpen(false)
                          }}
                          onCancel={() => setCalendarOpen(false)}
                          showSidebar={true}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Subject Selection */}
              <div>
                <Label>Subjects (Select multiple)</Label>
                {availableSubjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedClass === 'all' ? 'Select a class first' : 'No subjects found'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2 max-h-48 overflow-y-auto border rounded p-3">
                    {availableSubjects.map(subj => (
                      <div key={subj.subjectId} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedSubjects.includes(subj.subjectId)}
                          onCheckedChange={() => handleSubjectToggle(subj.subjectId)}
                        />
                        <label className="text-sm cursor-pointer flex-1">
                          {subj.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fetch Tests Button */}
              {selectedSubjects.length > 0 && dateRange.from && dateRange.to && (
                <Button
                  onClick={fetchMarksForTests}
                  disabled={loadingTests || loadingMarks}
                  className="w-full"
                >
                  {loadingTests || loadingMarks ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {loadingTests ? 'Loading Tests...' : 'Fetching Marks...'}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Fetch Marks
                    </>
                  )}
                </Button>
              )}

              {/* Calculation Section */}
              {testMarksData.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Calculation for Report Generation
                    </CardTitle>
                    <CardDescription>
                      Select a subject and configure calculation logic to generate keys
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Per-Test Calculation Toggle */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="perTestCalculation"
                        checked={perTestCalculation}
                        onCheckedChange={(checked) => {
                          setPerTestCalculation(checked)
                          if (!checked) {
                            setSelectedTestsForCalculation([])
                            setSelectedSubjectsForCalculation([])
                          }
                        }}
                      />
                      <Label htmlFor="perTestCalculation" className="cursor-pointer">
                        Generate formula for each test
                      </Label>
                    </div>

                    {perTestCalculation ? (
                      <>
                        {/* Test Selection for Per-Test Calculation */}
                        <div>
                          <Label>Select Tests</Label>
                          <Select
                            value=""
                            onValueChange={(testId) => {
                              const test = availableTests.find(t => t.testId === testId)
                              if (test && !selectedTestsForCalculation.find(t => t.testId === testId)) {
                                const newTest = {
                                  testId: test.testId,
                                  testName: test.name,
                                  subjectName: test.subjectName,
                                  formula: ''
                                }
                                setSelectedTestsForCalculation([...selectedTestsForCalculation, newTest])
                                
                                // Add subject to chips if not already present
                                if (!selectedSubjectsForCalculation.includes(test.subjectName)) {
                                  setSelectedSubjectsForCalculation([...selectedSubjectsForCalculation, test.subjectName])
                                }
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose test to add calculation" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTests.length > 0 ? (
                                availableTests
                                  .filter(test => !selectedTestsForCalculation.find(t => t.testId === test.testId))
                                  .map(test => (
                                    <SelectItem key={test.testId} value={test.testId}>
                                      {test.name} ({test.subjectName})
                                    </SelectItem>
                                  ))
                              ) : (
                                <SelectItem value="no-data" disabled>No tests available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Selected Subjects as Chips */}
                        {selectedSubjectsForCalculation.length > 0 && (
                          <div>
                            <Label>Selected Subjects</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selectedSubjectsForCalculation.map((subjectName, idx) => (
                                <Badge key={idx} variant="secondary" className="gap-1">
                                  {subjectName}
                                  <button
                                    onClick={() => {
                                      setSelectedSubjectsForCalculation(selectedSubjectsForCalculation.filter(s => s !== subjectName))
                                      setSelectedTestsForCalculation(selectedTestsForCalculation.filter(t => t.subjectName !== subjectName))
                                    }}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Per-Test Formula Configuration */}
                        {selectedTestsForCalculation.length > 0 && (
                          <div className="space-y-3">
                            <Label>Configure Calculation for Each Test</Label>
                            {selectedTestsForCalculation.map((test, idx) => (
                              <div key={test.testId} className="p-4 border rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">{test.testName}</span>
                                    <Badge variant="outline" className="ml-2">{test.subjectName}</Badge>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTestsForCalculation(selectedTestsForCalculation.filter(t => t.testId !== test.testId))
                                      // Remove subject from chips if no tests remain for that subject
                                      const remainingSubjects = selectedTestsForCalculation
                                        .filter(t => t.testId !== test.testId)
                                        .map(t => t.subjectName)
                                      if (!remainingSubjects.includes(test.subjectName)) {
                                        setSelectedSubjectsForCalculation(selectedSubjectsForCalculation.filter(s => s !== test.subjectName))
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    value={test.formula}
                                    onChange={(e) => {
                                      const updated = [...selectedTestsForCalculation]
                                      updated[idx].formula = e.target.value
                                      setSelectedTestsForCalculation(updated)
                                    }}
                                    placeholder="e.g., (sum / count) * 100"
                                    className="flex-1"
                                  />
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" size="sm" className="gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        AI
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-96">
                                      <div className="space-y-3">
                                        <div>
                                          <Label>Describe calculation for {test.testName}</Label>
                                          <Textarea
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            placeholder="e.g., Calculate percentage"
                                            className="mt-1 min-h-[80px]"
                                          />
                                        </div>
                                        <Button
                                          onClick={async () => {
                                            setGeneratingFormula(true)
                                            try {
                                              const { buildUrlWithBatch } = await import('@/lib/utils-batch')
                                              const url = buildUrlWithBatch('/api/calculate-formula')
                                              const response = await fetch(url, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                credentials: 'include',
                                                body: JSON.stringify({ prompt: aiPrompt })
                                              })
                                              
                                              if (response.ok) {
                                                const data = await response.json()
                                                const updated = [...selectedTestsForCalculation]
                                                updated[idx].formula = data.formula
                                                setSelectedTestsForCalculation(updated)
                                                setAiPrompt('')
                                                toast.success('Formula generated successfully')
                                              } else {
                                                toast.error('Failed to generate formula')
                                              }
                                            } catch (error) {
                                              console.error('Error generating formula:', error)
                                              toast.error('Failed to generate formula')
                                            } finally {
                                              setGeneratingFormula(false)
                                            }
                                          }}
                                          disabled={!aiPrompt || generatingFormula}
                                          className="w-full"
                                          size="sm"
                                        >
                                          {generatingFormula ? (
                                            <>
                                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                              Generating...
                                            </>
                                          ) : (
                                            <>
                                              <Sparkles className="h-4 w-4 mr-2" />
                                              Generate Formula
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Subject Selection for Calculation */}
                          <div>
                            <Label>Select Subject</Label>
                            <Select 
                              value={selectedSubjectForCalculation} 
                              onValueChange={setSelectedSubjectForCalculation}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose subject for calculation" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from(new Set(testMarksData.map(t => t.subjectName))).map(subjectName => (
                                  <SelectItem key={subjectName} value={subjectName}>
                                    {subjectName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Total Marks Toggle */}
                          <div className="flex items-center gap-2 pt-8">
                            <Checkbox
                              checked={useTotalMarks}
                              onCheckedChange={setUseTotalMarks}
                            />
                            <Label className="cursor-pointer">Total Marks (Sum all test marks)</Label>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Custom Calculation Formula */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Custom Calculation Formula (Optional)</Label>
                        <Popover open={aiPromptOpen} onOpenChange={setAiPromptOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Sparkles className="h-4 w-4" />
                              AI Generate
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-96">
                            <div className="space-y-3">
                              <div>
                                <Label>Describe your calculation logic</Label>
                                <Textarea
                                  value={aiPrompt}
                                  onChange={(e) => setAiPrompt(e.target.value)}
                                  placeholder="e.g., Calculate percentage by dividing total marks by total max marks and multiplying by 100"
                                  className="mt-1 min-h-[100px]"
                                />
                              </div>
                              <Button
                                onClick={generateFormulaWithAI}
                                disabled={!aiPrompt || generatingFormula}
                                className="w-full"
                                size="sm"
                              >
                                {generatingFormula ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Generate Formula
                                  </>
                                )}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Input
                        value={customCalculationFormula}
                        onChange={(e) => setCustomCalculationFormula(e.target.value)}
                        placeholder="e.g., (sum / count) * 100 or (totalMarks / totalMaxMarks) * 100"
                        className="mt-1"
                      />
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <p className="text-xs font-semibold mb-2 text-foreground">Available Variables:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="font-mono font-semibold text-foreground">sum</span>
                            <span className="ml-2">- Total sum of all marks across tests</span>
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-foreground">totalMarks</span>
                            <span className="ml-2">- Same as sum (total marks obtained)</span>
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-foreground">totalMaxMarks</span>
                            <span className="ml-2">- Total maximum marks possible</span>
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-foreground">count</span>
                            <span className="ml-2">- Total number of tests/subjects</span>
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-foreground">average</span>
                            <span className="ml-2">- Average marks (totalMarks / count)</span>
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-foreground">avg</span>
                            <span className="ml-2">- Same as average</span>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold mb-1 text-foreground">Example Formulas:</p>
                          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                            <li><span className="font-mono">(sum / count) * 100</span> - Average percentage per test</li>
                            <li><span className="font-mono">(totalMarks / totalMaxMarks) * 100</span> - Overall percentage</li>
                            <li><span className="font-mono">sum / 2</span> - Half of total marks</li>
                            <li><span className="font-mono">average</span> - Average marks per test</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Verify Button */}
                    <Button
                      onClick={verifyCalculation}
                      disabled={
                        (perTestCalculation && selectedTestsForCalculation.length === 0) ||
                        (!perTestCalculation && !selectedSubjectForCalculation) ||
                        verifyingCalculation
                      }
                      className="w-full"
                    >
                      {verifyingCalculation ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Verify Calculation
                        </>
                      )}
                    </Button>

                    {/* Verification Results */}
                    {verificationResults && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            {verificationResults.success !== false ? (
                              <>
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <span>Calculation Results for {verificationResults.subjectName}</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-5 w-5 text-red-600" />
                                <span>Verification Failed</span>
                              </>
                            )}
                          </CardTitle>
                          {verificationResults.success === false && verificationResults.error && (
                            <CardDescription className="text-red-600">
                              {verificationResults.error}
                            </CardDescription>
                          )}
                        </CardHeader>
                        {verificationResults.success !== false && (
                          <CardContent>
                            <div className="overflow-hidden rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead className="text-right">Total Marks</TableHead>
                                    <TableHead className="text-right">Test Count</TableHead>
                                    <TableHead>Formula</TableHead>
                                    <TableHead className="text-right">Calculated Value</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {verificationResults.results.map((result, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell className="font-medium">{result.studentName}</TableCell>
                                      <TableCell className="text-right">
                                        {result.totalMarks} / {result.totalMaxMarks}
                                      </TableCell>
                                      <TableCell className="text-right">{result.count}</TableCell>
                                      <TableCell>
                                        <span className="font-mono text-xs">
                                          {result.formula || 'sum'}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="font-semibold text-primary">
                                          {typeof result.calculatedValue === 'number' 
                                            ? result.calculatedValue.toFixed(2) 
                                            : result.calculatedValue}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Test Marks Table */}
              {testMarksData.length > 0 && (
                <div className="mt-4 border rounded p-4 max-h-96 overflow-y-auto">
                  <div className="text-sm font-semibold mb-3">Test Results by Date</div>
                  <div className="space-y-4">
                    {testMarksData.map((testData, idx) => (
                      <div key={idx} className="border rounded p-3 bg-muted/30">
                        <div className="flex items-center gap-4 mb-3 pb-2 border-b">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-sm font-medium">{testData.test.name}</div>
                              <Badge variant="secondary" className="text-xs">
                                {format(new Date(testData.date), 'MMM d, yyyy')}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {testData.subjectName}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {testData.students.length} {testData.totalStudents && testData.totalStudents > testData.students.length ? `of ${testData.totalStudents}` : ''} students
                          </Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student Name</TableHead>
                              <TableHead className="text-right">Marks</TableHead>
                              <TableHead className="text-right">Max Marks</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {testData.students.map((student, sIdx) => (
                              <TableRow key={sIdx}>
                                <TableCell className="font-medium">{student.studentName}</TableCell>
                                <TableCell className="text-right">{student.marks}</TableCell>
                                <TableCell className="text-right">{student.maxMarks}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Keys Section */}
          {savedKeys.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Saved Key Sets
                </CardTitle>
                <CardDescription>
                  View, edit, or delete your saved field key configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSavedKeys ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedKeys.map((keySet) => {
                      const totalKeys = (keySet.manualKeys?.length || 0) + 
                                       (keySet.testBasedKeys?.length || 0) + 
                                       (keySet.calculationKeys?.length || 0)
                      return (
                        <div
                          key={keySet._id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{keySet.name}</span>
                              <Badge variant="outline">{keySet.batchName || 'All Batches'}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>
                                {totalKeys} key(s): {keySet.manualKeys?.length || 0} manual, {keySet.testBasedKeys?.length || 0} test-based, {keySet.calculationKeys?.length || 0} calculation
                              </div>
                              {keySet.updatedAt && (
                                <div className="text-xs">
                                  Updated: {format(new Date(keySet.updatedAt), 'MMM dd, yyyy HH:mm')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditKey(keySet)}
                              className="gap-2"
                            >
                              <Save className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteKey(keySet._id)}
                              className="gap-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Generate Keys Button */}
          <div className="flex gap-2">
            <Button
              onClick={generateKeys}
              disabled={selectedManualKeys.length === 0 && testMarksData.length === 0}
              className="gap-2"
              size="lg"
            >
              <Key className="h-4 w-4" />
              {editingKey ? 'Update Keys' : 'Generate Field Keys'}
            </Button>
            <Button
              onClick={() => {
                if (generatedKeys.length > 0) {
                  localStorage.setItem('generatedFieldKeys', JSON.stringify(generatedKeys))
                  toast.success('Field keys saved to localStorage')
                }
              }}
              disabled={generatedKeys.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Keys
            </Button>
          </div>

          {/* Generated Keys Display */}
          {generatedKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Field Keys ({generatedKeys.length})</CardTitle>
                <CardDescription>
                  These keys are ready to use in your marksheet templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generatedKeys.map(key => (
                    <div key={key.id} className="p-3 border rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={key.type === 'manual' ? 'default' : key.type === 'test' ? 'secondary' : 'outline'}>
                          {key.type}
                        </Badge>
                        <span className="font-medium">{key.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{key.placeholder}</p>
                      {key.formula && (
                        <p className="text-xs text-muted-foreground mt-1">Formula: {key.formula}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>

      {/* Save Keys Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Field Keys</DialogTitle>
            <DialogDescription>
              Enter a name for this set of field keys. They will be saved and available for use in marksheet templates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Monthly Report Keys, Life Skills Calculation"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Keys to Save ({generatedKeys.length})</Label>
              <div className="mt-2 p-3 bg-muted rounded-md max-h-48 overflow-y-auto">
                <ul className="space-y-2 text-sm">
                  {generatedKeys.map((key, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{key.label}</span>
                      {key.type === 'calculation' && (
                        <Badge variant="outline" className="ml-2">
                          Calculation
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSaveDialogOpen(false)
                setKeyName('')
              }}
              disabled={savingKey}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveKeys}
              disabled={!keyName.trim() || savingKey}
            >
              {savingKey ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Keys
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
