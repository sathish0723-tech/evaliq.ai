"use client"

import { useState, useEffect } from "react"
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, X, Trash2, Edit, Calendar, Image as ImageIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getSelectedBatch } from '@/lib/utils-batch'

export default function MemoriesPage() {
  const [memories, setMemories] = useState([])
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMemory, setEditingMemory] = useState(null)
  const [selectedImages, setSelectedImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    data: '',
    batch: '',
  })

  useEffect(() => {
    fetchBatches()
  }, [])

  useEffect(() => {
    const batch = getSelectedBatch()
    if (batch) {
      setSelectedBatch(batch)
      setFormData(prev => ({ ...prev, batch }))
    }
  }, [])

  useEffect(() => {
    if (selectedBatch) {
      fetchMemories()
    }
  }, [selectedBatch])

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setBatches(data.batches || [])
        if (data.batches && data.batches.length > 0) {
          const savedBatch = getSelectedBatch()
          if (savedBatch && data.batches.includes(savedBatch)) {
            setSelectedBatch(savedBatch)
            setFormData(prev => ({ ...prev, batch: savedBatch }))
          } else {
            setSelectedBatch(data.batches[0])
            setFormData(prev => ({ ...prev, batch: data.batches[0] }))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching batches:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMemories = async () => {
    if (!selectedBatch) return
    
    try {
      const url = `/api/memories?batch=${encodeURIComponent(selectedBatch)}`
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setMemories(data.memories || [])
      }
    } catch (error) {
      console.error('Error fetching memories:', error)
    }
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    
    if (selectedImages.length + files.length > 25) {
      toast({
        title: "Error",
        description: "Maximum 25 images allowed",
        variant: "destructive",
      })
      return
    }

    const newImages = [...selectedImages, ...files]
    setSelectedImages(newImages)

    // Create previews
    const newPreviews = []
    newImages.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push({ file, preview: reader.result })
        if (newPreviews.length === newImages.length) {
          setImagePreviews(newPreviews)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setSelectedImages(newImages)
    setImagePreviews(newPreviews)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      data: '',
      batch: selectedBatch || '',
    })
    setSelectedImages([])
    setImagePreviews([])
    setEditingMemory(null)
  }

  const handleAddMemory = async () => {
    if (!formData.name || !formData.date || !formData.batch) {
      toast({
        title: "Error",
        description: "Memory name, date, and batch are required",
        variant: "destructive",
      })
      return
    }

    if (selectedImages.length === 0) {
      toast({
        title: "Error",
        description: "At least one image is required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('date', formData.date)
      formDataToSend.append('data', formData.data)
      formDataToSend.append('batch', formData.batch)

      selectedImages.forEach((file, index) => {
        formDataToSend.append(`image${index}`, file)
      })

      const response = await fetch('/api/memories', {
        method: 'POST',
        credentials: 'include',
        body: formDataToSend,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Memory created successfully",
        })
        setIsAddDialogOpen(false)
        resetForm()
        fetchMemories()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create memory",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating memory:', error)
      toast({
        title: "Error",
        description: "Failed to create memory",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditMemory = (memory) => {
    setEditingMemory(memory)
    setFormData({
      name: memory.name,
      date: memory.date ? new Date(memory.date).toISOString().split('T')[0] : '',
      data: memory.data || '',
      batch: memory.batch || selectedBatch,
    })
    setSelectedImages([])
    setImagePreviews([])
    setIsEditDialogOpen(true)
  }

  const handleUpdateMemory = async () => {
    if (!editingMemory || !formData.name || !formData.date || !formData.batch) {
      toast({
        title: "Error",
        description: "Memory name, date, and batch are required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('memoryId', editingMemory.memoryId)
      formDataToSend.append('name', formData.name)
      formDataToSend.append('date', formData.date)
      formDataToSend.append('data', formData.data)
      formDataToSend.append('batch', formData.batch)

      selectedImages.forEach((file, index) => {
        formDataToSend.append(`image${index}`, file)
      })

      const response = await fetch('/api/memories', {
        method: 'PUT',
        credentials: 'include',
        body: formDataToSend,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Memory updated successfully",
        })
        setIsEditDialogOpen(false)
        resetForm()
        fetchMemories()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update memory",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating memory:', error)
      toast({
        title: "Error",
        description: "Failed to update memory",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMemory = async (memoryId) => {
    if (!confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/memories?memoryId=${memoryId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Memory deleted successfully",
        })
        fetchMemories()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete memory",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting memory:', error)
      toast({
        title: "Error",
        description: "Failed to delete memory",
        variant: "destructive",
      })
    }
  }

  const handleBatchChange = (batch) => {
    setSelectedBatch(batch)
    setFormData(prev => ({ ...prev, batch }))
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
                  <BreadcrumbPage>Memories</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Memories</h1>
              <p className="text-sm text-muted-foreground">
                Manage and view memories with photos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedBatch} onValueChange={handleBatchChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch} value={batch}>
                      {batch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open)
                if (!open) resetForm()
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Memory
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Memory</DialogTitle>
                    <DialogDescription>
                      Create a new memory with photos (max 25 images)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Memory Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Graduation Day 2024"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch">Batch *</Label>
                      <Select value={formData.batch} onValueChange={(value) => setFormData({ ...formData, batch: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch" />
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
                    <div className="space-y-2">
                      <Label htmlFor="data">Description</Label>
                      <Textarea
                        id="data"
                        value={formData.data}
                        onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                        placeholder="Add a description for this memory..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="images">Images * (Max 25)</Label>
                      <Input
                        id="images"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">
                        Selected: {selectedImages.length} / 25 images
                      </p>
                      {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden border">
                                <img
                                  src={preview.preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setIsAddDialogOpen(false)
                      resetForm()
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddMemory} disabled={saving}>
                      {saving ? 'Creating...' : 'Create Memory'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : memories.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No memories found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedBatch ? `for batch ${selectedBatch}` : 'Select a batch to view memories'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {memories.map((memory) => (
                <Card key={memory.memoryId}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{memory.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" />
                          {memory.date ? new Date(memory.date).toLocaleDateString() : 'No date'}
                        </CardDescription>
                        <CardDescription className="mt-1">
                          Batch: {memory.batch}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditMemory(memory)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteMemory(memory.memoryId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {memory.data && (
                      <p className="text-sm text-muted-foreground mb-4">{memory.data}</p>
                    )}
                    {memory.images && memory.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {memory.images.slice(0, 4).map((image, index) => (
                          <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                            <img
                              src={image.url}
                              alt={`${memory.name} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {memory.images.length > 4 && (
                          <div className="aspect-square rounded-lg border flex items-center justify-center bg-muted">
                            <span className="text-sm text-muted-foreground">
                              +{memory.images.length - 4} more
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Memory</DialogTitle>
              <DialogDescription>
                Update memory details and add more photos (max 25 total)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Memory Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Graduation Day 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-batch">Batch *</Label>
                <Select value={formData.batch} onValueChange={(value) => setFormData({ ...formData, batch: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
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
              <div className="space-y-2">
                <Label htmlFor="edit-data">Description</Label>
                <Textarea
                  id="edit-data"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  placeholder="Add a description for this memory..."
                  rows={4}
                />
              </div>
              {editingMemory && editingMemory.images && editingMemory.images.length > 0 && (
                <div className="space-y-2">
                  <Label>Existing Images ({editingMemory.images.length})</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {editingMemory.images.map((image, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                        <img
                          src={image.url}
                          alt={`Existing ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can add up to {25 - editingMemory.images.length} more images
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-images">Add More Images</Label>
                <Input
                  id="edit-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedImages.length} / {editingMemory ? Math.max(0, 25 - (editingMemory.images?.length || 0)) : 25} images
                </p>
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border">
                          <img
                            src={preview.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateMemory} disabled={saving}>
                {saving ? 'Updating...' : 'Update Memory'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}

