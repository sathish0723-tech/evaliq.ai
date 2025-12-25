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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, X, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ActivityByClassPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.classId
  const [students, setStudents] = useState([])
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState([])
  const [columns, setColumns] = useState(['Activity'])
  const [gridData, setGridData] = useState({}) // { studentId_columnName: value }
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (classId) {
      fetchClassData()
      fetchStudents()
      fetchActivities()
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
      }
    } catch (error) {
      console.error('Error fetching class data:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/students', { classId })
      const response = await fetch(url, {
        credentials: 'include',
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

  const fetchActivities = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/activities', { classId })
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
        
        // Extract unique column names from activities
        const uniqueColumns = ['Activity', ...new Set(data.activities.map(a => a.columnName).filter(Boolean))]
        setColumns(uniqueColumns)
        
        // Build grid data from activities
        const grid = {}
        data.activities.forEach(activity => {
          const key = `${activity.studentId}_${activity.columnName}`
          grid[key] = activity.rowData || {}
        })
        setGridData(grid)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast({
        title: "Error",
        description: "Column name is required",
        variant: "destructive",
      })
      return
    }

    if (columns.includes(newColumnName.trim())) {
      toast({
        title: "Error",
        description: "Column already exists",
        variant: "destructive",
      })
      return
    }

    setColumns([...columns, newColumnName.trim()])
    setNewColumnName('')
    setIsAddColumnOpen(false)
  }

  const handleRemoveColumn = (columnName) => {
    if (columns.length <= 1) {
      toast({
        title: "Error",
        description: "At least one column is required",
        variant: "destructive",
      })
      return
    }

    setColumns(columns.filter(col => col !== columnName))
    
    // Remove grid data for this column
    const newGridData = { ...gridData }
    Object.keys(newGridData).forEach(key => {
      if (key.endsWith(`_${columnName}`)) {
        delete newGridData[key]
      }
    })
    setGridData(newGridData)
  }

  const handleCellChange = (studentId, columnName, value) => {
    const key = `${studentId}_${columnName}`
    setGridData({
      ...gridData,
      [key]: { value, updatedAt: new Date() },
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save all grid data as activities
      const savePromises = []
      
      Object.keys(gridData).forEach(key => {
        const [studentId, columnName] = key.split('_')
        const data = gridData[key]
        
        if (data && data.value) {
          const student = students.find(s => s.id === studentId)
          if (student) {
            // Check if activity already exists
            const existingActivity = activities.find(
              a => a.studentId?.toString() === studentId && a.columnName === columnName
            )

            const activityData = {
              classId,
              studentId,
              coachId: classData?.coachId || null,
              batch: student.batch || '',
              columnName,
              rowData: data,
            }

            if (existingActivity) {
              // Update existing activity
              savePromises.push(
                fetch('/api/activities', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                  body: JSON.stringify({
                    activityId: existingActivity.activityId,
                    columnName,
                    rowData: data,
                  }),
                })
              )
            } else {
              // Create new activity
              savePromises.push(
                fetch('/api/activities', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                  body: JSON.stringify(activityData),
                })
              )
            }
          }
        }
      })

      await Promise.all(savePromises)
      
      toast({
        title: "Success",
        description: "Activities saved successfully",
      })
      
      fetchActivities()
    } catch (error) {
      console.error('Error saving activities:', error)
      toast({
        title: "Error",
        description: "Failed to save activities",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getCellValue = (studentId, columnName) => {
    const key = `${studentId}_${columnName}`
    return gridData[key]?.value || ''
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
                <BreadcrumbItem>
                  <BreadcrumbLink href="/activity">Activity</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{classData?.name || 'Class'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">
                {classData ? `${classData.name} - Activities` : 'Student Activities'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage student activities for {classData ? classData.name : 'this class'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Column
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Column</DialogTitle>
                    <DialogDescription>
                      Add a new activity column to track student data
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="columnName">Column Name</Label>
                      <Input
                        id="columnName"
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        placeholder="e.g., Project, Assignment, Participation"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddColumn()
                          }
                        }}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddColumnOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddColumn}>
                      Add Column
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                      Student Name
                    </TableHead>
                    <TableHead className="sticky left-[200px] bg-background z-10 min-w-[200px]">
                      Email
                    </TableHead>
                    {columns.map((column, index) => (
                      <TableHead key={index} className="min-w-[150px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>{column}</span>
                          {column !== 'Activity' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRemoveColumn(column)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {students.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length + 2} className="text-center text-muted-foreground">
                          No students found
                        </TableCell>
                      </TableRow>
                    ) : (
                      students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            {student.name}
                          </TableCell>
                          <TableCell className="sticky left-[200px] bg-background z-10 text-sm text-muted-foreground">
                            {student.email}
                          </TableCell>
                          {columns.map((column, colIndex) => (
                          <TableCell key={colIndex}>
                            <Input
                              value={getCellValue(student.id, column)}
                              onChange={(e) => handleCellChange(student.id, column, e.target.value)}
                              placeholder={`Enter ${column.toLowerCase()}`}
                              className="h-8"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

