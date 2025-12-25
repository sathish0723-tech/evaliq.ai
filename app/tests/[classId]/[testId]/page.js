"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppSidebar } from '@/components/app-sidebar'
import { useApp } from '@/contexts/app-context'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, ArrowLeft, Trash2, Pencil, BookOpen, Calendar, Clock, Globe, Eye, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'short_answer', label: 'Question & Answer' },
  { value: 'fill_in_blanks', label: 'Fill in the Blanks' },
]

export default function TestQuestionsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useApp()
  const classId = params.classId
  const testId = params.testId
  const isStudent = user?.role === 'student'
  const [questions, setQuestions] = useState([])
  const [testData, setTestData] = useState(null)
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [creating, setCreating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const { toast } = useToast()

  const [questionFormData, setQuestionFormData] = useState({
    type: 'multiple_choice',
    question: '',
    options: ['', ''],
    correctAnswer: '',
    fillInBlanks: [{ text: '', answer: '' }],
    points: 1,
  })

  useEffect(() => {
    // Redirect students away from this page - they should use the take test page
    if (isStudent) {
      router.push('/tests')
      return
    }
    if (testId && classId) {
      fetchTestData()
      fetchQuestions()
    }
  }, [testId, classId, isStudent, router])

  const fetchTestData = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/tests', { classId })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const foundTest = data.tests?.find(t => t.testId === testId)
        setTestData(foundTest)
        
        // Fetch class data
        const classesUrl = buildUrlWithBatch('/api/classes')
        const classesResponse = await fetch(classesUrl, {
          credentials: 'include',
        })
        if (classesResponse.ok) {
          const classesData = await classesResponse.json()
          const foundClass = classesData.classes?.find(c => c.classId === classId)
          setClassData(foundClass)
        }
      }
    } catch (error) {
      console.error('Error fetching test data:', error)
    }
  }

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/questions?testId=${testId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
      } else {
        console.error('Failed to fetch questions')
        setQuestions([])
      }
    } catch (error) {
      console.error('Error fetching questions:', error)
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreateDialog = (question = null) => {
    if (question) {
      setEditingQuestion(question)
      setQuestionFormData({
        type: question.type,
        question: question.question,
        options: question.options && question.options.length > 0 ? question.options : ['', ''],
        correctAnswer: question.correctAnswer || '',
        fillInBlanks: question.fillInBlanks && question.fillInBlanks.length > 0 
          ? question.fillInBlanks 
          : [{ text: '', answer: '' }],
        points: question.points || 1,
      })
    } else {
      setEditingQuestion(null)
      setQuestionFormData({
        type: 'multiple_choice',
        question: '',
        options: ['', ''],
        correctAnswer: '',
        fillInBlanks: [{ text: '', answer: '' }],
        points: 1,
      })
    }
    setIsCreateDialogOpen(true)
  }

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false)
    setEditingQuestion(null)
    setQuestionFormData({
      type: 'multiple_choice',
      question: '',
      options: ['', ''],
      correctAnswer: '',
      fillInBlanks: [{ text: '', answer: '' }],
      points: 1,
    })
  }

  const handleAddOption = () => {
    setQuestionFormData(prev => ({
      ...prev,
      options: [...prev.options, ''],
    }))
  }

  const handleRemoveOption = (index) => {
    setQuestionFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }))
  }

  const handleOptionChange = (index, value) => {
    setQuestionFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt),
    }))
  }

  const handleAddFillInBlank = () => {
    setQuestionFormData(prev => ({
      ...prev,
      fillInBlanks: [...prev.fillInBlanks, { text: '', answer: '' }],
    }))
  }

  const handleRemoveFillInBlank = (index) => {
    setQuestionFormData(prev => ({
      ...prev,
      fillInBlanks: prev.fillInBlanks.filter((_, i) => i !== index),
    }))
  }

  const handleFillInBlankChange = (index, field, value) => {
    setQuestionFormData(prev => ({
      ...prev,
      fillInBlanks: prev.fillInBlanks.map((blank, i) => 
        i === index ? { ...blank, [field]: value } : blank
      ),
    }))
  }

  const handleTypeChange = (newType) => {
    setQuestionFormData(prev => ({
      ...prev,
      type: newType,
      // Reset type-specific fields
      options: newType === 'multiple_choice' ? ['', ''] : [],
      correctAnswer: newType === 'short_answer' ? prev.correctAnswer : (newType === 'multiple_choice' ? '' : ''),
      fillInBlanks: newType === 'fill_in_blanks' ? [{ text: '', answer: '' }] : [],
    }))
  }

  const handleSubmitQuestion = async (e) => {
    e.preventDefault()
    
    if (!questionFormData.question.trim()) {
      toast({
        title: "Error",
        description: "Question text is required",
        variant: "destructive",
      })
      return
    }

    if (questionFormData.type === 'multiple_choice') {
      if (questionFormData.options.length < 2) {
        toast({
          title: "Error",
          description: "Multiple choice questions require at least 2 options",
          variant: "destructive",
        })
        return
      }
      if (questionFormData.options.some(opt => !opt.trim())) {
        toast({
          title: "Error",
          description: "All options must be filled",
          variant: "destructive",
        })
        return
      }
      if (!questionFormData.correctAnswer) {
        toast({
          title: "Error",
          description: "Please select a correct answer",
          variant: "destructive",
        })
        return
      }
    }

    if (questionFormData.type === 'short_answer' && !questionFormData.correctAnswer.trim()) {
      toast({
        title: "Error",
        description: "Correct answer is required",
        variant: "destructive",
      })
      return
    }

    if (questionFormData.type === 'fill_in_blanks') {
      if (questionFormData.fillInBlanks.length === 0) {
        toast({
          title: "Error",
          description: "At least one blank is required",
          variant: "destructive",
        })
        return
      }
      if (questionFormData.fillInBlanks.some(blank => !blank.text.trim() || !blank.answer.trim())) {
        toast({
          title: "Error",
          description: "All blanks must have text and answer",
          variant: "destructive",
        })
        return
      }
    }

    try {
      setCreating(true)
      const url = '/api/questions'
      const method = editingQuestion ? 'PUT' : 'POST'
      const body = editingQuestion
        ? {
            id: editingQuestion.id,
            type: questionFormData.type,
            question: questionFormData.question.trim(),
            options: questionFormData.type === 'multiple_choice' ? questionFormData.options : [],
            correctAnswer: questionFormData.type === 'multiple_choice' || questionFormData.type === 'short_answer' 
              ? questionFormData.correctAnswer 
              : '',
            fillInBlanks: questionFormData.type === 'fill_in_blanks' ? questionFormData.fillInBlanks : [],
            points: questionFormData.points || 1,
          }
        : {
            testId: testId,
            classId: classId,
            type: questionFormData.type,
            question: questionFormData.question.trim(),
            options: questionFormData.type === 'multiple_choice' ? questionFormData.options : [],
            correctAnswer: questionFormData.type === 'multiple_choice' || questionFormData.type === 'short_answer' 
              ? questionFormData.correctAnswer 
              : '',
            fillInBlanks: questionFormData.type === 'fill_in_blanks' ? questionFormData.fillInBlanks : [],
            points: questionFormData.points || 1,
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
          description: editingQuestion ? "Question updated successfully" : "Question created successfully",
        })
        handleCloseCreateDialog()
        fetchQuestions()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save question",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving question:', error)
      toast({
        title: "Error",
        description: "Failed to save question",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const response = await fetch(`/api/questions?id=${questionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Question deleted successfully",
        })
        fetchQuestions()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete question",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting question:', error)
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      })
    }
  }

  const handlePublishToggle = async () => {
    if (!testData) return

    const newPublishedStatus = !testData.published

    if (newPublishedStatus && questions.length === 0) {
      toast({
        title: "Error",
        description: "Cannot publish test without questions",
        variant: "destructive",
      })
      return
    }

    try {
      setPublishing(true)
      const response = await fetch('/api/tests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: testData.id,
          published: newPublishedStatus,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: newPublishedStatus ? "Test published successfully" : "Test unpublished successfully",
        })
        fetchTestData()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update test status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error publishing test:', error)
      toast({
        title: "Error",
        description: "Failed to update test status",
        variant: "destructive",
      })
    } finally {
      setPublishing(false)
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    if (!testData) return

    try {
      setUpdatingStatus(true)
      const response = await fetch('/api/tests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: testData.id,
          status: newStatus,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Test status updated to ${newStatus}`,
        })
        fetchTestData()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update test status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating test status:', error)
      toast({
        title: "Error",
        description: "Failed to update test status",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    }
    const config = statusConfig[status] || statusConfig.scheduled
    const Icon = config.icon
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </div>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getQuestionTypeLabel = (type) => {
    const typeObj = QUESTION_TYPES.find(t => t.value === type)
    return typeObj?.label || type
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/tests">
                    Tests
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={`/tests/${classId}`}>
                    {classData?.name || 'Class'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{testData?.name || 'Test'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/tests/${classId}`)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-semibold tracking-tight">
                  {testData?.name || 'Test'} - Questions
                </h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {testData?.status && getStatusBadge(testData.status)}
                {testData?.date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(testData.date)}</span>
                  </div>
                )}
                {testData?.time && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{testData.time}</span>
                  </div>
                )}
                {testData?.published && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Globe className="h-3 w-3" />
                    <span>Published</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {testData && (
                <>
                  <Button
                    variant={testData.published ? "outline" : "default"}
                    onClick={handlePublishToggle}
                    disabled={publishing || questions.length === 0}
                  >
                    {testData.published ? (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-2" />
                        Publish
                      </>
                    )}
                  </Button>
                  {testData.status !== 'completed' && (
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate('completed')}
                      disabled={updatingStatus}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </Button>
                  )}
                </>
              )}
              <Button onClick={() => handleOpenCreateDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading questions...</div>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No questions found. Add your first question.</p>
                <Button onClick={() => handleOpenCreateDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Question
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {questions.map((question, index) => (
                <Card key={question.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-medium mb-2">
                          Question {index + 1}
                        </CardTitle>
                        <CardDescription className="text-sm mb-2">
                          {question.question}
                        </CardDescription>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-2 py-1 bg-secondary rounded">
                            {getQuestionTypeLabel(question.type)}
                          </span>
                          <span>{question.points} point{question.points !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenCreateDialog(question)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {question.type === 'multiple_choice' && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Options:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {question.options.map((option, optIndex) => (
                            <li key={optIndex} className={option === question.correctAnswer ? 'text-green-600 font-medium' : ''}>
                              {option} {option === question.correctAnswer && '(Correct)'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {question.type === 'short_answer' && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Correct Answer:</p>
                        <p className="text-sm">{question.correctAnswer}</p>
                      </div>
                    )}
                    {question.type === 'fill_in_blanks' && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Blanks:</p>
                        <div className="space-y-1">
                          {question.fillInBlanks.map((blank, blankIndex) => (
                            <div key={blankIndex} className="text-sm">
                              <span className="font-medium">"{blank.text}"</span>
                              <span className="text-muted-foreground"> → {blank.answer}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create/Edit Question Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingQuestion ? 'Edit Question' : 'Add New Question'}
                </DialogTitle>
                <DialogDescription>
                  Create a question for this test. Choose the question type and fill in the details.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitQuestion}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="questionType">Question Type *</Label>
                    <Select
                      value={questionFormData.type}
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger id="questionType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="question">Question *</Label>
                    <Textarea
                      id="question"
                      value={questionFormData.question}
                      onChange={(e) => setQuestionFormData(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="Enter your question here..."
                      rows={3}
                      required
                    />
                  </div>

                  {questionFormData.type === 'multiple_choice' && (
                    <>
                      <div className="grid gap-2">
                        <Label>Options *</Label>
                        {questionFormData.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => handleOptionChange(index, e.target.value)}
                              placeholder={`Option ${index + 1}`}
                              required
                            />
                            {questionFormData.options.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveOption(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddOption}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="correctAnswer">Correct Answer *</Label>
                        <Select
                          value={questionFormData.correctAnswer}
                          onValueChange={(value) => setQuestionFormData(prev => ({ ...prev, correctAnswer: value }))}
                        >
                          <SelectTrigger id="correctAnswer">
                            <SelectValue placeholder="Select correct answer" />
                          </SelectTrigger>
                          <SelectContent>
                            {questionFormData.options
                              .filter(opt => opt && opt.trim() !== '')
                              .map((option, index) => (
                                <SelectItem key={index} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {questionFormData.type === 'short_answer' && (
                    <div className="grid gap-2">
                      <Label htmlFor="correctAnswer">Correct Answer *</Label>
                      <Input
                        id="correctAnswer"
                        value={questionFormData.correctAnswer}
                        onChange={(e) => setQuestionFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                        placeholder="Enter the correct answer"
                        required
                      />
                    </div>
                  )}

                  {questionFormData.type === 'fill_in_blanks' && (
                    <div className="grid gap-2">
                      <Label>Fill in the Blanks *</Label>
                      {questionFormData.fillInBlanks.map((blank, index) => (
                        <div key={index} className="space-y-2 p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Blank {index + 1}</span>
                            {questionFormData.fillInBlanks.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveFillInBlank(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <Input
                            value={blank.text}
                            onChange={(e) => handleFillInBlankChange(index, 'text', e.target.value)}
                            placeholder="Text with blank (e.g., The capital of France is ___)"
                            required
                          />
                          <Input
                            value={blank.answer}
                            onChange={(e) => handleFillInBlankChange(index, 'answer', e.target.value)}
                            placeholder="Correct answer for this blank"
                            required
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddFillInBlank}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Blank
                      </Button>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="points">Points *</Label>
                    <Input
                      id="points"
                      type="number"
                      min="1"
                      value={questionFormData.points}
                      onChange={(e) => setQuestionFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseCreateDialog}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Saving...' : (editingQuestion ? 'Update Question' : 'Add Question')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

