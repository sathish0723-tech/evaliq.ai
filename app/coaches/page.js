"use client"

import { useState, useEffect } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Pencil, Trash2, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getUserInitials } from '@/lib/utils-user'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function CoachesPage() {
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCoach, setEditingCoach] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    photo: '',
    batch: '',
  })
  const [batches, setBatches] = useState([])
  const [photoPreview, setPhotoPreview] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchCoaches()
    fetchBatches()
  }, [])

  const fetchCoaches = async () => {
    try {
      const { buildUrlWithBatch } = await import('@/lib/utils-batch')
      const url = buildUrlWithBatch('/api/coaches')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setCoaches(data.coaches || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch coaches",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching coaches:', error)
      toast({
        title: "Error",
        description: "Failed to fetch coaches",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setBatches(data.batches || [])
      }
    } catch (error) {
      console.error('Error fetching batches:', error)
    }
  }

  const handleOpenDialog = (coach = null) => {
    if (coach) {
      setEditingCoach(coach)
      setFormData({
        name: coach.name,
        email: coach.email,
        phone: coach.phone || '',
        photo: coach.photo || '',
        batch: coach.batch || '',
      })
      setPhotoPreview(coach.photo || '')
    } else {
      setEditingCoach(null)
      setFormData({ name: '', email: '', phone: '', photo: '', batch: '' })
      setPhotoPreview('')
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCoach(null)
    setFormData({ name: '', email: '', phone: '', photo: '', batch: '' })
    setPhotoPreview('')
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const uploadResult = await uploadResponse.json()

      if (uploadResponse.ok) {
        setFormData(prev => ({ ...prev, photo: uploadResult.url }))
        setPhotoPreview(uploadResult.url)
        toast({
          title: "Success",
          description: "Photo uploaded successfully",
        })
      } else {
        toast({
          title: "Error",
          description: uploadResult.error || "Failed to upload photo",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      })
      return
    }

    try {
      const url = '/api/coaches'
      const method = editingCoach ? 'PUT' : 'POST'
      const body = editingCoach
        ? { id: editingCoach.id, ...formData }
        : formData

      console.log('Submitting coach:', { method, body })

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      let result = {}
      try {
        const text = await response.text()
        if (text) {
          result = JSON.parse(text)
        }
      } catch (jsonError) {
        console.error('Error parsing response JSON:', jsonError, 'Response status:', response.status)
        toast({
          title: "Error",
          description: `Server error: ${response.status} ${response.statusText || 'Unknown error'}`,
          variant: "destructive",
        })
        return
      }

      console.log('Coach API response:', { status: response.status, statusText: response.statusText, result })

      if (response.ok) {
        toast({
          title: "Success",
          description: editingCoach ? "Coach updated successfully" : "Coach created successfully",
        })
        handleCloseDialog()
        fetchCoaches()
      } else {
        console.error('Coach API error:', { status: response.status, statusText: response.statusText, result })
        
        // If coach already exists, show helpful message
        if (result && result.existingCoach && !editingCoach) {
          const existingCoachName = result.existingCoach.name || 'Unknown'
          const existingCoachEmail = result.existingCoach.email || ''
          toast({
            title: "Coach Already Exists",
            description: `A coach named "${existingCoachName}" (${existingCoachEmail}) already exists with this email. Please use a different email address or edit the existing coach.`,
            variant: "destructive",
          })
        } else {
          // Handle different error scenarios
          let errorMessage = "Failed to save coach"
          if (result && result.error) {
            errorMessage = result.error
          } else if (response.status === 401) {
            errorMessage = "Unauthorized - Please log in again"
          } else if (response.status === 403) {
            errorMessage = "Forbidden - Admin access required"
          } else if (response.status === 400) {
            errorMessage = "Invalid request - Please check your input"
          } else if (response.status >= 500) {
            errorMessage = "Server error - Please try again later"
          }
          
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error saving coach:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save coach",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this coach?')) return

    try {
      const response = await fetch(`/api/coaches?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Coach deleted successfully",
        })
        fetchCoaches()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete coach",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting coach:', error)
      toast({
        title: "Error",
        description: "Failed to delete coach",
        variant: "destructive",
      })
    }
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
                  <BreadcrumbPage>Coaches</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Coaches</h1>
              <p className="text-muted-foreground mt-2">
                Manage your coaches
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Coach
                </Button>
              </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <form onSubmit={handleSubmit}>
                      <DialogHeader>
                        <DialogTitle>
                          {editingCoach ? 'Edit Coach' : 'Create New Coach'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingCoach ? 'Update coach information' : 'Add a new coach to your system'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-2">
                            <Avatar className="h-24 w-24">
                              {photoPreview && <AvatarImage src={photoPreview} alt="Coach photo" />}
                              <AvatarFallback className="text-lg">
                                {getUserInitials(formData.name || 'Coach')}
                              </AvatarFallback>
                            </Avatar>
                            <Label htmlFor="photo" className="cursor-pointer">
                              <Button type="button" variant="outline" size="sm" asChild>
                                <span>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Upload Photo
                                </span>
                              </Button>
                              <Input
                                id="photo"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoChange}
                              />
                            </Label>
                          </div>
                          <div className="flex-1 grid gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="name">Coach Name *</Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., John Doe"
                                required
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="email">Email *</Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="e.g., john.doe@example.com"
                                required
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="e.g., +1234567890"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="batch">Batch</Label>
                          <Select
                            value={formData.batch || undefined}
                            onValueChange={(value) => setFormData({ ...formData, batch: value || '' })}
                          >
                            <SelectTrigger id="batch">
                              <SelectValue placeholder="Select a batch (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {batches.map((batch) => (
                                <SelectItem key={batch} value={batch}>
                                  {batch}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCloseDialog}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingCoach ? 'Update' : 'Create'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
          </div>
          {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading coaches...</div>
                </div>
              ) : coaches.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">No coaches found</p>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Coach
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Photo</TableHead>
                        <TableHead>Coach ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coaches.map((coach) => (
                        <TableRow key={coach.id}>
                          <TableCell>
                            <Avatar className="h-10 w-10">
                              {coach.photo && <AvatarImage src={coach.photo} alt={coach.name} />}
                              <AvatarFallback>
                                {getUserInitials(coach.name)}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{coach.coachId}</TableCell>
                          <TableCell className="font-medium">{coach.name}</TableCell>
                          <TableCell className="lowercase">{coach.email}</TableCell>
                          <TableCell>{coach.phone || '-'}</TableCell>
                          <TableCell>{coach.batch || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(coach)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(coach.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

