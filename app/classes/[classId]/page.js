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
import StudentUploadTable from '@/components/student-upload-table'
import { useToast } from '@/hooks/use-toast'

export default function ClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.classId
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (classId) {
      fetchClassData()
    }
  }, [classId])

  const fetchClassData = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/classes')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const foundClass = data.classes?.find(cls => cls.classId === classId)
        setClassData(foundClass)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch class data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching class data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch class data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveComplete = () => {
    // Refresh class data to update student count
    fetchClassData()
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
                  <BreadcrumbLink href="/classes">
                    Classes
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{classData?.name || 'Class'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading class data...</div>
            </div>
          ) : !classData ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Class not found</p>
                <button
                  onClick={() => router.push('/classes')}
                  className="text-primary hover:underline"
                >
                  Go back to Classes
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {classData.name}
                </h1>
                {classData.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {classData.description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Class ID: <span className="font-mono">{classData.classId}</span>
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Add Students</h2>
                <StudentUploadTable
                  classId={classId}
                  onSaveComplete={handleSaveComplete}
                />
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

