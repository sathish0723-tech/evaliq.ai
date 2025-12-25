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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Send, BookOpen, Calendar, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function TakeTestPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params.testId
  const [testData, setTestData] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [answers, setAnswers] = useState({})
  const { toast } = useToast()

  useEffect(() => {
    if (testId) {
      fetchTestData()
      fetchQuestions()
    }
  }, [testId])

  const isScheduledTimeReached = (test) => {
    if (!test.date) return false
    
    const now = new Date()
    
    // Parse the scheduled date (assuming YYYY-MM-DD format)
    const dateParts = test.date.split('-')
    if (dateParts.length !== 3) return false
    
    const scheduledDate = new Date()
    scheduledDate.setFullYear(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
    
    // If time is provided, combine date and time
    if (test.time && test.time.trim()) {
      const [hours, minutes] = test.time.split(':').map(Number)
      scheduledDate.setHours(hours || 0, minutes || 0, 0, 0)
    } else {
      // If no time, set to start of day (00:00:00) in local timezone
      scheduledDate.setHours(0, 0, 0, 0)
    }
    
    // Only show if current time is >= scheduled time
    return now >= scheduledDate
  }

  const fetchTestData = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/tests')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const foundTest = data.tests?.find(t => t.testId === testId)
        if (!foundTest) {
          toast({
            title: "Error",
            description: "Test not found",
            variant: "destructive",
          })
          router.push('/dashboard')
          return
        }
        if (!foundTest.published) {
          toast({
            title: "Error",
            description: "This test is not available",
            variant: "destructive",
          })
          router.push('/dashboard')
          return
        }
        // Check if scheduled time has been reached
        if (!isScheduledTimeReached(foundTest)) {
          toast({
            title: "Test Not Available",
            description: `This test is scheduled for ${formatDateTime(foundTest.date, foundTest.time)}. Please wait until the scheduled time.`,
            variant: "destructive",
          })
          router.push('/dashboard')
          return
        }
        setTestData(foundTest)
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
        const sortedQuestions = (data.questions || []).sort((a, b) => (a.order || 0) - (b.order || 0))
        setQuestions(sortedQuestions)
        
        // Initialize answers object
        const initialAnswers = {}
        sortedQuestions.forEach(q => {
          if (q.type === 'multiple_choice') {
            initialAnswers[q.questionId] = ''
          } else if (q.type === 'short_answer') {
            initialAnswers[q.questionId] = ''
          } else if (q.type === 'fill_in_blanks') {
            initialAnswers[q.questionId] = q.fillInBlanks.map(() => '')
          }
        })
        setAnswers(initialAnswers)
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

  const handleAnswerChange = (questionId, value, blankIndex = null) => {
    setAnswers(prev => {
      const newAnswers = { ...prev }
      if (blankIndex !== null) {
        // Fill in the blanks
        if (!Array.isArray(newAnswers[questionId])) {
          newAnswers[questionId] = []
        }
        newAnswers[questionId][blankIndex] = value
      } else {
        // Single answer
        newAnswers[questionId] = value
      }
      return newAnswers
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate all questions are answered
    const unansweredQuestions = questions.filter(q => {
      if (q.type === 'fill_in_blanks') {
        const answer = answers[q.questionId]
        return !answer || !Array.isArray(answer) || answer.some(a => !a || !a.trim())
      } else {
        const answer = answers[q.questionId]
        return !answer || (typeof answer === 'string' && !answer.trim())
      }
    })

    if (unansweredQuestions.length > 0) {
      toast({
        title: "Error",
        description: `Please answer all questions. ${unansweredQuestions.length} question(s) unanswered.`,
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      
      // Format answers for submission
      const formattedAnswers = questions.map(q => ({
        questionId: q.questionId,
        type: q.type,
        answer: q.type === 'fill_in_blanks' 
          ? answers[q.questionId] 
          : answers[q.questionId],
      }))

      const response = await fetch('/api/test-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          testId,
          answers: formattedAnswers,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Test submitted successfully",
        })
        router.push('/dashboard')
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to submit test",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error submitting test:', error)
      toast({
        title: "Error",
        description: "Failed to submit test",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
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

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    if (timeString) {
      return `${dateStr} at ${timeString}`
    }
    return dateStr
  }

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-muted-foreground">Loading test...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (!testData || questions.length === 0) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Test not found or no questions available</p>
              <Button onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
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
                  <BreadcrumbPage>{testData.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight">
                {testData.name}
              </h1>
            </div>
            <div className="ml-10">
              {testData.status === 'scheduled' && (testData.date || testData.time) && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Scheduled Test
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {formatDateTime(testData.date, testData.time)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {testData.status !== 'scheduled' && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {testData.date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(testData.date)}</span>
                    </div>
                  )}
                  {testData.time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{testData.time}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question, index) => (
              <Card key={question.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">
                    Question {index + 1} {question.points && `(${question.points} mark${question.points !== 1 ? 's' : ''})`}
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    {question.question}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {question.type === 'multiple_choice' && (
                    <div className="space-y-3">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`q${question.questionId}_opt${optIndex}`}
                            name={`question_${question.questionId}`}
                            value={option}
                            checked={answers[question.questionId] === option}
                            onChange={(e) => handleAnswerChange(question.questionId, e.target.value)}
                            className="h-4 w-4 text-primary"
                            required
                          />
                          <Label
                            htmlFor={`q${question.questionId}_opt${optIndex}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === 'short_answer' && (
                    <div className="space-y-2">
                      <Textarea
                        value={answers[question.questionId] || ''}
                        onChange={(e) => handleAnswerChange(question.questionId, e.target.value)}
                        placeholder="Type your answer here..."
                        rows={4}
                        className="w-full"
                        required
                      />
                    </div>
                  )}

                  {question.type === 'fill_in_blanks' && (
                    <div className="space-y-3">
                      {question.fillInBlanks.map((blank, blankIndex) => (
                        <div key={blankIndex} className="space-y-2">
                          <Label className="text-sm font-medium">
                            Fill in: "{blank.text}"
                          </Label>
                          <Input
                            value={answers[question.questionId]?.[blankIndex] || ''}
                            onChange={(e) => handleAnswerChange(question.questionId, e.target.value, blankIndex)}
                            placeholder="Enter your answer"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="mr-2">Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Test
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

