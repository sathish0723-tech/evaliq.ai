"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSelectedBatch } from '@/lib/utils-batch'
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
import { 
  Send, 
  Loader2,
  Maximize2,
  X,
  History,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function CopilotPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [selectedTool, setSelectedTool] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [conversations, setConversations] = useState([])
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchUserName()
    loadConversations()
  }, [])

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

  const handleChatSelect = (selectedChatId) => {
    if (selectedChatId && selectedChatId !== 'new') {
      router.push(`/copilot/${selectedChatId}`)
    }
  }

  const generateConversationTitle = (userInput) => {
    const trimmed = userInput.trim()
    if (!trimmed) return 'New Conversation'
    
    // Capitalize first letter
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
    
    // Limit to 50 characters
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
      // Get current batch
      const batch = getSelectedBatch()

      // Generate conversation title
      const conversationTitle = generateConversationTitle(textToSend)

      // Create new conversation first
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
      const chatId = createData.conversation.chatId

      // Create user message
      const userMessage = {
        role: 'user',
        content: textToSend,
        timestamp: new Date(),
      }

      // Determine deep-search and report flags based on selectedTool
      const deepSearch = selectedTool === 'deep-search'
      const report = selectedTool === 'report'

      // Send message to backend endpoint
      const backendResponse = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          chatId: chatId,
          message: textToSend,
          messages: [userMessage],
          selectedTool: selectedTool,
          batch: batch,
          'deep-search': deepSearch,
          'report': report,
        }),
      })

      if (!backendResponse.ok) {
        throw new Error('Failed to get response from backend')
      }

      const backendData = await backendResponse.json()
      
      // Extract assistant response from backend
      const assistantContent = backendData.response || backendData.message || backendData.content || 'Sorry, I could not generate a response.'
      
      // Create messages array with both user and assistant messages
      const messages = [
        userMessage,
        {
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date(),
        }
      ]
        
        // Save messages to conversation
        await fetch('/api/conversations', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            chatId: chatId,
            messages: messages,
            selectedTool: selectedTool,
            batch: batch,
          }),
        })
        
        // Navigate to chat page with the chat ID
        router.push(`/copilot/${chatId}`)
    } catch (error) {
      console.error('Error creating conversation:', error)
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 flex-1">
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
          <div className="flex items-center gap-2 px-4">
            <Select 
              value="" 
              onValueChange={handleChatSelect}
              disabled={isLoadingChats || conversations.length === 0}
            >
              <SelectTrigger className="w-[200px]">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <SelectValue placeholder={isLoadingChats ? 'Loading...' : conversations.length === 0 ? 'No chat history' : 'Chat History'} />
                </div>
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
                        {conv.updatedAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(conv.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </header>
        <div className="flex flex-1 flex-col h-[calc(100vh-4rem)] relative">
          {/* Landing Page View */}
          <div className="flex flex-col items-center justify-center flex-1 px-4 pb-20">
            <header className="text-left mb-8 w-full max-w-3xl">
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACnUlEQVR4nO2az2sTURDHB23/An+AtupZQ/ImBI8aVFT07kEQ/CsU9ZJLUUqPtXmzAW1RTxUV6R/Qf6BnLUlmkrS9GqWpvUZmYxNTN2nSZjf70A8M7PE77828953dBfhPbzLe2qQGuAq+Kp7KeOsnwVWSHifRVi+Bq6At303l5Ta4ChI/M1Yeg6sg8Ue0sgwuks2tThgrP5C4rs/gGmkq30CSph+eZME1kORdOwHiRXDt/DfEu3sJGMs/nboPDPFcZ/V/J0HyHFwg4/F5XfH9CSBJw9iNKYg7hvhzgPhWWPkAcQY9edhTfLuU+AHE1feY4NLZtwu8YwqlBMQJYzemjJXageI7x+pW+qVcgDiQWCidQ+L1wcW3j9avyUJxOgZ2WTaHFd9JQmpjKydt2IFqfpCeoAgbOz1fO2tI3h9Z+N+xondI2PZgbiSr3mc3kHh2ZLZDbbDvKq28/dPbhB2GeNcQv0nly9cHs+K55rFUvnxaG0rHQPT4iQ4jLT8fjWjsvSvf9Qb3NXmVO6pRtarmrgS0RHQAN57c0jGwVedcj0EC33SqU01o+aZqVK3dCfTg3nLzuA4jxvJSqLVPgb2wmMzzFdUAo0Aby1h5oa4yPOGyjSQzl+e3ToxEdHAi1TPaYCEksKK3OkSFXj6trT6y8Aba8v3IhHclUSglhjNx3WGIq+mFykUYJ2rI1JgdQvyX2Exovp0mrg7RrJuh2obD0LoEB+qJxtjLpm9jH7j6Y2rYQUHLn/qUTvzfkyYLxenAUrKyrVYcXACJZwN2YAZcfbWIlndCtQdh0GU3rLwG1zBe5dpeAmmSq+Aa2dzqhD+MENdHZomjxp+kXDg6e4GWnxqSR+Aq6PpnVlMoJWLre/6JXw0y3tqkk59YIUJ+AZ+GSj26qUBGAAAAAElFTkSuQmCC" 
                  alt="gemini-ai"
                  className="h-6 w-6"
                />
                <h1 className="text-2xl font-semibold">
                  Hi {userName || 'User'}
                </h1>
              </div>
              <p className="text-2xl text-muted-foreground">
                Where should we start?
              </p>
            </header>

            {/* Main Input Field */}
            <div className="w-full max-w-3xl mb-6 relative rounded-2xl border border-input bg-muted/30 overflow-hidden">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Copilot"
                  className="w-full text-sm font-mono pr-24 pl-4 pt-2 pb-2 rounded-t-2xl resize-none overflow-y-auto bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                  rows={3}
                  style={{ 
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                    minHeight: '6rem',
                    maxHeight: '8rem'
                  }}
                />
                <div className="bg-muted/30 rounded-b-2xl px-3 py-2 mb-1 flex items-center justify-between">
                  <div>
                    {selectedTool ? (
                      <div className="flex items-center gap-2">
                        <div className="h-8 px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-2xl flex items-center gap-2">
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M5.5 3C4.67157 3 4 3.67157 4 4.5C4 5.32843 4.67157 6 5.5 6C6.32843 6 7 5.32843 7 4.5C7 3.67157 6.32843 3 5.5 3ZM3 5C3.01671 5 3.03323 4.99918 3.04952 4.99758C3.28022 6.1399 4.28967 7 5.5 7C6.71033 7 7.71978 6.1399 7.95048 4.99758C7.96677 4.99918 7.98329 5 8 5H13.5C13.7761 5 14 4.77614 14 4.5C14 4.22386 13.7761 4 13.5 4H8C7.98329 4 7.96677 4.00082 7.95048 4.00242C7.71978 2.86009 6.71033 2 5.5 2C4.28967 2 3.28022 2.86009 3.04952 4.00242C3.03323 4.00082 3.01671 4 3 4H1.5C1.22386 4 1 4.22386 1 4.5C1 4.77614 1.22386 5 1.5 5H3ZM11.9505 10.9976C11.7198 12.1399 10.7103 13 9.5 13C8.28967 13 7.28022 12.1399 7.04952 10.9976C7.03323 10.9992 7.01671 11 7 11H1.5C1.22386 11 1 10.7761 1 10.5C1 10.2239 1.22386 10 1.5 10H7C7.01671 10 7.03323 10.0008 7.04952 10.0024C7.28022 8.8601 8.28967 8 9.5 8C10.7103 8 11.7198 8.8601 11.9505 10.0024C11.9668 10.0008 11.9833 10 12 10H13.5C13.7761 10 14 10.2239 14 10.5C14 10.7761 13.7761 11 13.5 11H12C11.9833 11 11.9668 10.9992 11.9505 10.9976ZM8 10.5C8 9.67157 8.67157 9 9.5 9C10.3284 9 11 9.67157 11 10.5C11 11.3284 10.3284 12 9.5 12C8.67157 12 8 11.3284 8 10.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                          </svg>
                          <span className="text-sm font-medium">
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
                        <SelectTrigger className="h-8 px-3 py-1.5 border-0 bg-muted hover:bg-muted/80 rounded-2xl gap-2">
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M5.5 3C4.67157 3 4 3.67157 4 4.5C4 5.32843 4.67157 6 5.5 6C6.32843 6 7 5.32843 7 4.5C7 3.67157 6.32843 3 5.5 3ZM3 5C3.01671 5 3.03323 4.99918 3.04952 4.99758C3.28022 6.1399 4.28967 7 5.5 7C6.71033 7 7.71978 6.1399 7.95048 4.99758C7.96677 4.99918 7.98329 5 8 5H13.5C13.7761 5 14 4.77614 14 4.5C14 4.22386 13.7761 4 13.5 4H8C7.98329 4 7.96677 4.00082 7.95048 4.00242C7.71978 2.86009 6.71033 2 5.5 2C4.28967 2 3.28022 2.86009 3.04952 4.00242C3.03323 4.00082 3.01671 4 3 4H1.5C1.22386 4 1 4.22386 1 4.5C1 4.77614 1.22386 5 1.5 5H3ZM11.9505 10.9976C11.7198 12.1399 10.7103 13 9.5 13C8.28967 13 7.28022 12.1399 7.04952 10.9976C7.03323 10.9992 7.01671 11 7 11H1.5C1.22386 11 1 10.7761 1 10.5C1 10.2239 1.22386 10 1.5 10H7C7.01671 10 7.03323 10.0008 7.04952 10.0024C7.28022 8.8601 8.28967 8 9.5 8C10.7103 8 11.7198 8.8601 11.9505 10.0024C11.9668 10.0008 11.9833 10 12 10H13.5C13.7761 10 14 10.2239 14 10.5C14 10.7761 13.7761 11 13.5 11H12C11.9833 11 11.9668 10.9992 11.9505 10.9976ZM8 10.5C8 9.67157 8.67157 9 9.5 9C10.3284 9 11 9.67157 11 10.5C11 11.3284 10.3284 12 9.5 12C8.67157 12 8 11.3284 8 10.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                          </svg>
                          <span className="text-sm">Tools</span>
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
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
