"use client"

import { useState, useEffect, useRef } from "react"
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTheme } from 'next-themes'
import { Moon, Sun, Upload, X, User, Users, GraduationCap, Plus } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useToast } from '@/hooks/use-toast'
import { useApp } from '@/contexts/app-context'
import { getUserInitials } from '@/lib/utils-user'
import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { management, user, fetchManagement, fetchUser } = useApp()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Management form state
  const [managementName, setManagementName] = useState('')
  const [managementLogo, setManagementLogo] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const managementFileInputRef = useRef(null)
  
  // User form state
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPicture, setUserPicture] = useState('')
  const [userPicturePreview, setUserPicturePreview] = useState('')
  const [userPictureFile, setUserPictureFile] = useState(null)
  const userFileInputRef = useRef(null)

  // Batch management state
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedBatch') || ''
    }
    return ''
  })
  const [batchStudents, setBatchStudents] = useState([])
  const [batchCoaches, setBatchCoaches] = useState([])
  const [isLoadingBatch, setIsLoadingBatch] = useState(false)
  const [isCreateBatchDialogOpen, setIsCreateBatchDialogOpen] = useState(false)
  const [newBatchName, setNewBatchName] = useState('')
  const fetchingBatchRef = useRef(null)

  // Save selected batch to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedBatch) {
      localStorage.setItem('selectedBatch', selectedBatch)
      console.log(`[Settings] Saved batch to localStorage: "${selectedBatch}"`)
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('batchChanged'))
    } else if (typeof window !== 'undefined' && !selectedBatch) {
      localStorage.removeItem('selectedBatch')
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('batchChanged'))
    }
  }, [selectedBatch])

  useEffect(() => {
    setMounted(true)
    if (management) {
      setManagementName(management.name || '')
      setManagementLogo(management.logo || '')
      setLogoPreview(management.logo || '')
    }
    if (user) {
      setUserName(user.name || '')
      setUserEmail(user.email || '')
      setUserPicture(user.picture || '')
      setUserPicturePreview(user.picture || '')
    }
    fetchBatches()
  }, [management, user])

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setBatches(data.batches || [])
        
        // Handle batch selection logic
        if (data.batches && data.batches.length > 0) {
          const savedBatch = typeof window !== 'undefined' ? localStorage.getItem('selectedBatch') : null
          
          // If we have a saved batch and it exists in the list, use it
          if (savedBatch && data.batches.includes(savedBatch)) {
            if (selectedBatch !== savedBatch) {
              console.log(`[Settings] Restoring saved batch: "${savedBatch}"`)
              setSelectedBatch(savedBatch)
            }
          } 
          // If current selectedBatch doesn't exist in the list, reset to first available
          else if (selectedBatch && !data.batches.includes(selectedBatch)) {
            console.log(`[Settings] Batch "${selectedBatch}" not found, resetting to "${data.batches[0]}"`)
            setSelectedBatch(data.batches[0])
            if (typeof window !== 'undefined') {
              localStorage.setItem('selectedBatch', data.batches[0])
            }
          }
          // If no batch is selected at all, use first available
          else if (!selectedBatch) {
            console.log(`[Settings] No batch selected, setting to first available: "${data.batches[0]}"`)
            setSelectedBatch(data.batches[0])
            if (typeof window !== 'undefined') {
              localStorage.setItem('selectedBatch', data.batches[0])
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching batches:', error)
    }
  }

  const fetchBatchData = async (batchName) => {
    if (!batchName) {
      setBatchStudents([])
      setBatchCoaches([])
      fetchingBatchRef.current = null
      setIsLoadingBatch(false)
      return
    }

    // Normalize batch name (remove any extra spaces)
    const normalizedBatchName = batchName.trim()
    
    // Cancel any previous fetch by setting ref to null first
    fetchingBatchRef.current = null
    
    // Clear data immediately when fetching new batch
    setBatchStudents([])
    setBatchCoaches([])
    setIsLoadingBatch(true)
    
    // Set the current fetching batch AFTER clearing
    fetchingBatchRef.current = normalizedBatchName
    
    console.log(`[Settings] Fetching data for batch: "${normalizedBatchName}"`)
    
    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          action: 'getBatchData',
          batchName: normalizedBatchName,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`[Settings] Received data for batch: "${normalizedBatchName}", students: ${data.students?.length || 0}, coaches: ${data.coaches?.length || 0}`)
        
        // Only set data if we're still fetching the same batch (prevent race conditions)
        if (fetchingBatchRef.current === normalizedBatchName) {
          // Set new data directly
          setBatchStudents(data.students || [])
          setBatchCoaches(data.coaches || [])
          setIsLoadingBatch(false)
          console.log(`[Settings] Data set for batch: "${normalizedBatchName}"`)
        } else {
          console.log(`[Settings] Ignoring data for batch "${normalizedBatchName}" - batch changed to "${fetchingBatchRef.current}"`)
          setIsLoadingBatch(false)
        }
      } else {
        if (fetchingBatchRef.current === normalizedBatchName) {
          toast({
            title: "Error",
            description: "Failed to fetch batch data",
            variant: "destructive",
          })
          setIsLoadingBatch(false)
        }
      }
    } catch (error) {
      console.error('Error fetching batch data:', error)
      if (fetchingBatchRef.current === normalizedBatchName) {
        toast({
          title: "Error",
          description: "Failed to fetch batch data",
          variant: "destructive",
        })
        setIsLoadingBatch(false)
      }
    }
  }

  useEffect(() => {
    // Cancel any ongoing fetch
    fetchingBatchRef.current = null
    
    // Clear data immediately
    setBatchStudents([])
    setBatchCoaches([])
    
    if (selectedBatch) {
      // Small delay to ensure UI updates with cleared state first
      const timer = setTimeout(() => {
        fetchBatchData(selectedBatch)
      }, 100)
      
      return () => {
        clearTimeout(timer)
        // Cancel fetch if component unmounts or batch changes
        fetchingBatchRef.current = null
      }
    } else {
      setIsLoadingBatch(false)
    }
  }, [selectedBatch])

  const handleBatchChange = (batchName) => {
    console.log(`[Settings] Batch changed to: "${batchName}"`)
    
    // Cancel any ongoing fetch
    fetchingBatchRef.current = null
    
    // Clear data immediately when changing batch
    setBatchStudents([])
    setBatchCoaches([])
    setIsLoadingBatch(true)
    
    // Update selected batch - this will trigger useEffect
    setSelectedBatch(batchName)
  }

  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) {
      toast({
        title: "Error",
        description: "Batch name is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'createBatch',
          batchName: newBatchName.trim(),
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Batch created successfully",
        })
        setIsCreateBatchDialogOpen(false)
        setNewBatchName('')
        fetchBatches()
        setSelectedBatch(newBatchName.trim())
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create batch",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating batch:', error)
      toast({
        title: "Error",
        description: "Failed to create batch",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }


  if (!mounted) {
    return null
  }

  const handleManagementLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
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
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeManagementLogo = () => {
    setLogoFile(null)
    setLogoPreview(managementLogo || '')
    if (managementFileInputRef.current) {
      managementFileInputRef.current.value = ''
    }
  }

  const handleUserPictureChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
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
      setUserPictureFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setUserPicturePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeUserPicture = () => {
    setUserPictureFile(null)
    setUserPicturePreview(userPicture || '')
    if (userFileInputRef.current) {
      userFileInputRef.current.value = ''
    }
  }

  const handleSaveManagement = async () => {
    if (!managementName.trim()) {
      toast({
        title: "Error",
        description: "Management name is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      let logoUrl = managementLogo
      
      // Upload new logo if selected
      if (logoFile) {
        const formData = new FormData()
        formData.append('file', logoFile)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload logo')
        }

        const uploadData = await uploadResponse.json()
        logoUrl = uploadData.url
      }

      const response = await fetch('/api/management', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: managementName,
          logo: logoUrl,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Management updated successfully",
        })
        fetchManagement()
        setLogoFile(null)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update management",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating management:', error)
      toast({
        title: "Error",
        description: "Failed to update management",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveUser = async () => {
    if (!userName.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      let pictureUrl = userPicture
      
      // Upload new picture if selected
      if (userPictureFile) {
        const formData = new FormData()
        formData.append('file', userPictureFile)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload picture')
        }

        const uploadData = await uploadResponse.json()
        pictureUrl = uploadData.url
      }

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: userName,
          picture: pictureUrl,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
        fetchUser()
        setUserPictureFile(null)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update profile",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          
          <div className="flex items-center justify-end gap-3 p-2">
            <span className="text-sm text-muted-foreground">
              {theme === 'dark' ? 'Dark Theme' : 'Light Theme'}
            </span>
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          {management && user?.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle>Management Profile</CardTitle>
                <CardDescription>
                  Update your management name and logo. Only admins can modify this.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-border flex items-center justify-center bg-muted">
                        {logoPreview ? (
                          <img 
                            src={logoPreview} 
                            alt="Management logo" 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <User className="h-12 w-12 text-muted-foreground" />
                        )}
                      </div>
                      {logoPreview && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={removeManagementLogo}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Label htmlFor="management-logo" className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Logo
                        </span>
                      </Button>
                      <Input
                        id="management-logo"
                        ref={managementFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleManagementLogoChange}
                      />
                    </Label>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="management-name">Management Name *</Label>
                      <Input
                        id="management-name"
                        value={managementName}
                        onChange={(e) => setManagementName(e.target.value)}
                        placeholder="Enter management name"
                      />
                    </div>
                    <Button
                      onClick={handleSaveManagement}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {user && (
            <Card>
              <CardHeader>
                <CardTitle>User Profile</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-24 w-24">
                      {userPicturePreview && (
                        <AvatarImage src={userPicturePreview} alt={userName} />
                      )}
                      <AvatarFallback className="text-lg">
                        {getUserInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                    <Label htmlFor="user-picture" className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Photo
                        </span>
                      </Button>
                      <Input
                        id="user-picture"
                        ref={userFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUserPictureChange}
                      />
                    </Label>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-name">Name *</Label>
                      <Input
                        id="user-name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-email">Email</Label>
                      <Input
                        id="user-email"
                        value={userEmail}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed
                      </p>
                    </div>
                    <Button
                      onClick={handleSaveUser}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Batch Management</CardTitle>
                  <CardDescription>
                    Manage students and coaches by batch
                  </CardDescription>
                </div>
                <Dialog open={isCreateBatchDialogOpen} onOpenChange={setIsCreateBatchDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => setNewBatchName('')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Batch
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Batch</DialogTitle>
                      <DialogDescription>
                        Enter a name for the new batch (e.g., Batch-5, Batch-6)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="batch-name">Batch Name *</Label>
                        <Input
                          id="batch-name"
                          value={newBatchName}
                          onChange={(e) => setNewBatchName(e.target.value)}
                          placeholder="e.g., Batch-5"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateBatch()
                            }
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateBatchDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateBatch} disabled={isLoading}>
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="batch-select">Select Batch</Label>
                  <Select value={selectedBatch} onValueChange={handleBatchChange}>
                    <SelectTrigger id="batch-select">
                      <SelectValue placeholder="Select a batch" />
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

              {selectedBatch && (
                <>
                  {isLoadingBatch ? (
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Students Section Skeleton */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <div className="p-4 border rounded-lg">
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>

                      {/* Coaches Section Skeleton */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-5 w-28" />
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <div className="p-4 space-y-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Students Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="h-4 w-4" />
                          <h3 className="font-semibold">Students</h3>
                        </div>
                        <div className="text-sm text-muted-foreground p-4 border rounded-lg">
                          {batchStudents.length === 0
                            ? 'No students in this batch'
                            : `${batchStudents.length} student${batchStudents.length !== 1 ? 's' : ''}`}
                        </div>
                      </div>

                      {/* Coaches Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <GraduationCap className="h-4 w-4" />
                          <h3 className="font-semibold">Coaches ({batchCoaches.length})</h3>
                        </div>
                        {batchCoaches.length === 0 ? (
                          <div className="text-sm text-muted-foreground p-4 border rounded-lg">
                            No coaches assigned to classes with students in this batch
                          </div>
                        ) : (
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Name</TableHead>
                                  <TableHead className="text-xs">Email</TableHead>
                                  <TableHead className="text-xs">Classes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {batchCoaches.map((coach) => (
                                  <TableRow key={coach.id}>
                                    <TableCell className="text-xs">{coach.name}</TableCell>
                                    <TableCell className="text-xs">{coach.email}</TableCell>
                                    <TableCell className="text-xs">
                                      {coach.classes && coach.classes.length > 0
                                        ? coach.classes.join(', ')
                                        : '-'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

