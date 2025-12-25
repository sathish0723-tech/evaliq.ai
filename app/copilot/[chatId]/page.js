"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Send, 
  Loader2,
  Maximize2,
  Plus,
  X,
  FileText,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getSelectedBatch } from '@/lib/utils-batch'
import ReportViewer from '@/components/report-viewer'
import { Card } from '@/components/ui/card'

export default function CopilotChatPage() {
  const router = useRouter()
  const params = useParams()
  const chatId = String(params.chatId || '')
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTool, setSelectedTool] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(true)
  const [conversations, setConversations] = useState([])
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [showReportView, setShowReportView] = useState(false)
  const [reportContent, setReportContent] = useState(null)
  const [reportTitle, setReportTitle] = useState(null)
  const [reportTimestamp, setReportTimestamp] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [reportMessageIds, setReportMessageIds] = useState(new Set())
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (chatId) {
      loadConversation()
      loadConversations()
    }
  }, [chatId])

  const loadConversation = async () => {
    try {
      setIsLoadingConversation(true)
      const response = await fetch(`/api/conversations?chatId=${chatId}`, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        const conversation = data.conversation
        
        if (conversation) {
          setSelectedTool(conversation.selectedTool)
          
          // Convert database messages to component format
          const loadedMessages = conversation.messages.map((msg, index) => ({
            id: Date.now() + index,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          }))
          
          setMessages(loadedMessages)
          
          // Identify report messages if tool is deep-search or report
          if (conversation.selectedTool === 'deep-search' || conversation.selectedTool === 'report') {
            const reportIds = new Set()
            loadedMessages.forEach((msg) => {
              if (msg.role === 'assistant' && msg.content && msg.content.length > 200) {
                reportIds.add(msg.id)
              }
            })
            setReportMessageIds(reportIds)
          }
        }
      } else {
        console.error('Failed to load conversation')
        // Redirect to main page if conversation not found
        router.push('/copilot')
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
      router.push('/copilot')
    } finally {
      setIsLoadingConversation(false)
    }
  }

  const loadConversations = async () => {
    try {
      setIsLoadingChats(true)
      const response = await fetch('/api/conversations', {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoadingChats(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  // Auto-resize textarea when input changes
  useEffect(() => {
    if (inputRef.current && !isExpanded) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`
    }
  }, [input, isExpanded])

  const updateConversation = async (messagesToSave, batch = null) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          chatId: chatId,
          messages: messagesToSave,
          selectedTool: selectedTool,
          batch: batch,
        }),
      })

      if (!response.ok) {
        console.error('Failed to update conversation')
      }
    } catch (error) {
      console.error('Error saving conversation:', error)
    }
  }

  const handleSend = async () => {
    const textToSend = input.trim()
    if (!textToSend || isLoading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      // Prepare messages array for backend (without id field)
      const messagesForBackend = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }))

      const batch = getSelectedBatch()
      
      // Determine deep-search and report flags based on selectedTool
      const deepSearch = selectedTool === 'deep-search'
      const report = selectedTool === 'report'
      
      // Send message to backend endpoint
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          chatId: chatId,
          message: textToSend,
          messages: messagesForBackend,
          selectedTool: selectedTool,
          batch: batch,
          'deep-search': deepSearch,
          'report': report,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from backend')
      }

      const data = await response.json()
      
      // Extract assistant response from backend
      const assistantContent = data.response || data.message || data.content || 'Sorry, I could not generate a response.'
        
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
        content: assistantContent,
          timestamp: new Date(),
        }

        const finalMessages = [...updatedMessages, assistantMessage]
        setMessages(finalMessages)

      // Clear loading state immediately after showing response
      setIsLoading(false)
      
      // If deep-search or report tool is used, show report view
      if ((selectedTool === 'deep-search' || selectedTool === 'report') && assistantContent) {
        // Extract title from content or use default
        const titleMatch = assistantContent.match(/^#\s+(.+)$/m) || 
                          assistantContent.match(/^(.+?)\n/m) ||
                          assistantContent.match(/title[:\s]+(.+)/i)
        const extractedTitle = titleMatch ? titleMatch[1].trim() : 
                              (selectedTool === 'deep-search' ? 'Deep Search Results' : 'Research Report')
        
        // Extract data array from response if available
        const reportDataArray = data.data && Array.isArray(data.data) ? data.data : null
        
        // Mark this message as a report
        setReportMessageIds(prev => new Set([...prev, assistantMessage.id]))
        
        setReportTitle(extractedTitle)
        setReportContent(assistantContent)
        setReportData(reportDataArray)
        setReportTimestamp(new Date())
        setShowReportView(true)
      }

      // Save conversation to database (in background, don't block UI)
        const messagesToSave = finalMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }))

      updateConversation(messagesToSave, batch).catch(error => {
        console.error('Error saving conversation:', error)
      })
    } catch (error) {
      console.error('Error sending message to backend:', error)
      // Show error message to user
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date(),
      }
      setMessages([...updatedMessages, errorMessage])
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    router.push('/copilot')
  }

  const handleChatSelect = (selectedChatId) => {
    if (selectedChatId && selectedChatId !== chatId) {
      router.push(`/copilot/${selectedChatId}`)
    }
  }

  const formatMessageContent = (content, timestamp) => {
    if (!content) return null

    // Check if content contains HTML/React markup
    const hasHTMLMarkup = /<[^>]+>/.test(content) || 
                         /data-radix-/.test(content) || 
                         /className=/.test(content) ||
                         /data-slot=/.test(content) ||
                         /Primitive\./.test(content)

    // Extract readable text from content (remove HTML tags but preserve text between them)
    const extractText = (text) => {
      // First, try to extract text content from HTML
      let cleanText = text
        .replace(/<[^>]+>/g, ' ') // Replace HTML tags with space
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim()
      
      // If we have patterns like "Here are the results for your query:", extract that
      const queryMatch = cleanText.match(/Here are the results for your query:\s*([^.]*)/i)
      if (queryMatch) {
        const query = queryMatch[1].trim()
        cleanText = cleanText.replace(/Here are the results for your query:\s*[^.]*/i, `Here are the results for your query: ${query}`)
      }
      
      return cleanText
    }

    // Find JSON objects in the content (handle multi-line and incomplete)
    const findJSONObjects = (text) => {
      const jsonMatches = []
      // Look for JSON-like patterns
      const jsonPattern = /\{[^{}]*(?:"(_id|managementId|testId|classId|subjectId|studentId|batchId)"[^{}]*)\}/gs
      let match
      
      while ((match = jsonPattern.exec(text)) !== null) {
        // Try to find the complete JSON object
        let braceCount = 0
        let jsonStart = match.index
        let jsonEnd = jsonStart
        let foundEnd = false
        
        for (let i = jsonStart; i < Math.min(jsonStart + 2000, text.length); i++) {
          if (text[i] === '{') braceCount++
          if (text[i] === '}') {
            braceCount--
            if (braceCount === 0) {
              jsonEnd = i + 1
              foundEnd = true
              break
            }
          }
        }
        
        if (foundEnd && jsonEnd > jsonStart) {
          const jsonContent = text.substring(jsonStart, jsonEnd)
          jsonMatches.push({
            start: jsonStart,
            end: jsonEnd,
            content: jsonContent
          })
        } else if (jsonStart >= 0) {
          // Incomplete JSON - take what we can
          const incompleteJson = text.substring(jsonStart, Math.min(jsonStart + 500, text.length))
          jsonMatches.push({
            start: jsonStart,
            end: Math.min(jsonStart + 500, text.length),
            content: incompleteJson,
            incomplete: true
          })
        }
      }
      
      return jsonMatches
    }

    // Extract text and JSON from content
    const textContent = hasHTMLMarkup ? extractText(content) : content
    const jsonMatches = findJSONObjects(content)
    
    // Check if this looks like a query result
    const isQueryResult = /Here are the results for your query/i.test(textContent) || 
                         /Found \d+ result/i.test(textContent) ||
                         jsonMatches.length > 0

    // If it's a query result or has JSON, show in card format
    if (isQueryResult || jsonMatches.length > 0) {
      // Extract query text
      const queryMatch = textContent.match(/Here are the results for your query:\s*([^.]*)/i)
      const queryText = queryMatch ? queryMatch[1].trim() : null
      const resultCountMatch = textContent.match(/Found (\d+) result/i)
      const resultCount = resultCountMatch ? resultCountMatch[1] : null
      
      // Extract the main text (before JSON)
      let mainText = textContent
      if (jsonMatches.length > 0 && jsonMatches[0].start > 0) {
        mainText = textContent.substring(0, jsonMatches[0].start).trim()
      }

      return (
        <Card className="max-w-[400px] border bg-card py-2.5 px-3 gap-0">
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">
                {queryText ? `Here are the results for your query: ${queryText}` : mainText.split('\n')[0] || 'Query Results'}
              </div>
              {timestamp && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              )}
            </div>
          </div>
          <div className="max-h-[80px] overflow-y-auto space-y-1 text-xs pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(63 63 70) transparent' }}>
            {resultCount && (
              <p className="text-muted-foreground text-[10px]">
                Found {resultCount} result{resultCount !== '1' ? 's' : ''}.
              </p>
            )}
            
            {jsonMatches.slice(0, 1).map((jsonMatch, idx) => {
              try {
                const jsonObj = JSON.parse(jsonMatch.content)
                // Truncate JSON to show only first few fields
                const jsonStr = JSON.stringify(jsonObj, null, 1)
                const truncatedJson = jsonStr.length > 150 ? jsonStr.substring(0, 150) + '...' : jsonStr
                return (
                  <div key={idx} className="bg-muted rounded p-1 border">
                    <div className="text-[10px] text-muted-foreground mb-0.5">Result {idx + 1}:</div>
                    <pre className="text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-words">
                      <code>{truncatedJson}</code>
                    </pre>
                  </div>
                )
              } catch {
                return (
                  <div key={idx} className="bg-muted rounded p-1 border">
                    <div className="text-[10px] text-muted-foreground mb-0.5">Result {idx + 1}:</div>
                    <pre className="text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-words">
                      <code>{jsonMatch.content.substring(0, 100)}...</code>
                    </pre>
                  </div>
                )
              }
            })}
            
            {jsonMatches.length > 1 && (
              <div className="text-[10px] text-muted-foreground italic pt-0.5">
                + {jsonMatches.length - 1} more result{jsonMatches.length - 1 !== 1 ? 's' : ''}...
              </div>
            )}
            
            {mainText && jsonMatches.length === 0 && (
              <div className="text-foreground whitespace-pre-wrap text-[10px]">
                {mainText.substring(0, 100)}...
              </div>
            )}
          </div>
        </Card>
      )
    }

    // If content has HTML markup but not query results, extract and show cleanly
    if (hasHTMLMarkup) {
      const cleanText = extractText(content)
      
      return (
        <div className="text-sm text-foreground whitespace-pre-wrap">
          {cleanText.split('\n').map((line, idx) => (
            <div key={idx}>{line || '\u00A0'}</div>
          ))}
        </div>
      )
    }

    // Regular text - split by lines
    return (
      <div className="space-y-1 text-sm">
        {content.split('\n').map((line, idx) => (
          <div key={idx}>{line || '\u00A0'}</div>
        ))}
      </div>
    )
  }


  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-background border-b w-full overflow-visible">
          <div className="flex items-center gap-2 px-4 flex-1 min-w-0 overflow-visible">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>AI Copilot</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2 px-4 shrink-0 overflow-visible">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
            <Select 
              value={chatId} 
              onValueChange={handleChatSelect}
              disabled={isLoadingChats || conversations.length === 0}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={isLoadingChats ? 'Loading...' : 'Chat History'}>
                  {conversations.find(c => c.chatId === chatId)?.title || 'Chat History'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {conversations.length === 0 ? (
                  <SelectItem value="no-chats" disabled>No previous chats</SelectItem>
                ) : (
                  conversations.map((conv) => (
                    <SelectItem key={conv.chatId} value={conv.chatId}>
                      <div className="flex flex-col items-start w-full">
                        <span className="text-sm font-medium truncate w-full">{conv.title}</span>
                        {conv.batch && (
                          <span className="text-xs text-muted-foreground">Batch: {conv.batch}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden h-[calc(100vh-4rem)] overflow-x-hidden mt-0">
          {/* Chat View - Hidden when report is shown */}
          {!showReportView && (
            <div className="flex flex-col h-full relative transition-all duration-300 w-full overflow-hidden overflow-x-hidden">
            {/* Messages Area - Scrollable with padding for fixed input */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-64 space-y-4 w-full max-w-3xl mx-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(63 63 70) transparent' }}>
              {isLoadingConversation ? (
                <div className="space-y-4">
                  <div className="flex gap-3 justify-start">
                    <Skeleton className="h-5 w-5 rounded-full mt-1" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full max-w-md" />
                      <Skeleton className="h-4 w-full max-w-sm" />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Skeleton className="h-10 w-32 rounded-2xl" />
                  </div>
                  <div className="flex gap-3 justify-start">
                    <Skeleton className="h-5 w-5 rounded-full mt-1" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full max-w-lg" />
                      <Skeleton className="h-4 w-full max-w-md" />
                    </div>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex gap-3 justify-start">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1">
                    <path d="M10 2L12 8L18 10L12 12L10 18L8 12L2 10L8 8L10 2Z" fill="#4285F4"/>
                    <path d="M10 6L11 9L14 10L11 11L10 14L9 11L6 10L9 9L10 6Z" fill="#34A853"/>
                  </svg>
                  <p className="text-sm text-foreground max-w-[80%] break-words">
                    Hello! I'm here to help you with your student management tasks. What would you like to know?
                  </p>
                </div>
              ) : null}
              {!isLoadingConversation && messages.map((message, msgIndex) => {
                // Check if this message is a report/deep-search result
                const isReportMessage = message.role === 'assistant' && 
                                       reportMessageIds.has(message.id)
                
                return (
                  <div
                    key={message.id}
                    className={`w-full flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex gap-3 w-full">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1 shrink-0">
                          <path d="M10 2L12 8L18 10L12 12L10 18L8 12L2 10L8 8L10 2Z" fill="#4285F4"/>
                          <path d="M10 6L11 9L14 10L11 11L10 14L9 11L6 10L9 9L10 6Z" fill="#34A853"/>
                        </svg>
                        {isReportMessage ? (
                          <Card 
                            className="max-w-[80%] cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              const titleMatch = message.content.match(/^#\s+(.+)$/m) || 
                                                message.content.match(/^(.+?)\n/m) ||
                                                message.content.match(/title[:\s]+(.+)/i)
                              const extractedTitle = titleMatch ? titleMatch[1].trim() : 
                                                    (selectedTool === 'deep-search' ? 'Deep Search Results' : 'Research Report')
                              
                              setReportTitle(extractedTitle)
                              setReportContent(message.content)
                              setReportTimestamp(message.timestamp)
                              setShowReportView(true)
                            }}
                          >
                            <div className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <h3 className="font-semibold text-sm">
                                  {(() => {
                                    const titleMatch = message.content.match(/^#\s+(.+)$/m) || 
                                                      message.content.match(/^(.+?)\n/m) ||
                                                      message.content.match(/title[:\s]+(.+)/i)
                                    return titleMatch ? titleMatch[1].trim() : 
                                           (selectedTool === 'deep-search' ? 'Deep Search Results' : 'Research Report')
                                  })()}
                                </h3>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {message.timestamp ? new Date(message.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Just now'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {message.content.substring(0, 150)}...
                              </p>
                            </div>
                          </Card>
                        ) : (
                          <div className="max-w-[80%] rounded-lg p-3 text-sm break-words bg-transparent text-foreground overflow-x-hidden">
                            {formatMessageContent(message.content, message.timestamp)}
                          </div>
                        )}
                      </div>
                    )}
                    {message.role === 'user' && (
                      <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words bg-muted text-foreground overflow-x-hidden">
                        {message.content}
                      </div>
                    )}
                  </div>
                )
              })}
              {!isLoadingConversation && isLoading && (
                <div className="flex gap-3 justify-start">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1">
                    <path d="M10 2L12 8L18 10L12 12L10 18L8 12L2 10L8 8L10 2Z" fill="#4285F4"/>
                    <path d="M10 6L11 9L14 10L11 11L10 14L9 11L6 10L9 9L10 6Z" fill="#34A853"/>
                  </svg>
                  <div className="bg-transparent rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="mb-8" />
            </div>

            {/* Input Area - Fixed at bottom - Hidden when report is shown */}
            {!showReportView && (
            <div className="fixed bottom-0 left-0 right-0 z-5 pt-4 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-x-hidden" style={{ paddingLeft: 'max(1rem, calc(var(--sidebar-width, 16rem) + 1rem))', paddingRight: '1rem' }}>
              <div className="max-w-4xl mx-auto relative rounded-xl border border-input bg-muted/30 overflow-hidden overflow-x-hidden">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Copilot"
                  className="w-full text-sm font-mono pr-28 pl-3 pt-3 pb-2 rounded-t-xl resize-none overflow-y-auto overflow-x-hidden bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                  rows={isExpanded ? 12 : 2}
                  style={{ 
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                    minHeight: isExpanded ? '18rem' : '2.5rem',
                    maxHeight: isExpanded ? '24rem' : '10rem',
                    height: isExpanded ? 'auto' : 'auto'
                  }}
                />
                {!isExpanded && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1.5 right-1.5 h-6 w-6 z-10"
                    onClick={() => {
                      setIsExpanded(true)
                      if (inputRef.current) {
                        inputRef.current.style.height = '20rem'
                        inputRef.current.focus()
                      }
                    }}
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                )}
                {isExpanded && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1.5 right-1.5 h-6 w-6 z-10"
                    onClick={() => {
                      setIsExpanded(false)
                      if (inputRef.current) {
                        inputRef.current.style.height = 'auto'
                      }
                    }}
                  >
                    <Maximize2 className="h-3 w-3 rotate-45" />
                  </Button>
                )}
                <div className="bg-muted/30 rounded-b-xl px-3 py-2 flex items-center justify-between overflow-x-hidden">
                  <div className="min-w-0 flex-1">
                    {selectedTool ? (
                      <div className="flex items-center gap-2">
                        <div className="h-8 px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-2xl flex items-center gap-2">
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M5.5 3C4.67157 3 4 3.67157 4 4.5C4 5.32843 4.67157 6 5.5 6C6.32843 6 7 5.32843 7 4.5C7 3.67157 6.32843 3 5.5 3ZM3 5C3.01671 5 3.03323 4.99918 3.04952 4.99758C3.28022 6.1399 4.28967 7 5.5 7C6.71033 7 7.71978 6.1399 7.95048 4.99758C7.96677 4.99918 7.98329 5 8 5H13.5C13.7761 5 14 4.77614 14 4.5C14 4.22386 13.7761 4 13.5 4H8C7.98329 4 7.96677 4.00082 7.95048 4.00242C7.71978 2.86009 6.71033 2 5.5 2C4.28967 2 3.28022 2.86009 3.04952 4.00242C3.03323 4.00082 3.01671 4 3 4H1.5C1.22386 4 1 4.22386 1 4.5C1 4.77614 1.22386 5 1.5 5H3ZM11.9505 10.9976C11.7198 12.1399 10.7103 13 9.5 13C8.28967 13 7.28022 12.1399 7.04952 10.9976C7.03323 10.9992 7.01671 11 7 11H1.5C1.22386 11 1 10.7761 1 10.5C1 10.2239 1.22386 10 1.5 10H7C7.01671 10 7.03323 10.0008 7.04952 10.0024C7.28022 8.8601 8.28967 8 9.5 8C10.7103 8 11.7198 8.8601 11.9505 10.0024C11.9668 10.0008 11.9833 10 12 10H13.5C13.7761 10 14 10.2239 14 10.5C14 10.7761 13.7761 11 13.5 11H12C11.9833 11 11.9668 10.9992 11.9505 10.9976ZM8 10.5C8 9.67157 8.67157 9 9.5 9C10.3284 9 11 9.67157 11 10.5C11 11.3284 10.3284 12 9.5 12C8.67157 12 8 11.3284 8 10.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                          </svg>
                          <span className="text-sm font-medium">
                            {selectedTool === 'report' ? 'Report' : selectedTool}
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
                        <SelectTrigger className="h-8 px-3 py-1.5 border-0 bg-muted hover:bg-muted/80 rounded-2xl gap-2">
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M5.5 3C4.67157 3 4 3.67157 4 4.5C4 5.32843 4.67157 6 5.5 6C6.32843 6 7 5.32843 7 4.5C7 3.67157 6.32843 3 5.5 3ZM3 5C3.01671 5 3.03323 4.99918 3.04952 4.99758C3.28022 6.1399 4.28967 7 5.5 7C6.71033 7 7.71978 6.1399 7.95048 4.99758C7.96677 4.99918 7.98329 5 8 5H13.5C13.7761 5 14 4.77614 14 4.5C14 4.22386 13.7761 4 13.5 4H8C7.98329 4 7.96677 4.00082 7.95048 4.00242C7.71978 2.86009 6.71033 2 5.5 2C4.28967 2 3.28022 2.86009 3.04952 4.00242C3.03323 4.00082 3.01671 4 3 4H1.5C1.22386 4 1 4.22386 1 4.5C1 4.77614 1.22386 5 1.5 5H3ZM11.9505 10.9976C11.7198 12.1399 10.7103 13 9.5 13C8.28967 13 7.28022 12.1399 7.04952 10.9976C7.03323 10.9992 7.01671 11 7 11H1.5C1.22386 11 1 10.7761 1 10.5C1 10.2239 1.22386 10 1.5 10H7C7.01671 10 7.03323 10.0008 7.04952 10.0024C7.28022 8.8601 8.28967 8 9.5 8C10.7103 8 11.7198 8.8601 11.9505 10.0024C11.9668 10.0008 11.9833 10 12 10H13.5C13.7761 10 14 10.2239 14 10.5C14 10.7761 13.7761 11 13.5 11H12C11.9833 11 11.9668 10.9992 11.9505 10.9976ZM8 10.5C8 9.67157 8.67157 9 9.5 9C10.3284 9 11 9.67157 11 10.5C11 11.3284 10.3284 12 9.5 12C8.67157 12 8 11.3284 8 10.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                          </svg>
                          <span className="text-sm">Tools</span>
                        </SelectTrigger>
                        <SelectContent>
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
                  <div className="flex items-center gap-2">
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
              <p className="text-xs text-muted-foreground text-center mt-2 max-w-4xl mx-auto">
                Copilot can make mistakes, so double-check it
              </p>
            </div>
            )}
          </div>
          )}
          
          {/* Report View - Full Screen */}
          {showReportView && (
            <div className="w-full h-full overflow-hidden animate-in fade-in duration-300">
              <ReportViewer
                reportContent={reportContent}
                reportTitle={reportTitle}
                timestamp={reportTimestamp}
                reportData={reportData}
                onClose={() => {
                  setShowReportView(false)
                  setReportContent(null)
                  setReportTitle(null)
                  setReportTimestamp(null)
                  setReportData(null)
                }}
              />
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

