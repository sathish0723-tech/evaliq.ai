"use client"

import { useState, useEffect } from "react"
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
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, Users, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getUserInitials } from '@/lib/utils-user'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function SquadsPage() {
  const router = useRouter()
  const [squads, setSquads] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingSquad, setEditingSquad] = useState(null)
  const [squadFormData, setSquadFormData] = useState({
    name: '',
    selectedStudentIds: [],
    squadLeaderId: '',
    durationType: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchSquads()
    fetchStudents()
  }, [])

  const fetchSquads = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/squads')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setSquads(data.squads || [])
      }
    } catch (error) {
      console.error('Error fetching squads:', error)
      toast({
        title: "Error",
        description: "Failed to fetch squads",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/students')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const handleDelete = async (squadId) => {
    if (!confirm('Are you sure you want to delete this squad?')) return

    try {
      const response = await fetch(`/api/squads?id=${squadId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Squad deleted successfully",
        })
        fetchSquads()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete squad",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting squad:', error)
      toast({
        title: "Error",
        description: "Failed to delete squad",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (squad) => {
    setEditingSquad(squad)
    setSquadFormData({
      name: squad.name,
      selectedStudentIds: squad.studentIds || [],
      squadLeaderId: squad.squadLeaderId || '',
      durationType: squad.durationType || 'monthly',
      startDate: squad.startDate ? new Date(squad.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    })
    setIsEditDialogOpen(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    
    if (!squadFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Squad name is required",
        variant: "destructive",
      })
      return
    }

    if (squadFormData.selectedStudentIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one student",
        variant: "destructive",
      })
      return
    }

    if (!squadFormData.squadLeaderId) {
      toast({
        title: "Error",
        description: "Please select a squad leader",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/squads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingSquad.id,
          name: squadFormData.name,
          studentIds: squadFormData.selectedStudentIds,
          squadLeaderId: squadFormData.squadLeaderId,
          durationType: squadFormData.durationType,
          startDate: squadFormData.startDate,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Squad updated successfully",
        })
        setIsEditDialogOpen(false)
        setEditingSquad(null)
        fetchSquads()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update squad",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating squad:', error)
      toast({
        title: "Error",
        description: "Failed to update squad",
        variant: "destructive",
      })
    }
  }

  const getStudentById = (studentId) => {
    return students.find(s => s.id === studentId)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getDurationText = (squad) => {
    if (!squad.startDate || !squad.endDate) return '-'
    const start = new Date(squad.startDate)
    const end = new Date(squad.endDate)
    const durationType = squad.durationType === 'daily' ? 'Daily' : 'Monthly'
    return `${formatDate(squad.startDate)} - ${formatDate(squad.endDate)} (${durationType})`
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
                  <BreadcrumbPage>Squads</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Squads</h1>
              <p className="text-muted-foreground">
                Manage student squads and their leaders
              </p>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading squads...</div>
            </div>
          ) : squads.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No squads found</p>
                <Button onClick={() => router.push('/students')}>
                  <Users className="mr-2 h-4 w-4" />
                  Go to Students to Create Squad
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm">Squad Name</TableHead>
                    <TableHead className="text-sm">Students</TableHead>
                    <TableHead className="text-sm">Squad Leader</TableHead>
                    <TableHead className="text-sm">Duration</TableHead>
                    <TableHead className="text-sm">Type</TableHead>
                    <TableHead className="text-right text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {squads.map((squad) => {
                    const leader = getStudentById(squad.squadLeaderId)
                    return (
                      <TableRow key={squad.id}>
                        <TableCell className="font-medium">{squad.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{squad.studentIds?.length || 0} students</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {leader ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                {leader.photo && <AvatarImage src={leader.photo} alt={leader.name} />}
                                <AvatarFallback>
                                  {getUserInitials(leader.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium">{leader.name}</div>
                                <div className="text-xs text-muted-foreground">{leader.email}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No leader assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{getDurationText(squad)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={squad.durationType === 'daily' ? 'default' : 'secondary'}>
                            {squad.durationType === 'daily' ? 'Daily' : 'Monthly'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEdit(squad)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDelete(squad.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Edit Squad</DialogTitle>
                <DialogDescription>
                  Update squad information and assignments
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="editSquadName">Squad Name *</Label>
                  <Input
                    id="editSquadName"
                    value={squadFormData.name}
                    onChange={(e) => setSquadFormData({ ...squadFormData, name: e.target.value })}
                    placeholder="e.g., Alpha Squad, Team A"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Duration Type *</Label>
                  <Select
                    value={squadFormData.durationType}
                    onValueChange={(value) => setSquadFormData({ ...squadFormData, durationType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily (Leader changes daily)</SelectItem>
                      <SelectItem value="monthly">Monthly (Leader changes monthly)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editStartDate">Start Date *</Label>
                  <Input
                    id="editStartDate"
                    type="date"
                    value={squadFormData.startDate}
                    onChange={(e) => setSquadFormData({ ...squadFormData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Select Students *</Label>
                  <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                    {students.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No students available</p>
                    ) : (
                      <div className="space-y-2">
                        {students.map((student) => (
                          <div key={student.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`edit-student-${student.id}`}
                              checked={squadFormData.selectedStudentIds.includes(student.id)}
                              onChange={() => {
                                const isSelected = squadFormData.selectedStudentIds.includes(student.id)
                                const newSelectedIds = isSelected
                                  ? squadFormData.selectedStudentIds.filter(id => id !== student.id)
                                  : [...squadFormData.selectedStudentIds, student.id]
                                
                                const newLeaderId = (isSelected && squadFormData.squadLeaderId === student.id) 
                                  ? '' 
                                  : squadFormData.squadLeaderId
                                
                                setSquadFormData({
                                  ...squadFormData,
                                  selectedStudentIds: newSelectedIds,
                                  squadLeaderId: newLeaderId,
                                })
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label
                              htmlFor={`edit-student-${student.id}`}
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                            >
                              <Avatar className="h-8 w-8">
                                {student.photo && <AvatarImage src={student.photo} alt={student.name} />}
                                <AvatarFallback>
                                  {getUserInitials(student.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium">{student.name}</div>
                                <div className="text-xs text-muted-foreground">{student.email}</div>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {squadFormData.selectedStudentIds.length > 0 && (
                  <div className="grid gap-2">
                    <Label>Select Squad Leader *</Label>
                    <Select
                      value={squadFormData.squadLeaderId}
                      onValueChange={(value) => setSquadFormData({ ...squadFormData, squadLeaderId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a squad leader" />
                      </SelectTrigger>
                      <SelectContent>
                        {squadFormData.selectedStudentIds.map((studentId) => {
                          const student = students.find(s => s.id === studentId)
                          return student ? (
                            <SelectItem key={studentId} value={studentId}>
                              {student.name} ({student.email})
                            </SelectItem>
                          ) : null
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingSquad(null)
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Squad
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}








