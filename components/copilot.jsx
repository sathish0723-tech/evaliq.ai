"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSelectedBatch } from '@/lib/utils-batch'
import { Button } from '@/components/ui/button'
import { 
  Send, 
  Loader2,
  X,
  ChevronRight,
  Sparkles,
  FileText,
  Wand2,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export default function Copilot({ isOpen, onClose, selectedStudents = [], onStudentRemove }) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [selectedTool, setSelectedTool] = useState(null)
  const [studentChips, setStudentChips] = useState([])
  const [messages, setMessages] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const { toast } = useToast()
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      fetchUserName()
      inputRef.current?.focus()
    } else {
      // Reset messages when copilot closes
      setMessages([])
      setCurrentChatId(null)
    }
  }, [isOpen])

  useEffect(() => {
    // Scroll to bottom when new messages are added
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (selectedStudents && selectedStudents.length > 0) {
      setStudentChips(selectedStudents)
    } else {
      setStudentChips([])
    }
  }, [selectedStudents])

  const fetchUserName = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setUserName(data.user?.name?.split(' ')[0] || 'User')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const generateConversationTitle = (userInput) => {
    const trimmed = userInput.trim()
    if (!trimmed) return 'New Conversation'
    
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
    
    if (capitalized.length > 50) {
      return capitalized.substring(0, 47) + '...'
    }
    
    return capitalized
  }

  const handleSend = async () => {
    const textToSend = input.trim()
    if (!textToSend || isLoading) return

    setIsLoading(true)

    try {
      const batch = getSelectedBatch()
      let chatId = currentChatId

      // Create new conversation only if we don't have one
      if (!chatId) {
        const conversationTitle = generateConversationTitle(textToSend)

        const createResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            title: conversationTitle,
            selectedTool: selectedTool,
            batch: batch,
          }),
        })

        if (!createResponse.ok) {
          throw new Error('Failed to create conversation')
        }

        const createData = await createResponse.json()
        chatId = createData.conversation.chatId
      }

      const userMessage = {
        role: 'user',
        content: textToSend,
        timestamp: new Date(),
      }

      const deepSearch = selectedTool === 'deep-search'
      const report = selectedTool === 'report'

      // Include existing messages for context
      const allMessages = [...messages, userMessage]

      const backendResponse = await fetch('/api/copilot/student-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          chatId: chatId,
          message: textToSend,
          messages: allMessages,
          selectedTool: selectedTool,
          batch: batch,
          'deep-search': deepSearch,
          'report': report,
          selectedStudents: studentChips.length > 0 ? studentChips : [],
        }),
      })

      if (!backendResponse.ok) {
        throw new Error('Failed to get response from backend')
      }

      const backendData = await backendResponse.json()
      const assistantContent = backendData.response || backendData.message || backendData.content || 'Sorry, I could not generate a response.'
      
      const assistantMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      }
      
      const newMessages = [userMessage, assistantMessage]
      
      // Update local messages state
      setMessages(prev => {
        const updatedMessages = [...prev, ...newMessages]
        
        // Save to backend with updated messages
        fetch('/api/conversations', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            chatId: chatId,
            messages: updatedMessages,
            selectedTool: selectedTool,
            batch: batch,
          }),
        }).catch(err => {
          console.error('Error saving conversation:', err)
        })
        
        return updatedMessages
      })
      setCurrentChatId(chatId)
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setInput('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestedActions = [
    {
      icon: Wand2,
      title: "Analyze Students",
      description: "Get insights about student performance and statistics",
    },
    {
      icon: FileText,
      title: "Generate Report",
      description: "Create detailed reports for selected students",
    },
  ]

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Copilot Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[400px] bg-background border-l shadow-lg z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <h2 className="font-semibold">Copilot</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  How can I help you today?
                </h3>
              </div>

              {/* Suggested Actions */}
              <div className="grid grid-cols-1 gap-3 mb-6">
                {suggestedActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(action.description)}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <action.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1">{action.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                    {message.timestamp && (
                      <div className={`text-xs mt-1 ${
                        message.role === 'user' 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <div className="rounded-lg border border-input bg-muted/30 overflow-hidden">
            {/* Student Chips */}
            {studentChips.length > 0 && (
              <div className="px-3 pt-3 pb-2 flex flex-wrap gap-2 border-b border-border/50">
                {studentChips.map((student, index) => (
                  <Badge
                    key={student.id || index}
                    variant="secondary"
                    className="flex items-center gap-1.5 pr-1.5"
                  >
                    <span>{student.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Remove from local state
                        setStudentChips(studentChips.filter((_, i) => i !== index))
                        // Notify parent to uncheck checkbox
                        if (onStudentRemove && student.id) {
                          onStudentRemove(student.id)
                        }
                      }}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Use @ to refer a student or filter"
              className="w-full text-sm pr-12 pl-4 pt-3 pb-2 resize-none overflow-y-auto bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              rows={3}
              style={{ 
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                minHeight: '4rem',
                maxHeight: '8rem'
              }}
            />
            <div className="px-3 py-2 flex items-center justify-between bg-muted/30">
              <div>
                {selectedTool ? (
                  <div className="flex items-center gap-2">
                    <div className="h-7 px-2.5 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded-lg flex items-center gap-2 text-xs">
                      <span>
                        {selectedTool === 'deep-search' ? 'Deep Search' : selectedTool === 'report' ? 'Report' : selectedTool}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-white/20 text-white p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTool(null)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Select value={selectedTool || ""} onValueChange={setSelectedTool}>
                    <SelectTrigger className="h-7 px-2.5 py-1 border-0 bg-muted hover:bg-muted/80 rounded-lg gap-2 text-xs">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3">
                        <path d="M5.5 3C4.67157 3 4 3.67157 4 4.5C4 5.32843 4.67157 6 5.5 6C6.32843 6 7 5.32843 7 4.5C7 3.67157 6.32843 3 5.5 3ZM3 5C3.01671 5 3.03323 4.99918 3.04952 4.99758C3.28022 6.1399 4.28967 7 5.5 7C6.71033 7 7.71978 6.1399 7.95048 4.99758C7.96677 4.99918 7.98329 5 8 5H13.5C13.7761 5 14 4.77614 14 4.5C14 4.22386 13.7761 4 13.5 4H8C7.98329 4 7.96677 4.00082 7.95048 4.00242C7.71978 2.86009 6.71033 2 5.5 2C4.28967 2 3.28022 2.86009 3.04952 4.00242C3.03323 4.00082 3.01671 4 3 4H1.5C1.22386 4 1 4.22386 1 4.5C1 4.77614 1.22386 5 1.5 5H3ZM11.9505 10.9976C11.7198 12.1399 10.7103 13 9.5 13C8.28967 13 7.28022 12.1399 7.04952 10.9976C7.03323 10.9992 7.01671 11 7 11H1.5C1.22386 11 1 10.7761 1 10.5C1 10.2239 1.22386 10 1.5 10H7C7.01671 10 7.03323 10.0008 7.04952 10.0024C7.28022 8.8601 8.28967 8 9.5 8C10.7103 8 11.7198 8.8601 11.9505 10.0024C11.9668 10.0008 11.9833 10 12 10H13.5C13.7761 10 14 10.2239 14 10.5C14 10.7761 13.7761 11 13.5 11H12C11.9833 11 11.9668 10.9992 11.9505 10.9976ZM8 10.5C8 9.67157 8.67157 9 9.5 9C10.3284 9 11 9.67157 11 10.5C11 11.3284 10.3284 12 9.5 12C8.67157 12 8 11.3284 8 10.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                      <span>Tools</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem 
                        value="deep-search"
                        className={selectedTool === "deep-search" ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" : ""}
                      >
                        Deep Search
                      </SelectItem>
                      <SelectItem 
                        value="report"
                        className={selectedTool === "report" ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" : ""}
                      >
                        Report
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-8 w-8"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

