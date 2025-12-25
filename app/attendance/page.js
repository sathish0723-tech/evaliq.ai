"use client"

import { useState, useEffect, useRef } from "react"
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
import { Calendar, User } from 'lucide-react'
import { getSelectedBatch } from '@/lib/utils-batch'

export default function AttendancePage() {
  const router = useRouter()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const currentBatchRef = useRef('')

  useEffect(() => {
    // Initialize batch ref
    currentBatchRef.current = getSelectedBatch()
    fetchClasses()
    
    // Listen for batch changes via storage event (works across tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'selectedBatch') {
        const newBatch = e.newValue || ''
        if (newBatch !== currentBatchRef.current) {
          console.log(`[Attendance] Batch changed from "${currentBatchRef.current}" to "${newBatch}"`)
          currentBatchRef.current = newBatch
          fetchClasses()
        }
      }
    }
    
    // Listen for custom batch change event (works in same tab)
    const handleBatchChange = () => {
      const newBatch = getSelectedBatch()
      if (newBatch !== currentBatchRef.current) {
        console.log(`[Attendance] Batch changed via event from "${currentBatchRef.current}" to "${newBatch}"`)
        currentBatchRef.current = newBatch
        fetchClasses()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('batchChanged', handleBatchChange)
    
    // Poll for batch changes (fallback for same-tab changes)
    const pollInterval = setInterval(() => {
      const newBatch = getSelectedBatch()
      if (newBatch !== currentBatchRef.current) {
        console.log(`[Attendance] Batch changed via polling from "${currentBatchRef.current}" to "${newBatch}"`)
        currentBatchRef.current = newBatch
        fetchClasses()
      }
    }, 500) // Check every 500ms
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('batchChanged', handleBatchChange)
      clearInterval(pollInterval)
    }
  }, [])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/classes')
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store', // Prevent caching
      })
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
        console.log(`[Attendance] Fetched ${data.classes?.length || 0} classes for batch: "${getSelectedBatch()}"`)
      } else {
        console.error('Failed to fetch classes')
        setClasses([])
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  const handleClassClick = (classId) => {
    router.push(`/attendance/${classId}`)
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
                  <BreadcrumbPage>Attendance</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Student Attendance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select a class to mark attendance
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading classes...</div>
            </div>
          ) : classes.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No classes found</p>
                <Button onClick={() => router.push('/classes')}>
                  Create Class
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => (
                <Card 
                  key={cls.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <CardHeader>
                    <CardTitle className="text-base font-medium">{cls.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1 text-xs">
                      <User className="h-3 w-3" />
                      <span>Coach: {cls.coachName || 'Not assigned'}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      {cls.description && (
                        <p className="text-xs text-muted-foreground">
                          {cls.description}
                        </p>
                      )}
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleClassClick(cls.classId)}
                      >
                        <Calendar className="mr-2 h-3 w-3" />
                        Take Attendance
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
