"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import CalendarRange from '@/components/calendar-range'
import { format } from 'date-fns'
import {
  Image as ImageIcon,
  Type,
  Plus,
  Trash2,
  Save,
  X,
  FileSpreadsheet,
  Loader2,
  Check,
  Move,
  Square,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  ChevronUp,
  ChevronDown,
  Copy,
  Grid3X3,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  Layers,
  MousePointer,
  Hand,
  Palette,
  MessageCircle,
  Send,
  Sparkles,
  Bot,
  Users,
  User,
  Hash,
  Calendar as CalendarIcon,
  Mail,
  Phone,
  Home,
  Award,
  Calculator,
  Percent,
  Flag,
  Trophy,
  School,
  RefreshCw,
  Database,
  BookOpen
} from 'lucide-react'

// Color palette
const COLOR_PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
]

// Font families
const FONT_FAMILIES = [
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  { name: 'Impact', value: 'Impact, sans-serif' },
  { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
  { name: 'Palatino', value: 'Palatino Linotype, serif' },
  { name: 'Lucida Sans', value: 'Lucida Sans Unicode, sans-serif' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { name: 'Century Gothic', value: 'Century Gothic, sans-serif' },
]

// Font weights
const FONT_WEIGHTS = [
  { label: '1', value: 100 },
  { label: '2', value: 200 },
  { label: '3', value: 300 },
  { label: '4', value: 400 },
  { label: '5', value: 500 },
  { label: '6', value: 600 },
  { label: '7', value: 700 },
  { label: '8', value: 800 },
  { label: '9', value: 900 },
]
import { toast } from 'sonner'

// Element types
const ELEMENT_TYPES = {
  LOGO: 'logo',
  TEXT: 'text',
  HEADING: 'heading',
  INPUT_FIELD: 'input_field',
  DATE_FIELD: 'date_field',
  TABLE: 'table',
  BOX: 'box',
  LINE: 'line',
  CIRCLE: 'circle',
  STUDENT_NAME: 'student_name',
  STUDENT_CLASS: 'student_class',
  ROLL_NUMBER: 'roll_number',
  FATHER_NAME: 'father_name',
  DOB: 'dob',
  SUBJECTS_TABLE: 'subjects_table',
  TOTAL_ROW: 'total_row',
  PERCENTAGE: 'percentage',
  GRADE: 'grade',
  RESULT: 'result',
  REMARKS: 'remarks',
  SIGNATURE: 'signature',
  PHOTO: 'photo'
}

// Default element properties
const createDefaultElement = (type, id) => {
  const defaults = {
    [ELEMENT_TYPES.LOGO]: {
      id, type, x: 260, y: 20, width: 80, height: 80,
      content: null, label: 'Logo'
    },
    [ELEMENT_TYPES.TEXT]: {
      id, type, x: 100, y: 100, width: 200, height: 30,
      content: 'Enter Text', fontSize: 14, fontWeight: 400,
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center', label: 'Text', textColor: '#000000', backgroundColor: 'transparent'
    },
    [ELEMENT_TYPES.HEADING]: {
      id, type, x: 150, y: 100, width: 300, height: 40,
      content: 'Heading', fontSize: 24, fontWeight: 700,
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center', label: 'Heading', textColor: '#000000', backgroundColor: 'transparent'
    },
    [ELEMENT_TYPES.INPUT_FIELD]: {
      id, type, x: 50, y: 100, width: 200, height: 30,
      content: '', fontSize: 12, label: 'Input Field',
      placeholder: 'Enter value', fieldLabel: 'Field:'
    },
    [ELEMENT_TYPES.DATE_FIELD]: {
      id, type, x: 50, y: 100, width: 150, height: 30,
      content: '{{date}}', fontSize: 12, label: 'Date Field',
      fieldLabel: 'Date:'
    },
    [ELEMENT_TYPES.TABLE]: {
      id, type, x: 50, y: 100, width: 500, height: 120,
      label: 'Table',
      fontSize: 12,
      cellPadding: 6,
      rows: 3,
      cols: 3,
      headers: ['Header 1', 'Header 2', 'Header 3'],
      data: [
        ['Cell 1', 'Cell 2', 'Cell 3'],
        ['Cell 4', 'Cell 5', 'Cell 6'],
        ['Cell 7', 'Cell 8', 'Cell 9']
      ],
      borderColor: '#d1d5db',
      headerBgColor: '#f3f4f6',
      showHeader: true
    },
    [ELEMENT_TYPES.PHOTO]: {
      id, type, x: 500, y: 200, width: 80, height: 100,
      content: null, label: 'Photo', borderColor: '#d1d5db'
    },
    [ELEMENT_TYPES.STUDENT_NAME]: {
      id, type, x: 50, y: 200, width: 200, height: 25,
      content: '{{studentName}}', fontSize: 12, fontWeight: 400,
      label: 'Student Name', prefix: 'Name:', showUnderline: true
    },
    [ELEMENT_TYPES.STUDENT_CLASS]: {
      id, type, x: 280, y: 200, width: 130, height: 25,
      content: '{{class}}', fontSize: 12, fontWeight: 400,
      label: 'Class', prefix: 'Class:', showUnderline: true
    },
    [ELEMENT_TYPES.ROLL_NUMBER]: {
      id, type, x: 430, y: 200, width: 130, height: 25,
      content: '{{rollNumber}}', fontSize: 12, fontWeight: 400,
      label: 'Roll No', prefix: 'Roll No:', showUnderline: true
    },
    [ELEMENT_TYPES.FATHER_NAME]: {
      id, type, x: 50, y: 230, width: 200, height: 25,
      content: '{{fatherName}}', fontSize: 12, fontWeight: 400,
      label: 'Father Name', prefix: "Father's Name:", showUnderline: true
    },
    [ELEMENT_TYPES.DOB]: {
      id, type, x: 280, y: 230, width: 150, height: 25,
      content: '{{dob}}', fontSize: 12, fontWeight: 400,
      label: 'Date of Birth', prefix: 'DOB:', showUnderline: true
    },
    [ELEMENT_TYPES.SUBJECTS_TABLE]: {
      id, type, x: 50, y: 270, width: 500, height: 80,
      subjects: [],
      label: 'Subjects Table',
      fontSize: 12,
      cellPadding: 6,
      colWidths: [30, null, 70, 80]
    },
    [ELEMENT_TYPES.PERCENTAGE]: {
      id, type, x: 50, y: 440, width: 90, height: 40,
      content: '{{percentage}}%', fontSize: 14, fontWeight: 'bold',
      label: 'Percentage', title: 'PERCENTAGE'
    },
    [ELEMENT_TYPES.GRADE]: {
      id, type, x: 150, y: 440, width: 90, height: 40,
      content: '{{grade}}', fontSize: 14, fontWeight: 'bold',
      label: 'Grade', title: 'GRADE'
    },
    [ELEMENT_TYPES.RESULT]: {
      id, type, x: 250, y: 440, width: 90, height: 40,
      content: '{{result}}', fontSize: 14, fontWeight: 'bold',
      label: 'Result', title: 'RESULT'
    },
    [ELEMENT_TYPES.REMARKS]: {
      id, type, x: 50, y: 510, width: 500, height: 50,
      content: '', fontSize: 11, label: 'Remarks'
    },
    [ELEMENT_TYPES.SIGNATURE]: {
      id, type, x: 50, y: 580, width: 130, height: 45,
      content: 'Class Teacher', fontSize: 12, fontWeight: 400,
      fontFamily: 'Arial, sans-serif', label: 'Signature'
    },
    [ELEMENT_TYPES.BOX]: {
      id, type, x: 100, y: 100, width: 150, height: 80,
      backgroundColor: '#f3f4f6', borderColor: '#d1d5db', borderWidth: 1,
      label: 'Box'
    },
    [ELEMENT_TYPES.LINE]: {
      id, type, x: 50, y: 180, width: 500, height: 2,
      backgroundColor: '#d1d5db', label: 'Line'
    },
    [ELEMENT_TYPES.CIRCLE]: {
      id, type, x: 100, y: 100, width: 60, height: 60,
      backgroundColor: '#f3f4f6', borderColor: '#d1d5db', borderWidth: 1,
      label: 'Circle'
    }
  }
  return defaults[type] || defaults[ELEMENT_TYPES.TEXT]
}

export default function MarksheetBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.classId
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const backgroundImageInputRef = useRef(null)
  const hasInitializedSavedState = useRef(false)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [templateName, setTemplateName] = useState("Untitled Template")
  const [zoom, setZoom] = useState(100)
  const [tool, setTool] = useState('select') // select, pan
  const [showGrid, setShowGrid] = useState(true)

  // Canvas elements - initialize with default template
  const defaultElements = [
    createDefaultElement(ELEMENT_TYPES.LOGO, 'logo-1'),
    { ...createDefaultElement(ELEMENT_TYPES.TEXT, 'title-1'), x: 150, y: 110, width: 300, content: 'Enter Institution Name', fontSize: 24, fontWeight: 'bold' },
    { ...createDefaultElement(ELEMENT_TYPES.TEXT, 'subtitle-1'), x: 175, y: 150, width: 250, content: 'Academic Year 2024-2025', fontSize: 14, fontWeight: 'normal' },
    { ...createDefaultElement(ELEMENT_TYPES.TEXT, 'marksheet-title'), x: 225, y: 180, width: 150, content: 'MARKSHEET', fontSize: 20, fontWeight: 'bold' },
    createDefaultElement(ELEMENT_TYPES.LINE, 'line-1'),
    createDefaultElement(ELEMENT_TYPES.STUDENT_NAME, 'student-name-1'),
    createDefaultElement(ELEMENT_TYPES.STUDENT_CLASS, 'student-class-1'),
    createDefaultElement(ELEMENT_TYPES.ROLL_NUMBER, 'roll-number-1'),
    createDefaultElement(ELEMENT_TYPES.SUBJECTS_TABLE, 'subjects-table-1'),
    createDefaultElement(ELEMENT_TYPES.PERCENTAGE, 'percentage-1'),
    createDefaultElement(ELEMENT_TYPES.GRADE, 'grade-1'),
    createDefaultElement(ELEMENT_TYPES.RESULT, 'result-1'),
    createDefaultElement(ELEMENT_TYPES.REMARKS, 'remarks-1'),
    { ...createDefaultElement(ELEMENT_TYPES.SIGNATURE, 'sig-1'), x: 50 },
    { ...createDefaultElement(ELEMENT_TYPES.SIGNATURE, 'sig-2'), x: 225, content: 'Principal' },
    { ...createDefaultElement(ELEMENT_TYPES.SIGNATURE, 'sig-3'), x: 400, content: 'Parent/Guardian' },
  ]

  const [elements, setElements] = useState(defaultElements)

  // Store last saved state for revert functionality - initialize with default template
  const [lastSavedState, setLastSavedState] = useState(() => ({
    elements: JSON.parse(JSON.stringify(defaultElements)),
    templateName: "Untitled Template",
    institutionName: "Enter Institution Name",
    subtitle: "Academic Year 2024-2025"
  }))

  // Undo/Redo history
  const [history, setHistory] = useState(() => [{
    elements: JSON.parse(JSON.stringify(defaultElements)),
    templateName: "Untitled Template",
    institutionName: "Enter Institution Name",
    subtitle: "Academic Year 2024-2025"
  }])
  const [historyIndex, setHistoryIndex] = useState(0)
  const isUndoRedoRef = useRef(false)

  const [selectedElement, setSelectedElement] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState(null)
  const [focusedTableCell, setFocusedTableCell] = useState({ row: null, col: null })

  // Canvas pan state
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const canvasContainerRef = useRef(null)

  // Institution details for header
  const [institutionName, setInstitutionName] = useState("Enter Institution Name")
  const [subtitle, setSubtitle] = useState("Academic Year 2024-2025")

  // Template sections (header, body, footer) with styles
  const [templateSections, setTemplateSections] = useState({
    header: {
      elements: [],
      style: {
        position: 'relative',
        left: '0px',
        top: '0px',
        width: '100%',
        height: '200px',
        padding: '20px',
        backgroundColor: 'transparent'
      }
    },
    body: {
      elements: [],
      style: {
        position: 'relative',
        left: '0px',
        top: '0px',
        width: '100%',
        height: '400px',
        padding: '20px',
        backgroundColor: 'transparent'
      }
    },
    footer: {
      elements: [],
      style: {
        position: 'relative',
        left: '0px',
        top: '0px',
        width: '100%',
        height: '200px',
        padding: '20px',
        backgroundColor: 'transparent'
      }
    }
  })

  // Note: lastSavedState is now initialized directly in useState above
  // This ensures it's always available for revert functionality

  // AI Chat state
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatPrompt, setChatPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! I can help you create marksheet templates. Describe what you need, like:\n\n• "Create a simple marksheet with 5 subjects"\n• "Design a marksheet with school logo, student photo, and 8 subjects"\n• "Make a result card with percentage and grade"' }
  ])

  // Student data state
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Data field keys from API
  const [dataFieldKeys, setDataFieldKeys] = useState([])
  const [loadingDataFields, setLoadingDataFields] = useState(false) // Set to false since we're not auto-fetching
  
  // Saved key sets from database
  const [savedKeySets, setSavedKeySets] = useState([])
  const [loadingSavedKeySets, setLoadingSavedKeySets] = useState(false)
  const [selectedKeySetId, setSelectedKeySetId] = useState(null)
  const [currentKeySet, setCurrentKeySet] = useState(null) // Store the full key set for field mapping

  // Subject-based marks fetching state
  const [availableSubjects, setAvailableSubjects] = useState([])
  const [selectedSubjectForMarks, setSelectedSubjectForMarks] = useState('')
  const [dateRangeType, setDateRangeType] = useState('month') // 'month' or 'week'
  const [selectedMonth, setSelectedMonth] = useState('')
  const [dateRange, setDateRange] = useState({ from: null, to: null })
  const [availableTests, setAvailableTests] = useState([])
  const [selectedTests, setSelectedTests] = useState([])
  const [testMarksData, setTestMarksData] = useState([]) // Array of { test, date, students: [{ studentId, name, marks, maxMarks }] }
  const [loadingMarks, setLoadingMarks] = useState(false)
  const [calculationFormula, setCalculationFormula] = useState('sum') // 'sum', 'average', 'custom'
  const [customFormula, setCustomFormula] = useState('') // Custom calculation like "sum * 100 / total"
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('all')
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Canvas background state
  const [canvasBackgroundImage, setCanvasBackgroundImage] = useState(null)
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#ffffff')

  // Fetch classes and subjects on mount
  useEffect(() => {
    fetchClasses()
  }, [])

  // Fetch subjects when class changes
  useEffect(() => {
    fetchAvailableSubjects()
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

  // Fetch tests when subject and date range are selected
  useEffect(() => {
    if (selectedSubjectForMarks && dateRange.from && dateRange.to) {
      fetchTestsForSubject()
    } else {
      setAvailableTests([])
      setSelectedTests([])
    }
  }, [selectedSubjectForMarks, dateRange])

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

  const fetchTestsForSubject = async () => {
    if (!selectedSubjectForMarks || !dateRange.from || !dateRange.to) return

    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/tests', {
        ...(selectedClass && selectedClass !== 'all' ? { classId: selectedClass } : {}),
        subjectId: selectedSubjectForMarks
      })
      const response = await fetch(url, { credentials: 'include' })

      if (response.ok) {
        const data = await response.json()
        const allTests = data.tests || []

        // Filter tests by date range
        const filteredTests = allTests.filter(test => {
          if (!test.date) return false
          const testDate = new Date(test.date)
          return testDate >= dateRange.from && testDate <= dateRange.to
        })

        setAvailableTests(filteredTests)
        // Auto-select all tests
        setSelectedTests(filteredTests.map(t => t.testId))
      }
    } catch (error) {
      console.error('Error fetching tests:', error)
    }
  }

  const fetchMarksForTests = async () => {
    if (selectedTests.length === 0) {
      toast.error('Please select at least one test')
      return
    }

    setLoadingMarks(true)
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const testMarks = []

      // Fetch marks for each selected test
      for (const testId of selectedTests) {
        const test = availableTests.find(t => t.testId === testId)
        if (!test) continue

        const marksUrl = buildUrlWithBatch('/api/marks', {
          testId,
          ...(selectedClass && selectedClass !== 'all' ? { classId: selectedClass } : {}),
          subjectId: selectedSubjectForMarks
        })

        const marksResponse = await fetch(marksUrl, { credentials: 'include' })
        if (marksResponse.ok) {
          const marksData = await marksResponse.json()
          const marks = marksData.marks || []

          // Get student names
          const studentsUrl = buildUrlWithBatch('/api/students', {
            ...(selectedClass && selectedClass !== 'all' ? { classId: selectedClass } : {})
          })
          const studentsResponse = await fetch(studentsUrl, { credentials: 'include' })
          let studentsMap = {}
          if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json()
            studentsData.students?.forEach(s => {
              studentsMap[s.id] = s
              if (s.studentId) studentsMap[s.studentId] = s
            })
          }

          // Group marks by student (get all students, will limit to 5 later)
          const studentMarksMap = {}
          marks.forEach(mark => {
            const studentId = mark.studentId
            if (!studentMarksMap[studentId]) {
              const student = studentsMap[studentId] || studentsMap[mark.studentId] || {}
              studentMarksMap[studentId] = {
                studentId,
                studentName: student.name || `Student ${studentId.slice(-6)}`,
                marks: [],
                totalMarks: 0,
                maxMarks: 0
              }
            }
            studentMarksMap[studentId].marks.push({
              testId: test.testId,
              testName: test.name,
              marks: mark.marks,
              maxMarks: mark.maxMarks
            })
            studentMarksMap[studentId].totalMarks += mark.marks || 0
            studentMarksMap[studentId].maxMarks += mark.maxMarks || 100
          })

          testMarks.push({
            test,
            date: test.date,
            students: Object.values(studentMarksMap)
          })
        }
      }

      // Sort by date
      testMarks.sort((a, b) => new Date(a.date) - new Date(b.date))
      setTestMarksData(testMarks)

      // Update subjects table with the selected subject (replace existing, ensure unique)
      if (selectedSubjectForMarks && testMarks.length > 0) {
        const subject = availableSubjects.find(s => s.subjectId === selectedSubjectForMarks)
        if (subject) {
          setElements(prev => prev.map(el => {
            if (el.type === ELEMENT_TYPES.SUBJECTS_TABLE) {
              // Check if this subject already exists in the table (by name or subjectId)
              const existingSubjectIndex = el.subjects.findIndex(s =>
                s.subjectId === subject.subjectId || s.name === subject.name
              )

              let updatedSubjects
              if (existingSubjectIndex >= 0) {
                // Replace existing subject instead of adding duplicate
                updatedSubjects = [...el.subjects]
                updatedSubjects[existingSubjectIndex] = {
                  id: updatedSubjects[existingSubjectIndex].id, // Keep same ID
                  name: subject.name,
                  subjectName: subject.name,
                  subjectId: subject.subjectId,
                  maxMarks: subject.maxMarks || 100,
                  marksPlaceholder: `{{marks_${updatedSubjects[existingSubjectIndex].id}}}`
                }
              } else {
                // Add new subject if it doesn't exist
                const newSubject = {
                  id: el.subjects.length + 1,
                  name: subject.name,
                  subjectName: subject.name,
                  subjectId: subject.subjectId,
                  maxMarks: subject.maxMarks || 100,
                  marksPlaceholder: `{{marks_${el.subjects.length + 1}}}`
                }
                updatedSubjects = [...el.subjects, newSubject]
              }

              // Final deduplication by name to ensure no duplicates
              const seenNames = new Set()
              const uniqueSubjects = updatedSubjects.filter(s => {
                if (seenNames.has(s.name)) {
                  return false
                }
                seenNames.add(s.name)
                return true
              })

              // Re-index IDs after deduplication
              const finalSubjects = uniqueSubjects.map((s, index) => ({
                ...s,
                id: index + 1,
                marksPlaceholder: `{{marks_${index + 1}}}`
              }))

              return {
                ...el,
                subjects: finalSubjects,
                height: 80 + (finalSubjects.length * 30)
              }
            }
            return el
          }))
        }

        // Update students data with calculated marks (limit to 5 students as requested)
        const allStudentIds = new Set()
        testMarks.forEach(tm => {
          tm.students.forEach(s => allStudentIds.add(s.studentId))
        })

        const studentIdsArray = Array.from(allStudentIds).slice(0, 5) // Limit to 5 students
        const updatedStudents = studentIdsArray.map((studentId) => {
          // Get all marks for this student across all tests
          const studentMarks = []
          testMarks.forEach(tm => {
            const studentData = tm.students.find(s => s.studentId === studentId)
            if (studentData) {
              studentMarks.push(...studentData.marks)
            }
          })

          // Calculate final marks using the formula
          const finalMarks = calculateFinalMarks(studentMarks)
          const totalMaxMarks = studentMarks.reduce((sum, m) => sum + (m.maxMarks || 100), 0)
          const percentage = totalMaxMarks > 0 ? Math.round((finalMarks / totalMaxMarks) * 100) : 0
          const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 40 ? 'D' : 'F'
          const result = percentage >= 40 ? 'Pass' : 'Fail'

          // Get student info from first test
          const firstStudentData = testMarks[0]?.students.find(s => s.studentId === studentId)
          const studentName = firstStudentData?.studentName || `Student ${studentId.slice(-6)}`

          return {
            id: studentId,
            studentId: studentId,
            studentName: studentName,
            marks_1: finalMarks.toFixed(2),
            totalMarks: finalMarks.toFixed(2),
            maxMarks: totalMaxMarks.toString(),
            percentage: percentage.toString(),
            grade: grade,
            result: result
          }
        })

        // Update students state
        setStudents(updatedStudents)
      }

      toast.success(`Fetched marks for ${testMarks.length} test(s)`)
    } catch (error) {
      console.error('Error fetching marks:', error)
      toast.error('Failed to fetch marks')
    } finally {
      setLoadingMarks(false)
    }
  }

  // Calculate final marks based on formula
  const calculateFinalMarks = (studentMarks) => {
    if (!studentMarks || studentMarks.length === 0) return 0

    const totalMarks = studentMarks.reduce((sum, m) => sum + (m.marks || 0), 0)
    const totalMaxMarks = studentMarks.reduce((sum, m) => sum + (m.maxMarks || 100), 0)

    if (calculationFormula === 'sum') {
      return totalMarks
    } else if (calculationFormula === 'average') {
      return totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0
    } else if (calculationFormula === 'custom' && customFormula) {
      try {
        // Replace placeholders in custom formula
        let formula = customFormula
          .replace(/totalMarks/g, totalMarks)
          .replace(/totalMaxMarks/g, totalMaxMarks)
          .replace(/count/g, studentMarks.length)
        return eval(formula) || 0
      } catch (e) {
        console.error('Error evaluating custom formula:', e)
        return totalMarks
      }
    }
    return totalMarks
  }

  // Fetch data field keys from API and refresh on page load
  useEffect(() => {
    const fetchDataFieldKeys = async (refresh = false) => {
      try {
        setLoadingDataFields(true)
        // First, refresh the keys by calling POST endpoint to discover latest fields
        if (refresh) {
          try {
            const refreshResponse = await fetch('/api/data-field-keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ validateFromDb: true }),
              credentials: 'include'
            })
            if (!refreshResponse.ok) {
              if (refreshResponse.status === 401) {
                console.warn('Unauthorized - session may have expired. Please refresh the page or log in again.')
                // Don't throw, just continue to try fetching existing keys
              } else {
                console.warn('Error refreshing data field keys:', refreshResponse.status, refreshResponse.statusText)
              }
            }
          } catch (refreshError) {
            console.warn('Error refreshing data field keys:', refreshError)
            // Continue to fetch even if refresh fails
          }
        }

        // Then fetch the updated keys
        const url = refresh
          ? '/api/data-field-keys?refresh=true'
          : '/api/data-field-keys'
        const response = await fetch(url, { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          if (data.dataFieldKeys && Array.isArray(data.dataFieldKeys)) {
            // Transform API response to match component format
            const fields = data.dataFieldKeys.map(key => ({
              key: key.placeholderKey,
              label: key.label,
              icon: key.icon,
              dbFieldPath: key.dbFieldPath,
              existsInDb: key.existsInDb
            }))
            console.log(`Loaded ${fields.length} data field keys:`, fields.map(f => f.key))
            setDataFieldKeys(fields)
          } else {
            console.warn('No dataFieldKeys array in response:', data)
            setDataFieldKeys([])
          }
        } else if (response.status === 401) {
          console.warn('Unauthorized - session may have expired. Data field keys will not be available until you log in again.')
          setDataFieldKeys([])
        } else {
          console.error('Failed to fetch data field keys:', response.status, response.statusText)
          setDataFieldKeys([])
        }
      } catch (error) {
        console.error('Error fetching data field keys:', error)
        setDataFieldKeys([])
      } finally {
        setLoadingDataFields(false)
      }
    }

    // Don't auto-fetch on initial load - user will select a saved key set instead
    // fetchDataFieldKeys(true)
  }, [])

  // Fetch saved key sets from database
  useEffect(() => {
    const fetchSavedKeySets = async () => {
      setLoadingSavedKeySets(true)
      try {
        const { buildUrlWithBatch } = await import('@/lib/utils-batch')
        const url = buildUrlWithBatch('/api/data-field-keys?custom=true')
        const response = await fetch(url, { credentials: 'include' })
        
        if (response.ok) {
          const data = await response.json()
          setSavedKeySets(data.savedKeys || [])
        }
      } catch (error) {
        console.error('Error fetching saved key sets:', error)
      } finally {
        setLoadingSavedKeySets(false)
      }
    }

    fetchSavedKeySets()
  }, [])

  // Load a selected key set
  const loadKeySet = (keySet) => {
    if (!keySet) {
      setDataFieldKeys([])
      setSelectedKeySetId(null)
      setCurrentKeySet(null)
      setLoadingDataFields(false)
      return
    }

    const transformedKeys = []
    
    // Transform manual keys
    if (keySet.manualKeys && keySet.manualKeys.length > 0) {
      keySet.manualKeys.forEach(key => {
        transformedKeys.push({
          key: key.placeholder?.replace(/[{}]/g, '') || key.id,
          label: key.label,
          icon: 'user', // Default icon for manual keys
          dbFieldPath: key.id,
          existsInDb: true,
          originalKey: key // Store original key for reference
        })
      })
    }
    
    // Transform test-based keys
    if (keySet.testBasedKeys && keySet.testBasedKeys.length > 0) {
      keySet.testBasedKeys.forEach(key => {
        transformedKeys.push({
          key: key.placeholder?.replace(/[{}]/g, '') || key.id,
          label: key.label,
          icon: 'book-open',
          dbFieldPath: key.id,
          existsInDb: true,
          originalKey: key // Store original key for reference
        })
      })
    }
    
    // Transform calculation keys
    if (keySet.calculationKeys && keySet.calculationKeys.length > 0) {
      keySet.calculationKeys.forEach(key => {
        transformedKeys.push({
          key: key.placeholder?.replace(/[{}]/g, '') || key.id,
          label: key.label,
          icon: 'calculator',
          dbFieldPath: key.id,
          existsInDb: true,
          originalKey: key // Store original key for reference
        })
      })
    }
    
    setDataFieldKeys(transformedKeys)
    setSelectedKeySetId(keySet._id)
    setCurrentKeySet(keySet) // Store full key set for field mapping
    setLoadingDataFields(false) // Ensure loading is false after loading keys
    toast.success(`Loaded "${keySet.name}" with ${transformedKeys.length} field keys`)
  }

  // Helper function to render icon based on icon name
  const renderIcon = (iconName, className = "h-3 w-3 mr-1 shrink-0") => {
    switch (iconName) {
      case 'user':
        return <User className={className} />
      case 'hash':
        return <Hash className={className} />
      case 'school':
        return <School className={className} />
      case 'layout':
        return <Layers className={className} />
      case 'calendar':
        return <CalendarIcon className={className} />
      case 'mail':
        return <Mail className={className} />
      case 'phone':
        return <Phone className={className} />
      case 'home':
        return <Home className={className} />
      case 'check':
        return <Check className={className} />
      case 'calculator':
        return <Calculator className={className} />
      case 'percent':
        return <Percent className={className} />
      case 'award':
        return <Award className={className} />
      case 'flag':
        return <Flag className={className} />
      case 'trophy':
        return <Trophy className={className} />
      case 'image':
        return <ImageIcon className={className} />
      case 'book-open':
        return <BookOpen className={className} />
      case 'database':
      default:
        return <Database className={className} />
    }
  }

  // Load existing template
  useEffect(() => {
    if (templateId && !templateId.startsWith('ms_')) {
      loadTemplate()
    }
  }, [templateId])

  const loadTemplate = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/marksheet-templates', { templateId })
      const response = await fetch(url, { credentials: 'include' })

      if (response.ok) {
        const data = await response.json()
        if (data.template) {
          const loadedTemplateName = data.template.templateName || "Untitled Template"
          
          // Load background settings
          if (data.template.canvasBackgroundColor) {
            setCanvasBackgroundColor(data.template.canvasBackgroundColor)
          }
          if (data.template.canvasBackgroundImage) {
            setCanvasBackgroundImage(data.template.canvasBackgroundImage)
          }
          const loadedInstitutionName = data.template.institutionName || "Enter Institution Name"
          const loadedSubtitle = data.template.subtitle || "Academic Year 2024-2025"

          // Load sections if available, otherwise fall back to elements
          let loadedElements = []
          let loadedSections = null

          if (data.template.sections) {
            // New format: sections with styles
            loadedSections = {
              header: {
                elements: data.template.sections.header?.elements || [],
                style: data.template.sections.header?.style || templateSections.header.style
              },
              body: {
                elements: data.template.sections.body?.elements || [],
                style: data.template.sections.body?.style || templateSections.body.style
              },
              footer: {
                elements: data.template.sections.footer?.elements || [],
                style: data.template.sections.footer?.style || templateSections.footer.style
              }
            }
            // Combine all elements for backward compatibility
            loadedElements = [
              ...(loadedSections.header.elements || []),
              ...(loadedSections.body.elements || []),
              ...(loadedSections.footer.elements || [])
            ]
            setTemplateSections(loadedSections)
          } else {
            // Old format: just elements
            loadedElements = data.template.elements || []
            // Organize into sections
            const organized = organizeElementsIntoSections(loadedElements)
            loadedSections = {
              header: {
                elements: organized.header,
                style: templateSections.header.style
              },
              body: {
                elements: organized.body,
                style: templateSections.body.style
              },
              footer: {
                elements: organized.footer,
                style: templateSections.footer.style
              }
            }
            setTemplateSections(loadedSections)
          }

          setTemplateName(loadedTemplateName)
          setElements(loadedElements)
          setInstitutionName(loadedInstitutionName)
          setSubtitle(loadedSubtitle)
          setSaved(true)

          // Store the loaded state as the last saved state
          const savedState = {
            elements: JSON.parse(JSON.stringify(loadedElements)),
            templateName: loadedTemplateName,
            institutionName: loadedInstitutionName,
            subtitle: loadedSubtitle,
            sections: loadedSections
          }
          setLastSavedState(savedState)
          hasInitializedSavedState.current = true

          // Initialize history with loaded state
          setHistory([savedState])
          setHistoryIndex(0)
        }
      }
    } catch (error) {
      console.error('Error loading template:', error)
    }
  }

  // Fetch subjects from database
  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        if (data.subjects && data.subjects.length > 0) {
          // Deduplicate subjects by name to avoid duplicates
          const seenSubjectNames = new Set()
          const uniqueSubjects = []

          data.subjects.forEach((s) => {
            const subjectName = s.name || s.subjectName || ''
            if (subjectName && !seenSubjectNames.has(subjectName)) {
              seenSubjectNames.add(subjectName)
              uniqueSubjects.push(s)
            }
          })

          const subjects = uniqueSubjects.map((s, index) => ({
            id: index + 1,
            name: s.name || s.subjectName || `{{subjectName}}`, // Use placeholder if name not available
            subjectName: s.name || s.subjectName || `Subject ${index + 1}`, // Store actual name for placeholder resolution
            subjectId: s.subjectId || s.id,
            maxMarks: s.maxMarks || 100,
            marksPlaceholder: `{{marks_${index + 1}}}`
          }))

          // Update the subjects table element
          setElements(prev => prev.map(el =>
            el.type === ELEMENT_TYPES.SUBJECTS_TABLE
              ? { ...el, subjects, height: 80 + (subjects.length * 30) }
              : el
          ))
          return subjects
        }
      }
      return []
    } catch (error) {
      console.error('Error fetching subjects:', error)
      return []
    }
  }

  // Fetch students data with marks
  const fetchStudents = async () => {
    setLoadingStudents(true)
    try {
      // Fetch students from API
      const studentsResponse = await fetch('/api/students', { credentials: 'include' })

      // Fetch classes to get class names
      const classesResponse = await fetch('/api/classes', { credentials: 'include' })

      // Fetch marks for calculating student results
      const marksResponse = await fetch('/api/marks', { credentials: 'include' })

      // Fetch subjects to get subject names
      const subjectsResponse = await fetch('/api/subjects', { credentials: 'include' })

      let classesMap = {}
      if (classesResponse.ok) {
        const classesData = await classesResponse.json()
        if (classesData.classes) {
          classesData.classes.forEach(c => {
            classesMap[c.classId] = c.name || c.className || c.classId
          })
        }
      }

      // Build subjects map for quick lookup
      let subjectsMap = {}
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json()
        if (subjectsData.subjects) {
          subjectsData.subjects.forEach(subj => {
            subjectsMap[subj.subjectId] = {
              name: subj.name,
              subjectId: subj.subjectId,
              maxMarks: subj.maxMarks || 100
            }
          })
        }
      }

      let studentMarks = {}
      let uniqueSubjectsSet = new Set() // Track unique subjects from marks

      if (marksResponse.ok) {
        const marksData = await marksResponse.json()
        if (marksData.marks) {
          // Group marks by studentId and calculate totals
          marksData.marks.forEach(mark => {
            if (!studentMarks[mark.studentId]) {
              studentMarks[mark.studentId] = { totalMarks: 0, maxMarks: 0, subjects: [] }
            }
            studentMarks[mark.studentId].totalMarks += mark.marks || 0
            studentMarks[mark.studentId].maxMarks += mark.maxMarks || 100
            studentMarks[mark.studentId].subjects.push({
              subjectId: mark.subjectId,
              marks: mark.marks,
              maxMarks: mark.maxMarks
            })

            // Track unique subjects
            if (mark.subjectId) {
              uniqueSubjectsSet.add(mark.subjectId)
            }
          })
        }
      }

      // Update subjects table element with subjects from marks (deduplicate by name)
      if (uniqueSubjectsSet.size > 0) {
        const uniqueSubjectIds = Array.from(uniqueSubjectsSet)

        // Deduplicate by subject name to avoid showing same subject multiple times
        const seenSubjectNames = new Set()
        const uniqueSubjects = []

        uniqueSubjectIds.forEach((subjectId) => {
          const subjectInfo = subjectsMap[subjectId] || {
            name: `Subject ${subjectId}`,
            subjectId: subjectId,
            maxMarks: 100
          }

          // Only add if we haven't seen this subject name before
          if (!seenSubjectNames.has(subjectInfo.name)) {
            seenSubjectNames.add(subjectInfo.name)
            uniqueSubjects.push({
              subjectId: subjectInfo.subjectId,
              name: subjectInfo.name,
              maxMarks: subjectInfo.maxMarks
            })
          }
        })

        const subjectsForTable = uniqueSubjects.map((subject, index) => ({
          id: index + 1,
          name: subject.name,
          subjectName: subject.name,
          subjectId: subject.subjectId,
          maxMarks: subject.maxMarks,
          marksPlaceholder: `{{marks_${index + 1}}}`
        }))

        // Update the subjects table element (only if we have unique subjects)
        if (subjectsForTable.length > 0) {
          setElements(prev => prev.map(el =>
            el.type === ELEMENT_TYPES.SUBJECTS_TABLE
              ? { ...el, subjects: subjectsForTable, height: 80 + (subjectsForTable.length * 30) }
              : el
          ))
        }
      }

      if (studentsResponse.ok) {
        const data = await studentsResponse.json()
        if (data.students && data.students.length > 0) {
          const mappedStudents = data.students.slice(0, 10).map((s, index) => {
            const marks = studentMarks[s.id] || { totalMarks: 0, maxMarks: 0 }
            const percentage = marks.maxMarks > 0 ? Math.round((marks.totalMarks / marks.maxMarks) * 100) : 0
            const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 40 ? 'D' : 'F'
            const result = percentage >= 40 ? 'Pass' : 'Fail'

            // Map individual subject marks to marks_1, marks_2, etc.
            const subjectMarksMap = {}
            if (marks.subjects && marks.subjects.length > 0) {
              marks.subjects.forEach((subj, subjIdx) => {
                subjectMarksMap[`marks_${subjIdx + 1}`] = subj.marks?.toString() || '-'
              })
            }

            return {
              id: s.id,
              studentId: s.studentId,
              studentName: s.name || 'Unknown',
              fatherName: s.fatherName || '-',
              motherName: s.motherName || '-',
              rollNumber: s.studentId || `${index + 1}`.padStart(3, '0'),
              class: classesMap[s.classId] || s.classId || '-',
              classId: s.classId || '',
              section: s.section || '-',
              dob: s.dob || '-',
              email: s.email || '-',
              phone: s.phone || '-',
              address: s.address || '-',
              attendance: s.attendancePercentage || '-',
              totalMarks: marks.totalMarks.toString(),
              maxMarks: marks.maxMarks.toString(),
              percentage: percentage.toString(),
              grade: grade,
              result: result,
              rank: '-',
              photo: s.photo || null,
              batch: s.batch || '',
              subjects: marks.subjects || [],
              ...subjectMarksMap
            }
          })

          // Sort by percentage and assign ranks
          const sorted = [...mappedStudents].sort((a, b) => parseInt(b.percentage) - parseInt(a.percentage))
          sorted.forEach((student, idx) => {
            const original = mappedStudents.find(s => s.id === student.id)
            if (original) original.rank = (idx + 1).toString()
          })

          setStudents(mappedStudents)
          setLoadingStudents(false)
          return
        }
      }
    } catch (error) {
      console.log('Error fetching students:', error)
    }

    // No students found
    setStudents([])
    setLoadingStudents(false)
  }

  // Insert data placeholder into selected element
  const insertDataPlaceholder = (fieldKey) => {
    if (!selectedElement) return
    const element = elements.find(el => el.id === selectedElement)
    if (!element) return

    // For text-based elements, append the placeholder
    if (element.content !== undefined) {
      const placeholder = `{{${fieldKey}}}`
      updateElement('content', element.content + placeholder)
    }

    // For table elements, insert into the focused cell
    if (element.type === ELEMENT_TYPES.TABLE && focusedTableCell.row !== null && focusedTableCell.col !== null) {
      const placeholder = `{{${fieldKey}}}`

      // Handle header cells
      if (focusedTableCell.row === 'header') {
        const headers = element.headers || []
        const col = focusedTableCell.col
        const newHeaders = [...headers]
        if (!newHeaders[col]) newHeaders[col] = ''
        newHeaders[col] = (newHeaders[col] || '') + placeholder

        setElements(prev => prev.map(el =>
          el.id === selectedElement ? { ...el, headers: newHeaders } : el
        ))
        setSaved(false)
        return
      }

      // Handle data cells
      const data = element.data || []
      const row = focusedTableCell.row
      const col = focusedTableCell.col

      // Ensure data array is properly sized
      const newData = [...data]
      if (!newData[row]) newData[row] = []
      if (!newData[row][col]) newData[row][col] = ''

      // Append placeholder to current cell content
      newData[row][col] = (newData[row][col] || '') + placeholder

      setElements(prev => prev.map(el =>
        el.id === selectedElement ? { ...el, data: newData } : el
      ))
      setSaved(false)
    }
  }

  // Get display value (replace placeholders with actual data if student selected)
  const getDisplayValue = (content, subjectData = null) => {
    if (!content) return content

    let displayContent = String(content)

    // Replace from selectedStudent if available
    if (selectedStudent) {
      // First, try using the loaded key set mappings from database
      if (currentKeySet) {
        // Build a mapping from placeholder keys to student data properties
        const keyMapping = {}
        
        // Process manual keys - map placeholder to student property
        if (currentKeySet.manualKeys && currentKeySet.manualKeys.length > 0) {
          currentKeySet.manualKeys.forEach(key => {
            const placeholderKey = key.placeholder?.replace(/[{}]/g, '') || key.id
            const dbField = key.id // The id is the database field name (e.g., 'studentName', 'class', 'batch')
            
            // Map to student property - try direct match first, then common variations
            let studentValue = selectedStudent[dbField]
            if (studentValue === undefined || studentValue === null) {
              // Try common variations
              if (dbField === 'studentName') {
                studentValue = selectedStudent.studentName || selectedStudent.name
              } else if (dbField === 'phoneNumber') {
                studentValue = selectedStudent.phone || selectedStudent.phoneNumber
              } else if (dbField === 'rollNumber') {
                studentValue = selectedStudent.rollNumber || selectedStudent.studentId
              } else {
                studentValue = selectedStudent[dbField] || ''
              }
            }
            
            if (studentValue !== undefined && studentValue !== null) {
              keyMapping[placeholderKey] = String(studentValue)
            }
          })
        }
        
        // Process test-based keys - these need special handling (fetch from marks)
        if (currentKeySet.testBasedKeys && currentKeySet.testBasedKeys.length > 0) {
          currentKeySet.testBasedKeys.forEach(key => {
            const placeholderKey = key.placeholder?.replace(/[{}]/g, '') || key.id
            const subjectName = key.subjectName
            
            // For test-based keys, we'd need to fetch marks data
            // For now, try to get from selectedStudent if available
            if (subjectName && selectedStudent.subjects) {
              const subject = selectedStudent.subjects.find(s => 
                (s.name || '').toLowerCase() === subjectName.toLowerCase() ||
                (s.subjectName || '').toLowerCase() === subjectName.toLowerCase()
              )
              if (subject && subject.marks !== undefined) {
                keyMapping[placeholderKey] = String(subject.marks)
              }
            }
          })
        }
        
        // Process calculation keys - these need calculation logic
        if (currentKeySet.calculationKeys && currentKeySet.calculationKeys.length > 0) {
          currentKeySet.calculationKeys.forEach(key => {
            const placeholderKey = key.placeholder?.replace(/[{}]/g, '') || key.id
            // Calculation keys would need to be computed based on the formula
            // For now, we'll skip them or implement basic calculations
          })
        }
        
        // Apply the mappings
        Object.entries(keyMapping).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            displayContent = displayContent.replace(new RegExp(`{{${escapedKey}}}`, 'gi'), value)
          }
        })
      }
      
      // Fallback: try direct property matching from selectedStudent
      Object.entries(selectedStudent).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          displayContent = displayContent.replace(new RegExp(`{{${escapedKey}}}`, 'g'), String(value))
        }
      })
    }

    // Replace from subjectData if provided (for subject-specific placeholders)
    if (subjectData) {
      if (displayContent.includes('{{subjectName}}') && subjectData.subjectName) {
        displayContent = displayContent.replace(/{{subjectName}}/g, subjectData.subjectName)
      }
      if (displayContent.includes('{{subject.name}}') && subjectData.subjectName) {
        displayContent = displayContent.replace(/{{subject\.name}}/g, subjectData.subjectName)
      }
      if (displayContent.includes('{{subjectId}}') && subjectData.subjectId) {
        displayContent = displayContent.replace(/{{subjectId}}/g, subjectData.subjectId)
      }
    }

    return displayContent
  }

  // Handle element selection
  const handleElementClick = (e, element) => {
    e.stopPropagation()
    // Reset focused cell if selecting a different element
    if (selectedElement !== element.id) {
      setFocusedTableCell({ row: null, col: null })
    }
    setSelectedElement(element.id)
  }

  // Handle canvas click (deselect)
  const handleCanvasClick = () => {
    setSelectedElement(null)
    setFocusedTableCell({ row: null, col: null })
  }

  // Handle drag start
  const handleDragStart = (e, element) => {
    if (tool !== 'select') return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setSelectedElement(element.id)
    // Store the initial mouse position and element position
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      elementX: element.x,
      elementY: element.y
    })
  }

  // Handle drag
  const handleDrag = useCallback((e) => {
    if (!isDragging || !selectedElement) return

    const scale = zoom / 100
    // Calculate delta from start position
    const deltaX = (e.clientX - dragStart.mouseX) / scale
    const deltaY = (e.clientY - dragStart.mouseY) / scale

    // Calculate new position
    const newX = Math.max(0, Math.min(550, dragStart.elementX + deltaX))
    const newY = Math.max(0, Math.min(750, dragStart.elementY + deltaY))

    setElements(prev => prev.map(el =>
      el.id === selectedElement ? { ...el, x: Math.round(newX), y: Math.round(newY) } : el
    ))
    setSaved(false)
  }, [isDragging, selectedElement, dragStart, zoom])

  // Handle drag end
  const handleDragEnd = () => {
    if (isDragging || isResizing) {
      // Save state to history after drag/resize completes
      saveStateToHistory()
    }
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
    setIsPanning(false)
  }

  // Handle canvas pan start
  const handlePanStart = (e) => {
    if (tool !== 'pan' && !e.shiftKey) return
    e.preventDefault()
    setIsPanning(true)
    setPanStart({
      x: e.clientX - canvasOffset.x,
      y: e.clientY - canvasOffset.y
    })
  }

  // Handle canvas pan
  const handlePan = useCallback((e) => {
    if (!isPanning) return
    setCanvasOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    })
  }, [isPanning, panStart])

  // Handle wheel zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -10 : 10
      setZoom(prev => Math.min(200, Math.max(25, prev + delta)))
    }
  }, [])

  // Handle resize start
  const handleResizeStart = (e, element, handle) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    setSelectedElement(element.id)
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: element.width,
      height: element.height,
      elementX: element.x,
      elementY: element.y
    })
  }

  // Handle resize
  const handleResize = useCallback((e) => {
    if (!isResizing || !selectedElement || !resizeHandle) return

    const scale = zoom / 100
    const deltaX = (e.clientX - dragStart.mouseX) / scale
    const deltaY = (e.clientY - dragStart.mouseY) / scale

    setElements(prev => prev.map(el => {
      if (el.id !== selectedElement) return el

      let newWidth = dragStart.width
      let newHeight = dragStart.height
      let newX = dragStart.elementX
      let newY = dragStart.elementY

      if (resizeHandle.includes('e')) newWidth = Math.max(30, dragStart.width + deltaX)
      if (resizeHandle.includes('w')) {
        newWidth = Math.max(30, dragStart.width - deltaX)
        newX = dragStart.elementX + deltaX
      }
      if (resizeHandle.includes('s')) newHeight = Math.max(20, dragStart.height + deltaY)
      if (resizeHandle.includes('n')) {
        newHeight = Math.max(20, dragStart.height - deltaY)
        newY = dragStart.elementY + deltaY
      }

      return { ...el, width: Math.round(newWidth), height: Math.round(newHeight), x: Math.round(newX), y: Math.round(newY) }
    }))
    setSaved(false)
  }, [isResizing, selectedElement, resizeHandle, dragStart, zoom])

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) handleDrag(e)
      if (isResizing) handleResize(e)
      if (isPanning) handlePan(e)
    }

    const handleMouseUp = () => {
      handleDragEnd()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, isPanning, handleDrag, handleResize, handlePan])

  // Wheel zoom handler
  useEffect(() => {
    const container = canvasContainerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Save current state to history
  const saveStateToHistory = useCallback(() => {
    if (isUndoRedoRef.current) return // Don't save during undo/redo

    const currentState = {
      elements: JSON.parse(JSON.stringify(elements)),
      templateName,
      institutionName,
      subtitle
    }

    setHistoryIndex(currentIndex => {
      setHistory(prev => {
        // Remove any future history if we're not at the end
        const newHistory = prev.slice(0, currentIndex + 1)
        // Add new state
        newHistory.push(currentState)
        // Limit history to 50 states
        return newHistory.slice(-50)
      })
      return currentIndex + 1
    })
  }, [elements, templateName, institutionName, subtitle])

  // Undo function
  const undo = useCallback(() => {
    setHistoryIndex(currentIndex => {
      if (currentIndex > 0) {
        isUndoRedoRef.current = true
        setHistory(prev => {
          const prevState = prev[currentIndex - 1]
          setElements(JSON.parse(JSON.stringify(prevState.elements)))
          setTemplateName(prevState.templateName)
          setInstitutionName(prevState.institutionName)
          setSubtitle(prevState.subtitle)
          setSaved(false)
          setTimeout(() => {
            isUndoRedoRef.current = false
          }, 0)
          return prev
        })
        return currentIndex - 1
      }
      return currentIndex
    })
  }, [])

  // Redo function
  const redo = useCallback(() => {
    setHistoryIndex(currentIndex => {
      setHistory(prev => {
        if (currentIndex < prev.length - 1) {
          isUndoRedoRef.current = true
          const nextState = prev[currentIndex + 1]
          setElements(JSON.parse(JSON.stringify(nextState.elements)))
          setTemplateName(nextState.templateName)
          setInstitutionName(nextState.institutionName)
          setSubtitle(nextState.subtitle)
          setSaved(false)
          setTimeout(() => {
            isUndoRedoRef.current = false
          }, 0)
        }
        return prev
      })
      return currentIndex
    })
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('select')
          break
        case 'h':
          setTool('pan')
          break
        case 'delete':
        case 'backspace':
          if (selectedElement) {
            e.preventDefault()
            saveStateToHistory()
            deleteElement()
          }
          break
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setZoom(100)
            setCanvasOffset({ x: 0, y: 0 })
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedElement, undo, redo, saveStateToHistory])

  // Add new element
  const addElement = (type) => {
    saveStateToHistory()
    const id = `${type}-${Date.now()}`
    const newElement = createDefaultElement(type, id)
    setElements(prev => [...prev, newElement])
    setSelectedElement(id)
    setSaved(false)
  }

  // Delete selected element
  const deleteElement = () => {
    if (!selectedElement) return
    saveStateToHistory()
    setElements(prev => prev.filter(el => el.id !== selectedElement))
    setSelectedElement(null)
    setSaved(false)
  }

  // Duplicate element
  const duplicateElement = () => {
    if (!selectedElement) return
    saveStateToHistory()
    const element = elements.find(el => el.id === selectedElement)
    if (element) {
      const newElement = { ...element, id: `${element.type}-${Date.now()}`, x: element.x + 20, y: element.y + 20 }
      setElements(prev => [...prev, newElement])
      setSelectedElement(newElement.id)
      setSaved(false)
    }
  }

  // Move element in layer order
  const moveElementLayer = (direction) => {
    if (!selectedElement) return
    const index = elements.findIndex(el => el.id === selectedElement)
    if (index === -1) return

    const newElements = [...elements]
    if (direction === 'up' && index < elements.length - 1) {
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]]
    } else if (direction === 'down' && index > 0) {
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]]
    }
    setElements(newElements)
    setSaved(false)
  }

  // Update element property
  const updateElement = (property, value) => {
    if (!selectedElement) return
    // Only save to history for significant changes (not every keystroke)
    const shouldSaveHistory = ['content', 'fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'textColor', 'backgroundColor', 'width', 'height', 'x', 'y'].includes(property)
    if (shouldSaveHistory && !isUndoRedoRef.current) {
      // Debounce history saving for text input
      if (property === 'content') {
        clearTimeout(updateElement.historyTimeout)
        updateElement.historyTimeout = setTimeout(() => {
          saveStateToHistory()
        }, 500)
      } else {
        saveStateToHistory()
      }
    }
    setElements(prev => prev.map(el =>
      el.id === selectedElement ? { ...el, [property]: value } : el
    ))
    setSaved(false)
  }

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (selectedElement) {
          updateElement('content', reader.result)
        } else {
          // Update the logo element
          setElements(prev => prev.map(el =>
            el.type === ELEMENT_TYPES.LOGO ? { ...el, content: reader.result } : el
          ))
        }
        setSaved(false)
      }
      reader.readAsDataURL(file)
    }
  }

  // Add subject to table (check for duplicates first)
  const addSubject = () => {
    const tableElement = elements.find(el => el.type === ELEMENT_TYPES.SUBJECTS_TABLE)
    if (tableElement) {
      // Check if "Subject X" already exists to avoid duplicates
      const existingNames = new Set(tableElement.subjects.map(s => s.name))
      let newId = tableElement.subjects.length + 1
      let newName = `Subject ${newId}`

      // Find a unique name
      while (existingNames.has(newName)) {
        newId++
        newName = `Subject ${newId}`
      }

      const newSubject = {
        id: newId,
        name: newName,
        maxMarks: 100,
        marksPlaceholder: `{{marks_${newId}}}`
      }
      setElements(prev => prev.map(el =>
        el.id === tableElement.id
          ? { ...el, subjects: [...el.subjects, newSubject], height: el.height + 30 }
          : el
      ))
      setSaved(false)
    }
  }

  // Update subject
  const updateSubject = (subjectId, field, value) => {
    const tableElement = elements.find(el => el.type === ELEMENT_TYPES.SUBJECTS_TABLE)
    if (tableElement) {
      setElements(prev => prev.map(el =>
        el.id === tableElement.id
          ? {
            ...el,
            subjects: el.subjects.map(s =>
              s.id === subjectId ? { ...s, [field]: value } : s
            )
          }
          : el
      ))
      setSaved(false)
    }
  }

  // Remove subject
  const removeSubject = (subjectId) => {
    const tableElement = elements.find(el => el.type === ELEMENT_TYPES.SUBJECTS_TABLE)
    if (tableElement && tableElement.subjects.length > 1) {
      setElements(prev => prev.map(el =>
        el.id === tableElement.id
          ? {
            ...el,
            subjects: el.subjects.filter(s => s.id !== subjectId),
            height: el.height - 35
          }
          : el
      ))
      setSaved(false)
    }
  }

  // Organize elements into sections based on Y position
  const organizeElementsIntoSections = (elements) => {
    const canvasHeight = 800
    const headerHeight = canvasHeight * 0.25 // Top 25% is header
    const footerHeight = canvasHeight * 0.25 // Bottom 25% is footer
    const bodyStart = headerHeight
    const bodyEnd = canvasHeight - footerHeight

    const headerElements = []
    const bodyElements = []
    const footerElements = []

    elements.forEach(element => {
      const elementCenterY = element.y + (element.height / 2)
      
      if (elementCenterY < bodyStart) {
        headerElements.push(element)
      } else if (elementCenterY > bodyEnd) {
        footerElements.push(element)
      } else {
        bodyElements.push(element)
      }
    })

    return {
      header: headerElements,
      body: bodyElements,
      footer: footerElements
    }
  }

  // Generate HTML from template elements
  const generateTemplateHTML = (elements, institutionName, subtitle, canvasBackgroundColor, canvasBackgroundImage) => {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templateName || 'Marksheet'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
    }
    .marksheet-container {
      width: 600px;
      height: 800px;
      position: relative;
      margin: 0 auto;
      background-color: ${canvasBackgroundColor || '#ffffff'};
      ${canvasBackgroundImage ? `background-image: url('${canvasBackgroundImage}'); background-size: cover; background-position: center; background-repeat: no-repeat;` : ''}
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="marksheet-container">`

    // Sort elements by z-index (order in array)
    const sortedElements = [...elements].sort((a, b) => {
      const indexA = elements.indexOf(a)
      const indexB = elements.indexOf(b)
      return indexA - indexB
    })

    sortedElements.forEach(element => {
      const style = `
      position: absolute;
      left: ${element.x}px;
      top: ${element.y}px;
      width: ${element.width}px;
      height: ${element.height}px;
      ${element.fontSize ? `font-size: ${element.fontSize}px;` : ''}
      ${element.fontWeight ? `font-weight: ${element.fontWeight};` : ''}
      ${element.fontFamily ? `font-family: ${element.fontFamily};` : ''}
      ${element.textColor ? `color: ${element.textColor};` : ''}
      ${element.backgroundColor && element.backgroundColor !== 'transparent' ? `background-color: ${element.backgroundColor};` : ''}
      ${element.textAlign ? `text-align: ${element.textAlign};` : ''}
    `.trim()

      switch (element.type) {
        case ELEMENT_TYPES.LOGO:
          if (element.content) {
            html += `\n    <img src="${element.content}" alt="Logo" style="${style}; object-fit: contain;" />`
          }
          break

        case ELEMENT_TYPES.TEXT:
        case ELEMENT_TYPES.HEADING:
          html += `\n    <div style="${style}">${(element.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
          break

        case ELEMENT_TYPES.INPUT_FIELD:
          html += `\n    <div style="${style}; display: flex; align-items: center; gap: 4px;">
      <span style="font-weight: 600; font-size: ${element.fontSize || 12}px;">${element.fieldLabel || 'Field:'}</span>
      <div style="flex: 1; border-bottom: 1px solid #9ca3af; min-height: 18px; background-color: #f9fafb; padding: 0 4px;">
        ${(element.content || element.placeholder || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
    </div>`
          break

        case ELEMENT_TYPES.DATE_FIELD:
          html += `\n    <div style="${style}; display: flex; align-items: center; gap: 4px;">
      <span style="font-weight: 600; font-size: ${element.fontSize || 12}px;">${element.fieldLabel || 'Date:'}</span>
      <span style="border-bottom: 1px solid #9ca3af; flex: 1; font-size: ${element.fontSize || 12}px;">
        ${(element.content || '{{date}}').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </span>
    </div>`
          break

        case ELEMENT_TYPES.STUDENT_NAME:
        case ELEMENT_TYPES.STUDENT_CLASS:
        case ELEMENT_TYPES.ROLL_NUMBER:
        case ELEMENT_TYPES.FATHER_NAME:
        case ELEMENT_TYPES.DOB:
          const underlineStyle = element.showUnderline !== false ? 'border-bottom: 1px solid #9ca3af;' : ''
          html += `\n    <div style="${style}; display: flex; align-items: center; gap: 8px;">
      <span style="font-weight: 600; font-size: ${element.fontSize || 12}px;">${element.prefix || ''}</span>
      <span style="flex: 1; ${underlineStyle} font-size: ${element.fontSize || 12}px;">
        ${(element.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </span>
    </div>`
          break

        case ELEMENT_TYPES.PHOTO:
          html += `\n    <div style="${style}; border: 1px solid ${element.borderColor || '#d1d5db'}; display: flex; align-items: center; justify-content: center; background-color: #f3f4f6;">
      ${element.content ? `<img src="${element.content}" alt="Photo" style="width: 100%; height: 100%; object-fit: cover;" />` : '<span style="color: #9ca3af; font-size: 10px;">Photo</span>'}
    </div>`
          break

        case ELEMENT_TYPES.SUBJECTS_TABLE:
          const cellPadding = element.cellPadding || 6
          const tableFontSize = element.fontSize || 12
          html += `\n    <div style="${style}">
      <table style="width: 100%; border-collapse: collapse; font-size: ${tableFontSize}px;">
        <thead>
          <tr style="background-color: #1f2937; color: white;">
            <th style="border: 1px solid #4b5563; padding: ${cellPadding}px; text-align: left; width: ${element.colWidths?.[0] || 30}px;">#</th>
            <th style="border: 1px solid #4b5563; padding: ${cellPadding}px; text-align: left; width: ${element.colWidths?.[1] || 'auto'};">Subject</th>
            <th style="border: 1px solid #4b5563; padding: ${cellPadding}px; text-align: center; width: ${element.colWidths?.[2] || 70}px;">Max Marks</th>
            <th style="border: 1px solid #4b5563; padding: ${cellPadding}px; text-align: center; width: ${element.colWidths?.[3] || 80}px;">Obtained</th>
          </tr>
        </thead>
        <tbody>`
          if (element.subjects && element.subjects.length > 0) {
            element.subjects.forEach((subject, index) => {
              html += `
          <tr style="background-color: white;">
            <td style="border: 1px solid #d1d5db; padding: ${cellPadding}px; text-align: center; color: #1f2937;">${index + 1}</td>
            <td style="border: 1px solid #d1d5db; padding: ${cellPadding}px; color: #1f2937;">${(subject.name || subject.subjectName || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            <td style="border: 1px solid #d1d5db; padding: ${cellPadding}px; text-align: center; color: #1f2937;">${subject.maxMarks || 100}</td>
            <td style="border: 1px solid #d1d5db; padding: ${cellPadding}px; text-align: center; color: #4b5563;">${(subject.marksPlaceholder || `{{marks_${index + 1}}}`).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          </tr>`
            })
          }
          html += `
        </tbody>
      </table>
    </div>`
          break

        case ELEMENT_TYPES.TABLE:
          const tableCellPadding = element.cellPadding || 6
          const tableCellFontSize = element.fontSize || 12
          html += `\n    <div style="${style}">
      <table style="width: 100%; border-collapse: collapse; font-size: ${tableCellFontSize}px;">
        ${element.showHeader !== false && element.headers && element.headers.length > 0 ? `
        <thead>
          <tr style="background-color: ${element.headerBgColor || '#f3f4f6'};">
            ${element.headers.map(header => `
            <th style="border: 1px solid ${element.borderColor || '#d1d5db'}; padding: ${tableCellPadding}px;">
              ${(header || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </th>`).join('')}
          </tr>
        </thead>` : ''}
        <tbody>
          ${element.data && element.data.length > 0 ? element.data.map(row => `
          <tr>
            ${row.map(cell => `
            <td style="border: 1px solid ${element.borderColor || '#d1d5db'}; padding: ${tableCellPadding}px;">
              ${(cell || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </td>`).join('')}
          </tr>`).join('') : ''}
        </tbody>
      </table>
    </div>`
          break

        case ELEMENT_TYPES.PERCENTAGE:
        case ELEMENT_TYPES.GRADE:
        case ELEMENT_TYPES.RESULT:
          html += `\n    <div style="${style}; background-color: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; text-align: center;">
      <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${element.title || element.type.toUpperCase()}</div>
      <div style="font-size: ${element.fontSize || 14}px; font-weight: ${element.fontWeight || 'bold'}; color: #1f2937;">
        ${(element.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
    </div>`
          break

        case ELEMENT_TYPES.REMARKS:
          html += `\n    <div style="${style}; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px;">
      <div style="font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 4px;">Remarks:</div>
      <div style="font-size: 11px; color: #6b7280; border-bottom: 1px solid #d1d5db; min-height: 30px;">
        ${(element.content || '{{remarks}}').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
    </div>`
          break

        case ELEMENT_TYPES.SIGNATURE:
          html += `\n    <div style="${style}; text-align: center;">
      <div style="border-bottom: 1px solid #9ca3af; margin-bottom: 4px; height: 32px;"></div>
      <div style="font-size: ${element.fontSize || 12}px; color: #4b5563;">
        ${(element.content || 'Signature').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
    </div>`
          break

        case ELEMENT_TYPES.BOX:
          html += `\n    <div style="${style}; background-color: ${element.backgroundColor || '#f3f4f6'}; border: ${element.borderWidth || 1}px solid ${element.borderColor || '#d1d5db'}; border-radius: 4px;"></div>`
          break

        case ELEMENT_TYPES.LINE:
          html += `\n    <div style="${style}; background-color: ${element.backgroundColor || element.borderColor || '#d1d5db'}; height: ${element.height || 2}px;"></div>`
          break

        case ELEMENT_TYPES.CIRCLE:
          html += `\n    <div style="${style}; background-color: ${element.backgroundColor || '#f3f4f6'}; border: ${element.borderWidth || 1}px solid ${element.borderColor || '#d1d5db'}; border-radius: 50%;"></div>`
          break

        default:
          // Generic element rendering
          if (element.content) {
            html += `\n    <div style="${style}">${(element.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
          }
      }
    })

    html += `
  </div>
</body>
</html>`

    return html
  }

  // Save template
  const saveTemplate = async () => {
    setSaving(true)
    try {
      // Extract subjects from table element
      const tableElement = elements.find(el => el.type === ELEMENT_TYPES.SUBJECTS_TABLE)

      // Organize elements into sections
      const organizedSections = organizeElementsIntoSections(elements)

      // Prepare sections with styles
      const sections = {
        header: {
          elements: organizedSections.header,
          style: templateSections.header.style
        },
        body: {
          elements: organizedSections.body,
          style: templateSections.body.style
        },
        footer: {
          elements: organizedSections.footer,
          style: templateSections.footer.style
        }
      }

      // Generate HTML from template
      const templateHTML = generateTemplateHTML(
        elements,
        institutionName,
        subtitle,
        canvasBackgroundColor,
        canvasBackgroundImage
      )

      const payload = {
        templateName,
        institutionName,
        subtitle,
        elements, // Keep for backward compatibility
        sections, // New: sections with styles
        subjects: tableElement?.subjects || [],
        logo: elements.find(el => el.type === ELEMENT_TYPES.LOGO)?.content,
        canvasBackgroundColor: canvasBackgroundColor,
        canvasBackgroundImage: canvasBackgroundImage,
        html: templateHTML // Store HTML format
      }

      let response
      if (saved && templateId && !templateId.startsWith('ms_')) {
        payload.templateId = templateId
        response = await fetch('/api/marksheet-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        })
      } else {
        response = await fetch('/api/marksheet-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        })
      }

      if (response.ok) {
        const data = await response.json()
        toast.success('Template saved successfully!')
        setSaved(true)

        // Store current state as last saved state
        const savedState = {
          elements: JSON.parse(JSON.stringify(elements)),
          templateName,
          institutionName,
          subtitle
        }
        setLastSavedState(savedState)
        hasInitializedSavedState.current = true

        if (data.template?.templateId && templateId.startsWith('ms_')) {
          router.replace(`/marksheet/${data.template.templateId}`)
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // AI Generate Template
  const handleAIGenerate = async () => {
    if (!chatPrompt.trim()) return

    const userMessage = chatPrompt.trim()
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatPrompt('')
    setIsGenerating(true)

    try {
      const response = await fetch('/api/marksheet-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage })
      })

      if (response.ok) {
        const data = await response.json()

        if (data.elements && data.elements.length > 0) {
          // Map AI elements to our format with proper IDs
          const newElements = data.elements.map((el, index) => {
            const elementType = el.type?.toLowerCase() || 'text'
            return {
              ...createDefaultElement(elementType, `ai_${Date.now()}_${index}`),
              ...el,
              id: `ai_${Date.now()}_${index}`
            }
          })

          setElements(newElements)
          setTemplateName(data.templateName || 'AI Generated Template')
          setSaved(false)

          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `✨ Created "${data.templateName}" with ${data.elements.length} elements. You can now customize it on the canvas!`
          }])
        } else {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Sorry, I couldn\'t generate a template. Please try describing what you need more clearly.'
          }])
        }
      } else {
        const error = await response.json()
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${error.error || 'Failed to generate template'}. Please try again.`
        }])
      }
    } catch (error) {
      console.error('AI generation error:', error)
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.'
      }])
    } finally {
      setIsGenerating(false)
    }
  }

  // Revert to last saved state
  const revertToSavedState = () => {
    if (!lastSavedState) {
      toast.error('No saved state to revert to')
      return
    }

    try {
      // Save current state to history before reverting
      saveStateToHistory()

      // Deep clone the saved state to avoid reference issues
      const revertedElements = JSON.parse(JSON.stringify(lastSavedState.elements))
      const revertedTemplateName = lastSavedState.templateName
      const revertedInstitutionName = lastSavedState.institutionName
      const revertedSubtitle = lastSavedState.subtitle

      // Restore all state
      setElements(revertedElements)
      setTemplateName(revertedTemplateName)
      setInstitutionName(revertedInstitutionName)
      setSubtitle(revertedSubtitle)
      setSelectedElement(null)
      setSaved(true)
      toast.success('Template reverted to last saved state')
    } catch (error) {
      console.error('Error reverting template:', error)
      toast.error('Failed to revert template')
    }
  }

  // Get selected element data
  const selectedElementData = elements.find(el => el.id === selectedElement)

  // Render element on canvas
  const renderElement = (element) => {
    const isSelected = selectedElement === element.id
    const baseStyle = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      cursor: tool === 'select' ? (isDragging && selectedElement === element.id ? 'grabbing' : 'grab') : 'default',
      outline: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
      outlineOffset: '2px',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      boxSizing: 'border-box',
    }

    // Wrapper for drag handling
    const DraggableWrapper = ({ children, className = '', style: extraStyle = {} }) => (
      <div
        key={element.id}
        style={{ ...baseStyle, ...extraStyle }}
        className={`${className} ${isSelected ? 'z-10' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (tool === 'select') {
            handleDragStart(e, element)
          }
        }}
        onClick={(e) => {
          e.stopPropagation()
          handleElementClick(e, element)
        }}
      >
        {children}
        {isSelected && renderResizeHandles(element)}
      </div>
    )

    switch (element.type) {
      case ELEMENT_TYPES.LOGO:
        return (
          <DraggableWrapper className="flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
            {element.content ? (
              <img src={element.content} alt="Logo" className="w-full h-full object-contain pointer-events-none" draggable={false} />
            ) : (
              <ImageIcon className="h-8 w-8 text-gray-400 pointer-events-none" />
            )}
          </DraggableWrapper>
        )

      case ELEMENT_TYPES.TEXT:
      case ELEMENT_TYPES.HEADING:
        return (
          <DraggableWrapper
            style={{
              fontSize: element.fontSize,
              fontWeight: element.fontWeight || 400,
              fontFamily: element.fontFamily || 'Arial, sans-serif',
              color: element.textColor || '#000000',
              backgroundColor: element.backgroundColor === 'transparent' ? 'transparent' : element.backgroundColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: element.textAlign === 'left' ? 'flex-start' : element.textAlign === 'right' ? 'flex-end' : 'center'
            }}
          >
            <span className="pointer-events-none w-full" style={{ textAlign: element.textAlign || 'center' }}>
              {getDisplayValue(element.content)}
            </span>
          </DraggableWrapper>
        )

      case ELEMENT_TYPES.INPUT_FIELD:
        return (
          <DraggableWrapper className="flex items-center gap-1 text-gray-800" style={{ fontSize: element.fontSize }}>
            <span className="font-medium text-xs pointer-events-none whitespace-nowrap">{element.fieldLabel}</span>
            <div className="flex-1 border-b border-gray-400 min-h-[18px] pointer-events-none bg-gray-50 px-1">
              {element.content ? getDisplayValue(element.content) : <span className="text-gray-400 text-xs">{element.placeholder}</span>}
            </div>
          </DraggableWrapper>
        )

      case ELEMENT_TYPES.DATE_FIELD:
        return (
          <DraggableWrapper className="flex items-center gap-1 text-gray-800" style={{ fontSize: element.fontSize }}>
            <span className="font-medium text-xs pointer-events-none whitespace-nowrap">{element.fieldLabel}</span>
            <span className="border-b border-gray-400 flex-1 text-xs pointer-events-none">{getDisplayValue(element.content)}</span>
          </DraggableWrapper>
        )

      case ELEMENT_TYPES.PHOTO:
        return (
          <DraggableWrapper
            className="flex items-center justify-center bg-gray-100 border border-gray-300"
            style={{ borderColor: element.borderColor }}
          >
            {element.content ? (
              <img src={element.content} alt="Photo" className="w-full h-full object-cover pointer-events-none" draggable={false} />
            ) : (
              <div className="text-center pointer-events-none">
                <ImageIcon className="h-6 w-6 text-gray-400 mx-auto" />
                <span className="text-[9px] text-gray-400">Photo</span>
              </div>
            )}
          </DraggableWrapper>
        )

      case ELEMENT_TYPES.STUDENT_NAME:
      case ELEMENT_TYPES.STUDENT_CLASS:
      case ELEMENT_TYPES.ROLL_NUMBER:
      case ELEMENT_TYPES.FATHER_NAME:
      case ELEMENT_TYPES.DOB:
        return (
          <DraggableWrapper className="flex items-center gap-2 text-gray-800" style={{ fontSize: element.fontSize || 12 }}>
            <span className="font-semibold pointer-events-none" style={{ fontSize: element.fontSize || 12 }}>{element.prefix}</span>
            <span
              className={`flex-1 pointer-events-none ${element.showUnderline !== false ? 'border-b border-gray-400' : ''}`}
              style={{ fontSize: element.fontSize || 12 }}
            >
              {getDisplayValue(element.content)}
            </span>
          </DraggableWrapper>
        )

      case ELEMENT_TYPES.SUBJECTS_TABLE:
        const cellPadding = element.cellPadding || 6
        const fontSize = element.fontSize || 12
        const cellStyle = { padding: `${cellPadding}px`, fontSize: `${fontSize}px` }
        return (
          <DraggableWrapper className="overflow-hidden bg-white">
            <table className="w-full border-collapse" style={{ fontSize: `${fontSize}px` }}>
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="border border-gray-600 text-left" style={{ ...cellStyle, width: element.colWidths?.[0] || 30 }}>#</th>
                  <th className="border border-gray-600 text-left" style={{ ...cellStyle, width: element.colWidths?.[1] || 'auto' }}>Subject</th>
                  <th className="border border-gray-600 text-center" style={{ ...cellStyle, width: element.colWidths?.[2] || 70 }}>Max Marks</th>
                  <th className="border border-gray-600 text-center" style={{ ...cellStyle, width: element.colWidths?.[3] || 80 }}>Obtained</th>
                  {isSelected && <th className="border border-gray-600" style={{ ...cellStyle, width: 30 }}></th>}
                </tr>
              </thead>
              <tbody>
                {element.subjects.length === 0 && (
                  <tr key="empty-row" className="bg-white">
                    <td colSpan={isSelected ? 5 : 4} className="border border-gray-300 text-center text-gray-400 py-4" style={cellStyle}>
                      No subjects loaded. Click "Load Subjects from DB" or "Add Subject" to add subjects.
                    </td>
                  </tr>
                )}
                {element.subjects.map((subject, index) => (
                  <tr key={subject.id} className="bg-white">
                    <td className="border border-gray-300 text-center text-gray-800" style={cellStyle}>{index + 1}</td>
                    <td className="border border-gray-300 text-gray-800" style={cellStyle}>
                      {isSelected ? (
                        <input
                          type="text"
                          value={subject.name || ''}
                          onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                          className="w-full p-0.5 bg-white outline-none cursor-text text-gray-800 border border-gray-200 rounded"
                          style={{ fontSize: `${fontSize}px` }}
                          placeholder="Enter name or use {{subjectName}}"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-gray-800">
                          {subject.name ? getDisplayValue(subject.name, subject) : getDisplayValue('{{subjectName}}', subject)}
                        </span>
                      )}
                    </td>
                    <td className="border border-gray-300 text-center text-gray-800" style={cellStyle}>
                      {isSelected ? (
                        <input
                          type="number"
                          value={subject.maxMarks}
                          onChange={(e) => updateSubject(subject.id, 'maxMarks', e.target.value)}
                          className="w-full p-0.5 text-center bg-white outline-none cursor-text text-gray-800 border border-gray-200 rounded"
                          style={{ fontSize: `${fontSize}px` }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-gray-800">{subject.maxMarks}</span>
                      )}
                    </td>
                    <td className="border border-gray-300 text-center text-gray-600" style={cellStyle}>
                      {(() => {
                        // Try to get marks from selectedStudent.subjects by matching subject name
                        let marksValue = getDisplayValue(subject.marksPlaceholder || `{{marks_${index + 1}}}`)
                        
                        // If placeholder wasn't replaced and we have selectedStudent with subjects, try direct matching
                        if (selectedStudent && selectedStudent.subjects && marksValue === (subject.marksPlaceholder || `{{marks_${index + 1}}}`)) {
                          const subjectName = subject.name?.toLowerCase().trim() || subject.subjectName?.toLowerCase().trim()
                          if (subjectName) {
                            // Try to find matching subject in selectedStudent.subjects
                            const matchedSubject = selectedStudent.subjects.find(s => {
                              const sName = (s.name || s.subjectName || '').toLowerCase().trim()
                              return sName === subjectName || 
                                     sName.includes(subjectName) || 
                                     subjectName.includes(sName)
                            })
                            if (matchedSubject && matchedSubject.marks !== undefined) {
                              marksValue = String(matchedSubject.marks)
                            }
                          }
                          
                          // Fallback: try marks_1, marks_2, etc. from selectedStudent
                          if (marksValue === (subject.marksPlaceholder || `{{marks_${index + 1}}}`)) {
                            const marksKey = `marks_${index + 1}`
                            if (selectedStudent[marksKey] !== undefined) {
                              marksValue = String(selectedStudent[marksKey])
                            }
                          }
                        }
                        
                        return marksValue
                      })()}
                    </td>
                    {isSelected && (
                      <td className="border border-gray-300 text-center" style={cellStyle}>
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); removeSubject(subject.id) }}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                          disabled={element.subjects.length === 1}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {element.subjects.length > 0 && (
                  <tr key="total-row" className="bg-gray-100 font-semibold">
                    <td colSpan={2} className="border border-gray-300 text-right text-gray-800" style={cellStyle}>TOTAL</td>
                    <td className="border border-gray-300 text-center text-gray-800" style={cellStyle}>
                      {element.subjects.reduce((acc, s) => acc + (parseInt(s.maxMarks) || 0), 0)}
                    </td>
                    <td className="border border-gray-300 text-center text-gray-600" style={cellStyle}>
                      {getDisplayValue('{{totalMarks}}')}
                    </td>
                    {isSelected && <td className="border border-gray-300" style={cellStyle}></td>}
                  </tr>
                )}
              </tbody>
            </table>
            {isSelected && (
              <div className="mt-1 flex justify-center">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); addSubject() }}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 bg-blue-50 rounded"
                >
                  <Plus className="h-3 w-3" /> Add Subject
                </button>
              </div>
            )}
          </DraggableWrapper>
        )

      case ELEMENT_TYPES.TABLE:
        const tableCellPadding = element.cellPadding || 6
        const tableFontSize = element.fontSize || 12
        const tableCellStyle = { padding: `${tableCellPadding}px`, fontSize: `${tableFontSize}px` }
        const cols = element.cols || 3
        const rows = element.rows || 3
        let headers = element.headers || []
        let data = element.data || []

        // Ensure headers array matches cols
        if (headers.length < cols) {
          headers = [...headers, ...Array.from({ length: cols - headers.length }, (_, i) => `Header ${headers.length + i + 1}`)]
        } else if (headers.length > cols) {
          headers = headers.slice(0, cols)
        }

        // Ensure data array matches rows and cols
        if (data.length < rows) {
          data = [...data, ...Array.from({ length: rows - data.length }, () => Array.from({ length: cols }).fill(''))]
        } else if (data.length > rows) {
          data = data.slice(0, rows)
        }

        // Ensure each row has the correct number of columns
        data = data.map(row => {
          const newRow = [...(row || [])]
          while (newRow.length < cols) newRow.push('')
          return newRow.slice(0, cols)
        })

        return (
          <DraggableWrapper className="overflow-hidden bg-white">
            <table className="w-full border-collapse" style={{ fontSize: `${tableFontSize}px` }}>
              {element.showHeader !== false && headers.length > 0 && (
                <thead>
                  <tr style={{ backgroundColor: element.headerBgColor || '#f3f4f6' }}>
                    {headers.map((header, idx) => (
                      <th
                        key={idx}
                        className="border text-left font-semibold"
                        style={{ ...tableCellStyle, borderColor: element.borderColor || '#d1d5db' }}
                      >
                        {isSelected ? (
                          <input
                            type="text"
                            value={header || ''}
                            onChange={(e) => {
                              const newHeaders = [...headers]
                              newHeaders[idx] = e.target.value
                              updateElement('headers', newHeaders)
                            }}
                            onFocus={() => setFocusedTableCell({ row: 'header', col: idx })}
                            className="w-full p-0.5 bg-transparent outline-none cursor-text border border-gray-300 rounded"
                            style={{ fontSize: `${tableFontSize}px` }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span>{getDisplayValue(header || '')}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {data.map((row, rowIdx) => (
                  <tr key={rowIdx} className="bg-white">
                    {Array.from({ length: cols }).map((_, colIdx) => (
                      <td
                        key={colIdx}
                        className="border text-gray-800"
                        style={{ ...tableCellStyle, borderColor: element.borderColor || '#d1d5db' }}
                      >
                        {isSelected ? (
                          <input
                            key={`cell-${rowIdx}-${colIdx}-${selectedStudent?.id || 'no-student'}`}
                            type="text"
                            value={
                              // Show replaced value when cell is not focused, raw placeholder when focused
                              (focusedTableCell.row === rowIdx && focusedTableCell.col === colIdx)
                                ? (row[colIdx] || '')
                                : getDisplayValue(row[colIdx] || '')
                            }
                            onChange={(e) => {
                              const newData = [...data]
                              if (!newData[rowIdx]) newData[rowIdx] = []
                              // Always store the raw value (what user types or placeholder)
                              newData[rowIdx][colIdx] = e.target.value
                              updateElement('data', newData)
                            }}
                            onFocus={() => {
                              setFocusedTableCell({ row: rowIdx, col: colIdx })
                            }}
                            onBlur={() => {
                              // Clear focus after a short delay to allow field button clicks
                              setTimeout(() => {
                                setFocusedTableCell(prev => {
                                  // Only clear if still on the same cell
                                  if (prev.row === rowIdx && prev.col === colIdx) {
                                    return { row: null, col: null }
                                  }
                                  return prev
                                })
                              }, 200)
                            }}
                            className="w-full p-0.5 bg-white outline-none cursor-text border border-gray-200 rounded"
                            style={{ fontSize: `${tableFontSize}px` }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            placeholder={row[colIdx] ? '' : 'Enter text or insert field'}
                          />
                        ) : (
                          <span>{getDisplayValue(row[colIdx] || '')}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </DraggableWrapper>
        )

      case ELEMENT_TYPES.PERCENTAGE:
      case ELEMENT_TYPES.GRADE:
      case ELEMENT_TYPES.RESULT:
        return (
          <DraggableWrapper className="bg-white border border-gray-200 rounded-lg shadow-sm p-2 text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wide pointer-events-none">{element.title}</div>
            <div style={{ fontSize: element.fontSize, fontWeight: element.fontWeight }} className="text-gray-800 pointer-events-none">
              {getDisplayValue(element.content)}
            </div>
          </DraggableWrapper>
        )

      case ELEMENT_TYPES.REMARKS:
        return (
          <DraggableWrapper className="bg-gray-50 border border-gray-200 rounded p-2">
            <div className="text-xs font-semibold text-gray-700 mb-1 pointer-events-none">Remarks:</div>
            <div className="text-xs text-gray-500 border-b border-gray-300 min-h-[30px] pointer-events-none">
              {getDisplayValue(element.content || "{{remarks}}")}
            </div>
          </DraggableWrapper>
        )

      case ELEMENT_TYPES.SIGNATURE:
        return (
          <DraggableWrapper
            className="text-center"
            style={{
              fontFamily: element.fontFamily || 'Arial, sans-serif',
              fontWeight: element.fontWeight || 400,
            }}
          >
            <div className="border-b border-gray-400 mb-1 h-8 pointer-events-none"></div>
            <div
              className="text-gray-600 pointer-events-none"
              style={{ fontSize: element.fontSize || 12 }}
            >
              {getDisplayValue(element.content)}
            </div>
          </DraggableWrapper>
        )

      case ELEMENT_TYPES.BOX:
        return (
          <DraggableWrapper
            style={{
              backgroundColor: element.backgroundColor,
              border: `${element.borderWidth}px solid ${element.borderColor}`,
              borderRadius: 4
            }}
          />
        )

      case ELEMENT_TYPES.LINE:
        return (
          <DraggableWrapper
            style={{
              backgroundColor: element.backgroundColor,
              height: 2
            }}
          />
        )

      case ELEMENT_TYPES.CIRCLE:
        return (
          <DraggableWrapper
            style={{
              backgroundColor: element.backgroundColor,
              border: `${element.borderWidth}px solid ${element.borderColor}`,
              borderRadius: '50%'
            }}
          />
        )

      default:
        return null
    }
  }

  // Render resize handles - Figma style
  const renderResizeHandles = (element) => {
    const handleBase = {
      position: 'absolute',
      width: 8,
      height: 8,
      backgroundColor: '#fff',
      border: '1px solid #3b82f6',
      borderRadius: 1,
      zIndex: 50,
    }

    const handles = [
      { pos: 'nw', style: { top: -4, left: -4, cursor: 'nwse-resize' } },
      { pos: 'n', style: { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
      { pos: 'ne', style: { top: -4, right: -4, cursor: 'nesw-resize' } },
      { pos: 'e', style: { top: '50%', right: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' } },
      { pos: 'se', style: { bottom: -4, right: -4, cursor: 'nwse-resize' } },
      { pos: 's', style: { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
      { pos: 'sw', style: { bottom: -4, left: -4, cursor: 'nesw-resize' } },
      { pos: 'w', style: { top: '50%', left: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' } },
    ]

    return (
      <>
        {handles.map(({ pos, style }) => (
          <div
            key={pos}
            style={{ ...handleBase, ...style }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleResizeStart(e, element, pos)
            }}
          />
        ))}
      </>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/marksheet">Marksheet</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Editor</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Toolbar */}
          <div className="flex-1 flex items-center justify-center gap-1">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                size="sm"
                variant={tool === 'select' ? 'secondary' : 'ghost'}
                onClick={() => setTool('select')}
                className="h-8 w-8 p-0"
                title="Select Tool (V)"
              >
                <MousePointer className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={tool === 'pan' ? 'secondary' : 'ghost'}
                onClick={() => setTool('pan')}
                className="h-8 w-8 p-0"
                title="Pan Tool (H)"
              >
                <Hand className="h-4 w-4" />
              </Button>
            </div>
            <Separator orientation="vertical" className="h-6 mx-2" />
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => setZoom(Math.max(25, zoom - 10))} className="h-8 w-8 p-0" title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-12 text-center">{zoom}%</span>
              <Button size="sm" variant="ghost" onClick={() => setZoom(Math.min(200, zoom + 10))} className="h-8 w-8 p-0" title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setZoom(100); setCanvasOffset({ x: 0, y: 0 }) }}
                className="h-8 w-8 p-0"
                title="Reset View (Ctrl+0)"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={undo}
                className="h-8 w-8 p-0"
                title="Undo (Ctrl+Z)"
                disabled={historyIndex <= 0}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={redo}
                className="h-8 w-8 p-0"
                title="Redo (Ctrl+Y)"
                disabled={historyIndex >= history.length - 1}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
            <Separator orientation="vertical" className="h-6 mx-2" />
            <Button
              size="sm"
              variant={showGrid ? 'secondary' : 'ghost'}
              onClick={() => setShowGrid(!showGrid)}
              className="h-8 w-8 p-0"
              title="Toggle Grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>

          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-4">
            <Input
              value={templateName}
              onChange={(e) => { setTemplateName(e.target.value); setSaved(false) }}
              className="h-8 w-48"
              placeholder="Template name"
            />
            <Button size="sm" onClick={saveTemplate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span className="ml-1">{saving ? 'Saving...' : saved ? 'Saved' : 'Save'}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push(`/marksheet/${templateId}/generate`)} disabled={!saved}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Generate
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Elements */}
          <div className="w-56 border-r bg-muted/30 overflow-y-auto shrink-0">
            {/* Student Data Section */}
            <div className="p-2 border-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5" />
                  Student Data
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={fetchStudents}
                  disabled={loadingStudents}
                  title="Load Students"
                >
                  {loadingStudents ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              {students.length > 0 ? (
                <select
                  value={selectedStudent?.id || ''}
                  onChange={(e) => {
                    const student = students.find(s => s.id === e.target.value)
                    setSelectedStudent(student || null)
                  }}
                  className="w-full h-8 text-xs bg-background border rounded-md px-2"
                >
                  <option value="">Select a student...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.studentName} ({student.rollNumber})
                    </option>
                  ))}
                </select>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs"
                  onClick={fetchStudents}
                  disabled={loadingStudents}
                >
                  {loadingStudents ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      Load Students
                    </>
                  )}
                </Button>
              )}
              {selectedStudent && (
                <div className="mt-2 p-2 bg-muted/50 rounded-md space-y-1">
                  <p className="text-xs font-medium">{selectedStudent.studentName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    ID: {selectedStudent.studentId || selectedStudent.rollNumber}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Class: {selectedStudent.class} {selectedStudent.section !== '-' && `| Sec: ${selectedStudent.section}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Marks: {selectedStudent.totalMarks}/{selectedStudent.maxMarks} ({selectedStudent.percentage}%)
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Grade: {selectedStudent.grade} | Result: {selectedStudent.result}
                  </p>
                </div>
              )}
            </div>

            <Accordion type="multiple" defaultValue={["layout", "basic", "shapes", "student", "marks", "other"]} className="w-full">
              {/* Layout/Background Section */}
              <AccordionItem value="layout" className="border-b-0">
                <AccordionTrigger className="py-2 px-2 text-xs font-semibold hover:no-underline">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Layout & Background
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-2 px-2 space-y-2">
                  {/* Background Image */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Background Image</Label>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 text-xs"
                        onClick={() => backgroundImageInputRef.current?.click()}
                      >
                        <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                        {canvasBackgroundImage ? 'Change' : 'Upload'}
                      </Button>
                      {canvasBackgroundImage && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-xs"
                          onClick={() => {
                            setCanvasBackgroundImage(null)
                            setSaved(false)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {canvasBackgroundImage && (
                      <div className="mt-1 p-1 border rounded">
                        <img src={canvasBackgroundImage} alt="Background" className="w-full h-16 object-cover rounded" />
                      </div>
                    )}
                  </div>
                  
                  {/* Background Color */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Background Color</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 w-full justify-start gap-2 text-xs">
                          <div className="w-4 h-4 rounded border" style={{ backgroundColor: canvasBackgroundColor }} />
                          {canvasBackgroundColor}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" side="right">
                        <div className="grid grid-cols-10 gap-1">
                          {COLOR_PALETTE.map((color) => (
                            <button
                              key={color}
                              className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                              onClick={() => {
                                setCanvasBackgroundColor(color)
                                setSaved(false)
                              }}
                            />
                          ))}
                        </div>
                        <div className="mt-2">
                          <Input
                            type="text"
                            value={canvasBackgroundColor}
                            onChange={(e) => {
                              setCanvasBackgroundColor(e.target.value)
                              setSaved(false)
                            }}
                            placeholder="#ffffff"
                            className="h-7 text-xs"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="basic" className="border-b-0">
                <AccordionTrigger className="py-2 px-2 text-xs font-semibold hover:no-underline">
                  Basic Elements
                </AccordionTrigger>
                <AccordionContent className="pb-2 px-2">
                  <div className="grid grid-cols-2 gap-1">
                    <Button size="sm" variant="outline" className="h-8 justify-start gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="h-3.5 w-3.5" />
                      Logo
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 justify-start gap-1.5 text-xs" onClick={() => addElement(ELEMENT_TYPES.HEADING)}>
                      <Type className="h-3.5 w-3.5" />
                      Heading
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 justify-start gap-1.5 text-xs" onClick={() => addElement(ELEMENT_TYPES.TEXT)}>
                      <Type className="h-3.5 w-3.5" />
                      Text
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 justify-start gap-1.5 text-xs" onClick={() => addElement(ELEMENT_TYPES.INPUT_FIELD)}>
                      <Square className="h-3.5 w-3.5" />
                      Input
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 justify-start gap-1.5 text-xs col-span-2" onClick={() => addElement(ELEMENT_TYPES.DATE_FIELD)}>
                      <Type className="h-3.5 w-3.5" />
                      Date Field
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 justify-start gap-1.5 text-xs col-span-2" onClick={() => addElement(ELEMENT_TYPES.TABLE)}>
                      <Table className="h-3.5 w-3.5" />
                      Table
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="shapes" className="border-b-0">
                <AccordionTrigger className="py-2 px-2 text-xs font-semibold hover:no-underline">
                  Shapes
                </AccordionTrigger>
                <AccordionContent className="pb-2 px-2">
                  <div className="grid grid-cols-3 gap-1">
                    <Button size="sm" variant="outline" className="h-8 flex-col gap-0.5 text-[10px]" onClick={() => addElement(ELEMENT_TYPES.BOX)}>
                      <Square className="h-4 w-4" />
                      Box
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 flex-col gap-0.5 text-[10px]" onClick={() => addElement(ELEMENT_TYPES.CIRCLE)}>
                      <div className="h-4 w-4 rounded-full border-2" />
                      Circle
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 flex-col gap-0.5 text-[10px]" onClick={() => addElement(ELEMENT_TYPES.LINE)}>
                      <Minus className="h-4 w-4" />
                      Line
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="student" className="border-b-0">
                <AccordionTrigger className="py-2 px-2 text-xs font-semibold hover:no-underline">
                  Student Info
                </AccordionTrigger>
                <AccordionContent className="pb-2 px-2">
                  <div className="grid grid-cols-2 gap-1">
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs" onClick={() => addElement(ELEMENT_TYPES.PHOTO)}>
                      Photo
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs" onClick={() => addElement(ELEMENT_TYPES.STUDENT_NAME)}>
                      Name
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs" onClick={() => addElement(ELEMENT_TYPES.FATHER_NAME)}>
                      Father Name
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs" onClick={() => addElement(ELEMENT_TYPES.STUDENT_CLASS)}>
                      Class
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs" onClick={() => addElement(ELEMENT_TYPES.ROLL_NUMBER)}>
                      Roll No
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs" onClick={() => addElement(ELEMENT_TYPES.DOB)}>
                      DOB
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="marks" className="border-b-0">
                <AccordionTrigger className="py-2 px-2 text-xs font-semibold hover:no-underline">
                  Marks & Results
                </AccordionTrigger>
                <AccordionContent className="pb-2 px-2">
                  <div className="grid grid-cols-2 gap-1">
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs col-span-2" onClick={addSubject}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Subject
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs" onClick={() => addElement(ELEMENT_TYPES.PERCENTAGE)}>
                      Percentage
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs" onClick={() => addElement(ELEMENT_TYPES.GRADE)}>
                      Grade
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs col-span-2" onClick={() => addElement(ELEMENT_TYPES.RESULT)}>
                      Result Status
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="other" className="border-b-0">
                <AccordionTrigger className="py-2 px-2 text-xs font-semibold hover:no-underline">
                  Other
                </AccordionTrigger>
                <AccordionContent className="pb-2 px-2">
                  <div className="grid grid-cols-2 gap-1">
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs" onClick={() => addElement(ELEMENT_TYPES.REMARKS)}>
                      Remarks
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 justify-start text-xs" onClick={() => addElement(ELEMENT_TYPES.SIGNATURE)}>
                      Signature
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={backgroundImageInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (event) => {
                    setCanvasBackgroundImage(event.target?.result)
                    setSaved(false)
                  }
                  reader.readAsDataURL(file)
                }
              }}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Canvas Area */}
          <div
            ref={canvasContainerRef}
            className="flex-1 bg-neutral-200 overflow-hidden relative"
            style={{
              cursor: isPanning ? 'grabbing' : tool === 'pan' ? 'grab' : isDragging ? 'grabbing' : isResizing ? (resizeHandle?.includes('n') || resizeHandle?.includes('s') ? 'ns-resize' : resizeHandle?.includes('e') || resizeHandle?.includes('w') ? 'ew-resize' : 'nwse-resize') : 'default',
              userSelect: isDragging || isResizing || isPanning ? 'none' : 'auto'
            }}
            onMouseDown={handlePanStart}
          >
            <div
              className="absolute inset-0 overflow-auto"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '24px',
                minHeight: '100%',
              }}
            >
              <div
                style={{
                  transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                }}
              >
                <div
                  style={{
                    width: 600 * (zoom / 100),
                    height: 800 * (zoom / 100),
                  }}
                >
                  <div
                    ref={canvasRef}
                    className="relative shadow-xl origin-top-left"
                    style={{
                      width: 600,
                      height: 800,
                      transform: `scale(${zoom / 100})`,
                      backgroundColor: canvasBackgroundColor || '#ffffff',
                      backgroundImage: canvasBackgroundImage
                        ? `url(${canvasBackgroundImage})`
                        : showGrid
                        ? 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)'
                        : 'none',
                      backgroundSize: canvasBackgroundImage
                        ? 'cover'
                        : showGrid
                        ? '20px 20px'
                        : 'auto',
                      backgroundPosition: canvasBackgroundImage ? 'center' : 'top left',
                      backgroundRepeat: canvasBackgroundImage ? 'no-repeat' : 'repeat'
                    }}
                    onClick={handleCanvasClick}
                  >
                    {/* Render all elements */}
                    {elements.map(element => (
                      <React.Fragment key={element.id}>
                        {renderElement(element)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Properties */}
          <div className="w-64 min-w-64 border-l bg-muted/30 overflow-y-auto shrink-0">
            {selectedElementData ? (
              <Accordion type="multiple" defaultValue={["style", "data", "actions"]} className="w-full">
                {/* Text properties */}
                {(selectedElementData.type === ELEMENT_TYPES.TEXT ||
                  selectedElementData.type === ELEMENT_TYPES.HEADING ||
                  selectedElementData.type === ELEMENT_TYPES.SIGNATURE) && (
                    <AccordionItem value="style" className="border-b-0">
                      <AccordionTrigger className="py-2 px-3 text-xs font-semibold hover:no-underline">
                        Text Style
                      </AccordionTrigger>
                      <AccordionContent className="pb-3 px-3 space-y-3">
                        <Input
                          value={selectedElementData.content}
                          onChange={(e) => updateElement('content', e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Enter text..."
                        />
                        {/* Font Family */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Font</Label>
                          <select
                            value={selectedElementData.fontFamily || 'Arial, sans-serif'}
                            onChange={(e) => updateElement('fontFamily', e.target.value)}
                            className="w-full h-8 text-xs bg-background border rounded-md px-2"
                          >
                            {FONT_FAMILIES.map((font) => (
                              <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                {font.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* Font Size */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-8">{selectedElementData.fontSize}px</span>
                          <Slider
                            value={[selectedElementData.fontSize || 14]}
                            onValueChange={([value]) => updateElement('fontSize', value)}
                            min={8}
                            max={72}
                            step={1}
                            className="flex-1"
                          />
                        </div>
                        {/* Font Weight */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Weight: {typeof selectedElementData.fontWeight === 'number' ? selectedElementData.fontWeight : (selectedElementData.fontWeight === 'bold' ? 700 : 400)}
                          </Label>
                          <div className="flex gap-0.5">
                            {FONT_WEIGHTS.map((weight) => (
                              <Button
                                key={weight.value}
                                size="sm"
                                variant={
                                  (typeof selectedElementData.fontWeight === 'number' && selectedElementData.fontWeight === weight.value) ||
                                    (selectedElementData.fontWeight === 'bold' && weight.value === 700) ||
                                    (selectedElementData.fontWeight === 'normal' && weight.value === 400) ||
                                    (!selectedElementData.fontWeight && weight.value === 400)
                                    ? 'secondary'
                                    : 'outline'
                                }
                                onClick={() => updateElement('fontWeight', weight.value)}
                                className="h-6 w-6 p-0 text-[10px]"
                                title={`Weight ${weight.value}`}
                              >
                                {weight.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        {/* Text Align */}
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant={selectedElementData.textAlign === 'left' ? 'secondary' : 'outline'}
                            onClick={() => updateElement('textAlign', 'left')}
                            className="h-8 w-8 p-0"
                          >
                            <AlignLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedElementData.textAlign === 'center' ? 'secondary' : 'outline'}
                            onClick={() => updateElement('textAlign', 'center')}
                            className="h-8 w-8 p-0"
                          >
                            <AlignCenter className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedElementData.textAlign === 'right' ? 'secondary' : 'outline'}
                            onClick={() => updateElement('textAlign', 'right')}
                            className="h-8 w-8 p-0"
                          >
                            <AlignRight className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Color Pickers */}
                        <div className="grid grid-cols-2 gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-8 gap-2 text-xs justify-start">
                                <div className="w-4 h-4 rounded border" style={{ backgroundColor: selectedElementData.textColor || '#000000' }} />
                                Color
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" side="left">
                              <div className="grid grid-cols-10 gap-1">
                                {COLOR_PALETTE.map((color) => (
                                  <button
                                    key={color}
                                    className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    onClick={() => updateElement('textColor', color)}
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-8 gap-2 text-xs justify-start">
                                <div className="w-4 h-4 rounded border" style={{ backgroundColor: selectedElementData.backgroundColor || '#ffffff' }} />
                                BG
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" side="left">
                              <div className="grid grid-cols-10 gap-1">
                                <button
                                  className="w-5 h-5 rounded border hover:scale-110 transition-transform bg-white relative"
                                  onClick={() => updateElement('backgroundColor', 'transparent')}
                                >
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-full h-0.5 bg-red-500 rotate-45" />
                                  </div>
                                </button>
                                {COLOR_PALETTE.slice(0, 9).map((color) => (
                                  <button
                                    key={color}
                                    className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    onClick={() => updateElement('backgroundColor', color)}
                                  />
                                ))}
                                {COLOR_PALETTE.slice(10).map((color) => (
                                  <button
                                    key={color}
                                    className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    onClick={() => updateElement('backgroundColor', color)}
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                {/* Subjects Table properties */}
                {selectedElementData.type === ELEMENT_TYPES.SUBJECTS_TABLE && (
                  <AccordionItem value="style" className="border-b-0">
                    <AccordionTrigger className="py-2 px-3 text-xs font-semibold hover:no-underline">
                      Table Style
                    </AccordionTrigger>
                    <AccordionContent className="pb-3 px-3 space-y-3">
                      {/* Font Size */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Font Size: {selectedElementData.fontSize || 12}px
                        </Label>
                        <Slider
                          value={[selectedElementData.fontSize || 12]}
                          onValueChange={([value]) => updateElement('fontSize', value)}
                          min={8}
                          max={16}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      {/* Cell Padding */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Cell Padding: {selectedElementData.cellPadding || 6}px
                        </Label>
                        <Slider
                          value={[selectedElementData.cellPadding || 6]}
                          onValueChange={([value]) => updateElement('cellPadding', value)}
                          min={2}
                          max={12}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      {/* Column Widths */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Column Widths</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-muted-foreground"># Col</span>
                            <Input
                              type="number"
                              value={selectedElementData.colWidths?.[0] || 30}
                              onChange={(e) => {
                                const newWidths = [...(selectedElementData.colWidths || [30, null, 70, 80])]
                                newWidths[0] = parseInt(e.target.value) || 30
                                updateElement('colWidths', newWidths)
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground">Max Col</span>
                            <Input
                              type="number"
                              value={selectedElementData.colWidths?.[2] || 70}
                              onChange={(e) => {
                                const newWidths = [...(selectedElementData.colWidths || [30, null, 70, 80])]
                                newWidths[2] = parseInt(e.target.value) || 70
                                updateElement('colWidths', newWidths)
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground">Obtained Col</span>
                            <Input
                              type="number"
                              value={selectedElementData.colWidths?.[3] || 80}
                              onChange={(e) => {
                                const newWidths = [...(selectedElementData.colWidths || [30, null, 70, 80])]
                                newWidths[3] = parseInt(e.target.value) || 80
                                updateElement('colWidths', newWidths)
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Subjects Count */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Subjects: {selectedElementData.subjects?.length || 0}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={addSubject}
                            className="h-7 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={fetchSubjects}
                          className="w-full h-7 text-xs"
                        >
                          Load Subjects from DB
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Table properties */}
                {selectedElementData.type === ELEMENT_TYPES.TABLE && (
                  <AccordionItem value="style" className="border-b-0">
                    <AccordionTrigger className="py-2 px-3 text-xs font-semibold hover:no-underline">
                      Table Style
                    </AccordionTrigger>
                    <AccordionContent className="pb-3 px-3 space-y-3">
                      {/* Font Size */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Font Size: {selectedElementData.fontSize || 12}px
                        </Label>
                        <Slider
                          value={[selectedElementData.fontSize || 12]}
                          onValueChange={([value]) => updateElement('fontSize', value)}
                          min={8}
                          max={16}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      {/* Cell Padding */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Cell Padding: {selectedElementData.cellPadding || 6}px
                        </Label>
                        <Slider
                          value={[selectedElementData.cellPadding || 6]}
                          onValueChange={([value]) => updateElement('cellPadding', value)}
                          min={2}
                          max={12}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      {/* Rows and Columns */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Rows</Label>
                          <Input
                            type="number"
                            value={selectedElementData.rows || 3}
                            onChange={(e) => {
                              const newRows = parseInt(e.target.value) || 3
                              const currentData = selectedElementData.data || []
                              const cols = selectedElementData.cols || 3
                              const newData = Array.from({ length: newRows }, (_, i) =>
                                currentData[i] || Array.from({ length: cols }).fill('')
                              )
                              updateElement('rows', newRows)
                              updateElement('data', newData)
                            }}
                            className="h-7 text-xs"
                            min={1}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Columns</Label>
                          <Input
                            type="number"
                            value={selectedElementData.cols || 3}
                            onChange={(e) => {
                              const newCols = parseInt(e.target.value) || 3
                              const currentData = selectedElementData.data || []
                              const rows = selectedElementData.rows || 3
                              const newData = currentData.map(row => {
                                const newRow = [...(row || [])]
                                while (newRow.length < newCols) newRow.push('')
                                return newRow.slice(0, newCols)
                              })
                              const newHeaders = [...(selectedElementData.headers || [])]
                              while (newHeaders.length < newCols) newHeaders.push(`Header ${newHeaders.length + 1}`)
                              updateElement('cols', newCols)
                              updateElement('data', newData)
                              updateElement('headers', newHeaders.slice(0, newCols))
                            }}
                            className="h-7 text-xs"
                            min={1}
                          />
                        </div>
                      </div>
                      {/* Add/Remove Rows and Columns */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground block">Rows</Label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const currentData = selectedElementData.data || []
                                const cols = selectedElementData.cols || 3
                                const rows = selectedElementData.rows || 3
                                const newData = [...currentData, Array.from({ length: cols }).fill('')]
                                updateElement('data', newData)
                                updateElement('rows', rows + 1)
                              }}
                              className="h-7 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Row
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const currentData = selectedElementData.data || []
                                const rows = selectedElementData.rows || 3
                                if (currentData.length > 1) {
                                  const newData = currentData.slice(0, -1)
                                  updateElement('data', newData)
                                  updateElement('rows', rows - 1)
                                }
                              }}
                              className="h-7 text-xs"
                              disabled={(selectedElementData.data || []).length <= 1}
                            >
                              <Minus className="h-3 w-3 mr-1" /> Remove Row
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground block">Columns</Label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const cols = selectedElementData.cols || 3
                                const headers = selectedElementData.headers || []
                                const data = selectedElementData.data || []
                                const newCols = cols + 1
                                const newHeaders = [...headers, `Header ${newCols}`]
                                const newData = data.map(row => [...row, ''])
                                updateElement('cols', newCols)
                                updateElement('headers', newHeaders)
                                updateElement('data', newData)
                              }}
                              className="h-7 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Column
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const cols = selectedElementData.cols || 3
                                const headers = selectedElementData.headers || []
                                const data = selectedElementData.data || []
                                if (cols > 1) {
                                  const newCols = cols - 1
                                  const newHeaders = headers.slice(0, -1)
                                  const newData = data.map(row => row.slice(0, -1))
                                  updateElement('cols', newCols)
                                  updateElement('headers', newHeaders)
                                  updateElement('data', newData)
                                }
                              }}
                              className="h-7 text-xs"
                              disabled={(selectedElementData.cols || 3) <= 1}
                            >
                              <Minus className="h-3 w-3 mr-1" /> Remove Column
                            </Button>
                          </div>
                        </div>
                      </div>
                      {/* Show Header Toggle */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Show Header</Label>
                        <Button
                          size="sm"
                          variant={selectedElementData.showHeader !== false ? 'secondary' : 'outline'}
                          onClick={() => updateElement('showHeader', selectedElementData.showHeader === false ? true : false)}
                          className="h-7 text-xs px-3"
                        >
                          {selectedElementData.showHeader !== false ? 'On' : 'Off'}
                        </Button>
                      </div>
                      {/* Border Color */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Border Color</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-8 gap-2 text-xs justify-start w-full">
                              <div className="w-4 h-4 rounded border" style={{ backgroundColor: selectedElementData.borderColor || '#d1d5db' }} />
                              {selectedElementData.borderColor || '#d1d5db'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" side="left">
                            <div className="grid grid-cols-10 gap-1">
                              {COLOR_PALETTE.map((color) => (
                                <button
                                  key={color}
                                  className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color }}
                                  onClick={() => updateElement('borderColor', color)}
                                />
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {/* Header Background Color */}
                      {selectedElementData.showHeader !== false && (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Header Background</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-8 gap-2 text-xs justify-start w-full">
                                <div className="w-4 h-4 rounded border" style={{ backgroundColor: selectedElementData.headerBgColor || '#f3f4f6' }} />
                                {selectedElementData.headerBgColor || '#f3f4f6'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" side="left">
                              <div className="grid grid-cols-10 gap-1">
                                {COLOR_PALETTE.map((color) => (
                                  <button
                                    key={color}
                                    className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    onClick={() => updateElement('headerBgColor', color)}
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Table Data Fields - Insert Placeholders */}
                {selectedElementData.type === ELEMENT_TYPES.TABLE && (
                  <AccordionItem value="data" className="border-b-0">
                    <AccordionTrigger className="py-2 px-3 text-xs font-semibold hover:no-underline">
                      <span className="flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5" />
                        Insert Data Field
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3 px-3">
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Click on a table cell first, then click a field below to insert:
                      </p>
                      {focusedTableCell.row === null && focusedTableCell.col === null && (
                        <p className="text-[10px] text-white mb-2 bg-black p-2 rounded">
                          ⚠️ Click on a table cell to insert data field
                        </p>
                      )}
                      <div className="space-y-2">
                        {/* Saved Key Sets Selector */}
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Select Field Key Set</Label>
                          <Select
                            value={selectedKeySetId || 'none'}
                            onValueChange={(value) => {
                              if (value === 'none') {
                                loadKeySet(null)
                              } else {
                                const keySet = savedKeySets.find(ks => ks._id === value)
                                if (keySet) {
                                  loadKeySet(keySet)
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder={loadingSavedKeySets ? "Loading..." : "Choose a key set..."} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None (Clear)</SelectItem>
                              {savedKeySets.map((keySet) => {
                                const totalKeys = (keySet.manualKeys?.length || 0) + 
                                                 (keySet.testBasedKeys?.length || 0) + 
                                                 (keySet.calculationKeys?.length || 0)
                                return (
                                  <SelectItem key={keySet._id} value={keySet._id}>
                                    {keySet.name} ({totalKeys} keys)
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {dataFieldKeys.length} field{dataFieldKeys.length !== 1 ? 's' : ''} available
                        </div>
                        <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto">
                          {loadingDataFields ? (
                            <div className="col-span-2 text-center py-2 text-xs text-muted-foreground">
                              Loading fields...
                            </div>
                          ) : dataFieldKeys.length === 0 ? (
                            <div className="col-span-2 text-center py-2 text-xs text-muted-foreground">
                              {selectedKeySetId ? 'No fields in selected key set' : 'Select a key set to load fields'}
                            </div>
                          ) : (
                            dataFieldKeys.map((field) => (
                              <Button
                                key={field.key}
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] justify-start px-2"
                                onClick={() => insertDataPlaceholder(field.key)}
                                title={`Insert {{${field.key}}}`}
                                disabled={focusedTableCell.row === null && focusedTableCell.col === null}
                              >
                                {renderIcon(field.icon)}
                                <span className="truncate">{field.label}</span>
                              </Button>
                            ))
                          )}
                        </div>
                      </div>
                      {selectedStudent && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-[10px] text-muted-foreground">Preview with: {selectedStudent.studentName}</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Student Info properties */}
                {(selectedElementData.type === ELEMENT_TYPES.STUDENT_NAME ||
                  selectedElementData.type === ELEMENT_TYPES.STUDENT_CLASS ||
                  selectedElementData.type === ELEMENT_TYPES.ROLL_NUMBER ||
                  selectedElementData.type === ELEMENT_TYPES.FATHER_NAME ||
                  selectedElementData.type === ELEMENT_TYPES.DOB) && (
                    <AccordionItem value="style" className="border-b-0">
                      <AccordionTrigger className="py-2 px-3 text-xs font-semibold hover:no-underline">
                        Field Style
                      </AccordionTrigger>
                      <AccordionContent className="pb-3 px-3 space-y-3">
                        {/* Prefix Label */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Label</Label>
                          <Input
                            value={selectedElementData.prefix || ''}
                            onChange={(e) => updateElement('prefix', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Label prefix..."
                          />
                        </div>
                        {/* Font Size */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-8">{selectedElementData.fontSize || 12}px</span>
                          <Slider
                            value={[selectedElementData.fontSize || 12]}
                            onValueChange={([value]) => updateElement('fontSize', value)}
                            min={8}
                            max={24}
                            step={1}
                            className="flex-1"
                          />
                        </div>
                        {/* Show Underline Toggle */}
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Show Underline</Label>
                          <Button
                            size="sm"
                            variant={selectedElementData.showUnderline !== false ? 'secondary' : 'outline'}
                            onClick={() => updateElement('showUnderline', selectedElementData.showUnderline === false ? true : false)}
                            className="h-7 text-xs px-3"
                          >
                            {selectedElementData.showUnderline !== false ? 'On' : 'Off'}
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                {/* Box/Circle properties */}
                {(selectedElementData.type === ELEMENT_TYPES.BOX ||
                  selectedElementData.type === ELEMENT_TYPES.CIRCLE) && (
                    <AccordionItem value="style" className="border-b-0">
                      <AccordionTrigger className="py-2 px-3 text-xs font-semibold hover:no-underline">
                        Fill & Border
                      </AccordionTrigger>
                      <AccordionContent className="pb-3 px-3">
                        <div className="grid grid-cols-2 gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-8 gap-2 text-xs justify-start">
                                <div className="w-4 h-4 rounded border" style={{ backgroundColor: selectedElementData.backgroundColor }} />
                                Fill
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" side="left">
                              <div className="grid grid-cols-10 gap-1">
                                {COLOR_PALETTE.map((color) => (
                                  <button
                                    key={color}
                                    className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    onClick={() => updateElement('backgroundColor', color)}
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-8 gap-2 text-xs justify-start">
                                <div className="w-4 h-4 rounded border" style={{ backgroundColor: selectedElementData.borderColor }} />
                                Border
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" side="left">
                              <div className="grid grid-cols-10 gap-1">
                                {COLOR_PALETTE.map((color) => (
                                  <button
                                    key={color}
                                    className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    onClick={() => updateElement('borderColor', color)}
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                {/* Logo/Photo upload */}
                {(selectedElementData.type === ELEMENT_TYPES.LOGO ||
                  selectedElementData.type === ELEMENT_TYPES.PHOTO) && (
                    <AccordionItem value="style" className="border-b-0">
                      <AccordionTrigger className="py-2 px-3 text-xs font-semibold hover:no-underline">
                        Image
                      </AccordionTrigger>
                      <AccordionContent className="pb-3 px-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Upload Image
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                {/* Actions */}
                {/* Data Fields - Insert Placeholders */}
                {(selectedElementData.type === ELEMENT_TYPES.TEXT ||
                  selectedElementData.type === ELEMENT_TYPES.HEADING ||
                  selectedElementData.type === ELEMENT_TYPES.SIGNATURE ||
                  selectedElementData.type === ELEMENT_TYPES.INPUT_FIELD) && (
                    <AccordionItem value="data" className="border-b-0">
                      <AccordionTrigger className="py-2 px-3 text-xs font-semibold hover:no-underline">
                        <span className="flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5" />
                          Insert Data Field
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3 px-3">
                        <p className="text-[10px] text-muted-foreground mb-2">Click to add placeholder:</p>
                        <div className="space-y-2">
                          {/* Saved Key Sets Selector */}
                          <div>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">Select Field Key Set</Label>
                            <Select
                              value={selectedKeySetId || 'none'}
                              onValueChange={(value) => {
                                if (value === 'none') {
                                  loadKeySet(null)
                                } else {
                                  const keySet = savedKeySets.find(ks => ks._id === value)
                                  if (keySet) {
                                    loadKeySet(keySet)
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={loadingSavedKeySets ? "Loading..." : "Choose a key set..."} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None (Clear)</SelectItem>
                                {savedKeySets.map((keySet) => {
                                  const totalKeys = (keySet.manualKeys?.length || 0) + 
                                                   (keySet.testBasedKeys?.length || 0) + 
                                                   (keySet.calculationKeys?.length || 0)
                                  return (
                                    <SelectItem key={keySet._id} value={keySet._id}>
                                      {keySet.name} ({totalKeys} keys)
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {dataFieldKeys.length} field{dataFieldKeys.length !== 1 ? 's' : ''} available
                          </div>
                          <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                            {loadingDataFields ? (
                              <div className="col-span-2 text-center py-2 text-xs text-muted-foreground">
                                Loading fields...
                              </div>
                            ) : dataFieldKeys.length === 0 ? (
                              <div className="col-span-2 text-center py-2 text-xs text-muted-foreground">
                                {selectedKeySetId ? 'No fields in selected key set' : 'Select a key set to load fields'}
                              </div>
                            ) : (
                              dataFieldKeys.map((field) => (
                                <Button
                                  key={field.key}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] justify-start px-2"
                                  onClick={() => insertDataPlaceholder(field.key)}
                                  title={`Insert {{${field.key}}}`}
                                >
                                  {renderIcon(field.icon)}
                                  <span className="truncate">{field.label}</span>
                                </Button>
                              ))
                            )}
                          </div>
                        </div>
                        {selectedStudent && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-[10px] text-muted-foreground">Preview with: {selectedStudent.studentName}</p>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                <AccordionItem value="actions" className="border-b-0">
                  <AccordionTrigger className="py-2 px-3 text-xs font-semibold hover:no-underline">
                    Actions
                  </AccordionTrigger>
                  <AccordionContent className="pb-3 px-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" onClick={() => moveElementLayer('up')} className="h-8 text-xs">
                        <ChevronUp className="h-4 w-4 mr-1.5" />
                        Up
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => moveElementLayer('down')} className="h-8 text-xs">
                        <ChevronDown className="h-4 w-4 mr-1.5" />
                        Down
                      </Button>
                      <Button size="sm" variant="outline" onClick={duplicateElement} className="h-8 text-xs">
                        <Copy className="h-4 w-4 mr-1.5" />
                        Copy
                      </Button>
                      <Button size="sm" variant="destructive" onClick={deleteElement} className="h-8 text-xs">
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12 px-4">
                <Layers className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm font-medium">Select element</p>
                <p className="text-xs text-muted-foreground/70 mt-1">to edit properties</p>
              </div>
            )}
          </div>
        </div>

      </SidebarInset>

      {/* AI Chat Floating Button & Panel - Bottom right corner */}
      <div className="fixed bottom-6 right-[280px] z-[100]">
        {/* Chat Panel */}
        {isChatOpen && (
          <div className="absolute bottom-16 right-0 w-80 bg-background border rounded-xl shadow-2xl overflow-hidden mb-2">
            {/* Chat Header */}
            <div className="bg-neutral-900 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">AI Template Generator</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-white hover:bg-white/20"
                onClick={() => setIsChatOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat Messages */}
            <div className="h-72 overflow-y-auto p-3 space-y-3 bg-muted/30">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user'
                        ? 'bg-neutral-800 text-white'
                        : 'bg-muted'
                      }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1 text-foreground font-medium text-xs">
                        <Bot className="h-3.5 w-3.5" />
                        AI Assistant
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground">Generating template...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  placeholder="Describe your marksheet..."
                  className="flex-1 h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAIGenerate()
                    }
                  }}
                  disabled={isGenerating}
                />
                <Button
                  size="sm"
                  className="h-9 px-3 bg-neutral-900 hover:bg-neutral-800 text-white"
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !chatPrompt.trim()}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Button */}
        <Button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="h-14 w-14 rounded-full shadow-lg bg-neutral-900 hover:bg-neutral-800 text-white"
        >
          {isChatOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      </div>
    </SidebarProvider>
  )
}
