"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FileUp, Plus, X, Upload, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getUserInitials } from '@/lib/utils-user'
import * as XLSX from 'xlsx'

export default function StudentUploadTable({ classId, onSaveComplete }) {
  const [students, setStudents] = useState([])
  const [columns, setColumns] = useState([
    { id: 'rollNumber', label: 'Roll Number', type: 'text', required: true },
    { id: 'name', label: 'Student Name', type: 'text', required: true },
    { id: 'image', label: 'Image', type: 'image', required: false },
    { id: 'email', label: 'Email', type: 'email', required: true },
    { id: 'phone', label: 'Phone Number', type: 'tel', required: false },
    { id: 'village', label: 'Village', type: 'text', required: false },
    { id: 'parentDetails', label: 'Parent Details', type: 'text', required: false },
  ])
  const [studentCount, setStudentCount] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef(null)
  const { toast } = useToast()

  // Initialize with empty student when count changes
  useEffect(() => {
    if (studentCount > 0) {
      const newStudents = Array.from({ length: studentCount }, (_, index) => {
        const student = { id: `temp-${Date.now()}-${index}` }
        columns.forEach(col => {
          student[col.id] = ''
        })
        return student
      })
      setStudents(newStudents)
    } else {
      setStudents([])
    }
  }, [studentCount, columns.length])

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input
    e.target.value = ''

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast({
        title: "Error",
        description: "Please select a CSV or Excel file",
        variant: "destructive",
      })
      return
    }

    try {
      const fileData = await file.arrayBuffer()
      const workbook = XLSX.read(fileData, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

      if (jsonData.length === 0) {
        toast({
          title: "Error",
          description: "The file appears to be empty",
          variant: "destructive",
        })
        return
      }

      // First row should be headers
      const headers = jsonData[0].map((h, idx) => String(h || `Column ${idx + 1}`).trim())
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''))

      if (rows.length === 0) {
        toast({
          title: "Error",
          description: "No data rows found in the file",
          variant: "destructive",
        })
        return
      }

      // Map headers to column IDs
      const headerToColumnId = {}
      headers.forEach((header, idx) => {
        const lowerHeader = header.toLowerCase().replace(/\s+/g, '')
        // Try to match with existing columns
        const matchedColumn = columns.find(col => {
          const lowerColLabel = col.label.toLowerCase().replace(/\s+/g, '')
          return lowerHeader.includes(lowerColLabel) || lowerColLabel.includes(lowerHeader)
        })
        if (matchedColumn) {
          headerToColumnId[header] = matchedColumn.id
        } else {
          // Create new column for unmapped headers
          const newColumnId = `custom_${header.replace(/\s+/g, '_').toLowerCase()}`
          headerToColumnId[header] = newColumnId
          // Add new column if it doesn't exist
          if (!columns.find(col => col.id === newColumnId)) {
            setColumns(prev => [...prev, {
              id: newColumnId,
              label: header,
              type: 'text',
              required: false,
              isCustom: true
            }])
          }
        }
      })

      // Convert rows to student objects
      const importedStudents = rows.map((row, idx) => {
        const student = { id: `imported-${Date.now()}-${idx}` }
        headers.forEach((header, colIdx) => {
          const columnId = headerToColumnId[header] || `custom_${header.replace(/\s+/g, '_').toLowerCase()}`
          student[columnId] = row[colIdx] || ''
        })
        // Ensure all columns have values
        columns.forEach(col => {
          if (student[col.id] === undefined) {
            student[col.id] = ''
          }
        })
        return student
      })

      setStudents(importedStudents)
      setStudentCount(importedStudents.length)
      toast({
        title: "Success",
        description: `Imported ${importedStudents.length} students from file`,
      })
    } catch (error) {
      console.error('Error parsing file:', error)
      toast({
        title: "Error",
        description: "Failed to parse file. Please check the file format.",
        variant: "destructive",
      })
    }
  }

  const handleAddColumn = () => {
    const newColumnId = `custom_${Date.now()}`
    const newColumn = {
      id: newColumnId,
      label: 'New Column',
      type: 'text',
      required: false,
      isCustom: true,
      isEditing: true
    }
    setColumns([...columns, newColumn])
    
    // Add empty value for this column to all existing students
    setStudents(prev => prev.map(student => ({
      ...student,
      [newColumnId]: ''
    })))
  }

  const handleColumnLabelChange = (columnId, newLabel) => {
    if (!newLabel || newLabel.trim() === '') {
      // If label is empty, keep editing or use default
      return
    }
    setColumns(prev => prev.map(col => 
      col.id === columnId 
        ? { ...col, label: newLabel.trim(), isEditing: false }
        : col
    ))
  }

  const handleColumnEditStart = (columnId) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId 
        ? { ...col, isEditing: true }
        : { ...col, isEditing: false }
    ))
  }

  const handleColumnDelete = (columnId) => {
    // Don't allow deleting required columns
    const column = columns.find(col => col.id === columnId)
    if (column?.required) {
      toast({
        title: "Error",
        description: "Cannot delete required columns",
        variant: "destructive",
      })
      return
    }

    setColumns(prev => prev.filter(col => col.id !== columnId))
    setStudents(prev => prev.map(student => {
      const newStudent = { ...student }
      delete newStudent[columnId]
      return newStudent
    }))
  }

  const handleStudentChange = (studentId, columnId, value) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId
        ? { ...student, [columnId]: value }
        : student
    ))
  }

  const handleImageUpload = async (studentId, file) => {
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
        handleStudentChange(studentId, 'image', uploadResult.url)
        toast({
          title: "Success",
          description: "Image uploaded successfully",
        })
      } else {
        toast({
          title: "Error",
          description: uploadResult.error || "Failed to upload image",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      })
    }
  }

  const handleRemoveStudent = (studentId) => {
    setStudents(prev => prev.filter(student => student.id !== studentId))
    setStudentCount(prev => prev - 1)
  }

  const handleSave = async () => {
    // Validate required fields
    const requiredColumns = columns.filter(col => col.required)
    const invalidStudents = []

    students.forEach((student, index) => {
      const missingFields = requiredColumns.filter(col => !student[col.id] || student[col.id].toString().trim() === '')
      if (missingFields.length > 0) {
        invalidStudents.push({
          row: index + 1,
          fields: missingFields.map(col => col.label).join(', ')
        })
      }
    })

    if (invalidStudents.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill required fields for row(s): ${invalidStudents.map(s => s.row).join(', ')}`,
        variant: "destructive",
      })
      return
    }

    if (students.length === 0) {
      toast({
        title: "Error",
        description: "No students to save",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const { getSelectedBatch } = await import('@/lib/utils-batch')
      const batch = getSelectedBatch()

      let successCount = 0
      let errorCount = 0

      // Save students in batches
      const BATCH_SIZE = 50
      for (let i = 0; i < students.length; i += BATCH_SIZE) {
        const batchStudents = students.slice(i, i + BATCH_SIZE)
        
        for (const student of batchStudents) {
          try {
            // Prepare student data
            const studentData = {
              name: student.name || '',
              email: student.email || '',
              phone: student.phone || '',
              photo: student.image || '',
              classId: classId,
              batch: batch,
            }

            // Add all custom fields (including rollNumber, village, parentDetails, etc.)
            columns.forEach(col => {
              if (!['name', 'email', 'phone', 'image'].includes(col.id)) {
                // Use column label as the field name for custom fields
                studentData[col.label] = student[col.id] || ''
              }
            })

            const response = await fetch('/api/students', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(studentData),
            })

            if (response.ok) {
              successCount++
            } else {
              const error = await response.json()
              console.error('Error saving student:', error)
              errorCount++
            }
          } catch (error) {
            console.error('Error saving student:', error)
            errorCount++
          }
        }

        // Small delay between batches
        if (i + BATCH_SIZE < students.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      toast({
        title: "Save Complete",
        description: `Successfully saved ${successCount} students${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
      })

      if (onSaveComplete) {
        onSaveComplete()
      }

      // Clear the table
      setStudents([])
      setStudentCount(0)
    } catch (error) {
      console.error('Error saving students:', error)
      toast({
        title: "Error",
        description: "Failed to save students",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label htmlFor="student-count">Number of Students:</Label>
          <Input
            id="student-count"
            type="number"
            min="0"
            value={studentCount}
            onChange={(e) => setStudentCount(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-24"
            placeholder="0"
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileImport}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp className="mr-2 h-4 w-4" />
          Import from File
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddColumn}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Column
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || students.length === 0}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Students'}
        </Button>
      </div>

      {/* Table */}
      {students.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                {columns.map((column) => (
                  <TableHead key={column.id} className="min-w-[150px]">
                    <div className="flex items-center gap-2">
                      {column.isEditing ? (
                        <Input
                          value={column.label}
                          onChange={(e) => {
                            setColumns(prev => prev.map(col => 
                              col.id === column.id 
                                ? { ...col, label: e.target.value }
                                : col
                            ))
                          }}
                          onBlur={(e) => handleColumnLabelChange(column.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleColumnLabelChange(column.id, e.target.value)
                            } else if (e.key === 'Escape') {
                              setColumns(prev => prev.map(col => 
                                col.id === column.id 
                                  ? { ...col, isEditing: false }
                                  : col
                              ))
                            }
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="text-sm cursor-pointer hover:underline"
                          onClick={() => column.isCustom && handleColumnEditStart(column.id)}
                          title={column.isCustom ? "Click to edit" : ""}
                        >
                          {column.label}
                          {column.required && <span className="text-destructive ml-1">*</span>}
                        </span>
                      )}
                      {column.isCustom && !column.isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleColumnDelete(column.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      {column.id === 'image' ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-10 w-10">
                            {student.image && (
                              <AvatarImage src={student.image} alt={student.name || 'Student'} />
                            )}
                            <AvatarFallback>
                              {getUserInitials(student.name || 'Student')}
                            </AvatarFallback>
                          </Avatar>
                          <label className="cursor-pointer">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              asChild
                            >
                              <span>
                                <Upload className="h-3 w-3 mr-1" />
                                Upload
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleImageUpload(student.id, file)
                                }
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <Input
                          type={column.type}
                          value={student[column.id] || ''}
                          onChange={(e) => handleStudentChange(student.id, column.id, e.target.value)}
                          placeholder={`Enter ${column.label.toLowerCase()}`}
                          className="h-8 text-sm"
                          required={column.required}
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleRemoveStudent(student.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {students.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Enter number of students or import from file to get started</p>
        </div>
      )}
    </div>
  )
}

