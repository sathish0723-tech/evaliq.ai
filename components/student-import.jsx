"use client"

import { useState, useRef } from "react"
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
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { FileUp, Plus, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'

export default function StudentImport({ 
  classId, 
  onImportComplete,
  onColumnsChange 
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [importedData, setImportedData] = useState([])
  const [availableColumns, setAvailableColumns] = useState([])
  const [selectedColumns, setSelectedColumns] = useState([])
  const [columnRenames, setColumnRenames] = useState({}) // Maps original column name to new name
  const [newFields, setNewFields] = useState([]) // Array of { name: '', defaultValue: '' }
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef(null)
  const { toast } = useToast()

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input to allow selecting the same file again
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
      const headers = jsonData[0].map((h, idx) => {
        const header = String(h || `Column ${idx + 1}`).trim()
        return header || `Column ${idx + 1}`
      })
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''))

      if (rows.length === 0) {
        toast({
          title: "Error",
          description: "No data rows found in the file",
          variant: "destructive",
        })
        return
      }

      // Convert rows to objects
      const data = rows.map(row => {
        const obj = {}
        headers.forEach((header, idx) => {
          obj[header] = row[idx] || ''
        })
        return obj
      })

      setImportedData(data)
      setAvailableColumns(headers)
      setSelectedColumns(headers)
      setColumnRenames({})
      setNewFields([])
      setIsDialogOpen(true)
    } catch (error) {
      console.error('Error parsing file:', error)
      toast({
        title: "Error",
        description: "Failed to parse file. Please check the file format.",
        variant: "destructive",
      })
    }
  }

  const handleColumnToggle = (column) => {
    setSelectedColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(c => c !== column)
      } else {
        return [...prev, column]
      }
    })
  }

  const handleColumnRename = (originalName, newName) => {
    setColumnRenames(prev => ({
      ...prev,
      [originalName]: newName
    }))
  }

  const getDisplayName = (column) => {
    return columnRenames[column] || column
  }

  const handleAddNewField = () => {
    setNewFields(prev => [...prev, { name: '', defaultValue: '' }])
  }

  const handleRemoveNewField = (index) => {
    setNewFields(prev => prev.filter((_, i) => i !== index))
  }

  const handleNewFieldChange = (index, field, value) => {
    setNewFields(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleImportConfirm = async () => {
    if (selectedColumns.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one column to import",
        variant: "destructive",
      })
      return
    }

    // Validate new fields
    const invalidFields = newFields.filter(f => f.name && !f.name.trim())
    if (invalidFields.length > 0) {
      toast({
        title: "Error",
        description: "Please provide names for all new fields",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    setImportProgress({ current: 0, total: importedData.length })

    try {
      const { getSelectedBatch } = await import('@/lib/utils-batch')
      const batch = getSelectedBatch()

      // Helper function to find column value with multiple possible names
      const findColumnValue = (row, possibleNames) => {
        for (const name of possibleNames) {
          if (row[name] !== undefined && row[name] !== '') {
            return row[name]
          }
        }
        return ''
      }

      // Process data in batches to handle large imports
      const BATCH_SIZE = 50
      let successCount = 0
      let errorCount = 0
      const allMappedStudents = []

      for (let i = 0; i < importedData.length; i += BATCH_SIZE) {
        const batchData = importedData.slice(i, i + BATCH_SIZE)
        
        const mappedStudents = batchData.map((row, idx) => {
          const student = {
            name: findColumnValue(row, ['Name', 'name', 'Student Name', 'StudentName', 'Full Name', 'FullName']),
            email: findColumnValue(row, ['Email', 'email', 'E-mail', 'Email Address']),
            phone: findColumnValue(row, ['Phone', 'phone', 'Phone Number', 'PhoneNumber', 'Mobile', 'mobile']),
            batch: findColumnValue(row, ['Batch', 'batch', 'Batch Number', 'BatchNumber']) || batch,
            photo: findColumnValue(row, ['Photo', 'photo', 'Picture', 'picture', 'Image', 'image']),
            classId: classId || '',
          }

          // Add selected columns as custom fields
          selectedColumns.forEach(originalCol => {
            const displayName = getDisplayName(originalCol)
            if (!['Name', 'name', 'Email', 'email', 'Phone', 'phone', 'Batch', 'batch', 'Photo', 'photo', 'Picture', 'picture', 'Image', 'image'].includes(originalCol)) {
              student[displayName] = row[originalCol] || ''
            }
          })

          // Add new fields with default values
          newFields.forEach(field => {
            if (field.name.trim()) {
              student[field.name.trim()] = field.defaultValue || ''
            }
          })

          return student
        }).filter(s => s.name && s.email) // Only include students with required fields

        allMappedStudents.push(...mappedStudents)

        // Import batch
        for (const student of mappedStudents) {
          try {
            const response = await fetch('/api/students', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(student),
            })

            if (response.ok) {
              successCount++
            } else {
              const error = await response.json()
              console.error('Error importing student:', error)
              errorCount++
            }
          } catch (error) {
            console.error('Error importing student:', error)
            errorCount++
          }
          
          setImportProgress({ current: successCount + errorCount, total: importedData.length })
        }

        // Small delay to prevent overwhelming the server
        if (i + BATCH_SIZE < importedData.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Update displayed columns
      const displayColumns = selectedColumns.map(col => getDisplayName(col))
      if (onColumnsChange) {
        onColumnsChange(displayColumns)
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} students${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
      })

      if (onImportComplete) {
        onImportComplete()
      }

      // Reset state
      setIsDialogOpen(false)
      setImportedData([])
      setAvailableColumns([])
      setSelectedColumns([])
      setColumnRenames({})
      setNewFields([])
      setImportProgress({ current: 0, total: 0 })
    } catch (error) {
      console.error('Error during import:', error)
      toast({
        title: "Error",
        description: "Failed to import students",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    if (isImporting) return // Prevent closing during import
    
    setIsDialogOpen(false)
    setImportedData([])
    setAvailableColumns([])
    setSelectedColumns([])
    setColumnRenames({})
    setNewFields([])
    setImportProgress({ current: 0, total: 0 })
  }

  return (
    <>
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
        className="font-normal"
        onClick={handleFileSelect}
      >
        <FileUp className="mr-2 h-4 w-4" />
        Import
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
            <DialogDescription>
              Select columns to import, rename them if needed, and add custom fields
            </DialogDescription>
          </DialogHeader>
          
          {isImporting ? (
            <div className="py-8">
              <div className="text-center space-y-4">
                <div className="text-lg font-medium">Importing students...</div>
                <div className="text-sm text-muted-foreground">
                  {importProgress.current} of {importProgress.total} processed
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 py-4">
              {/* Available Columns Section */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Available Columns ({selectedColumns.length} selected)
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedColumns.length === availableColumns.length) {
                        setSelectedColumns([])
                      } else {
                        setSelectedColumns([...availableColumns])
                      }
                    }}
                  >
                    {selectedColumns.length === availableColumns.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  {availableColumns.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No columns available</p>
                  ) : (
                    <div className="space-y-3">
                      {availableColumns.map((column) => {
                        const isSelected = selectedColumns.includes(column)
                        const displayName = getDisplayName(column)
                        return (
                          <div key={column} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                            <Checkbox
                              id={`column-${column}`}
                              checked={isSelected}
                              onCheckedChange={() => handleColumnToggle(column)}
                            />
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div className="text-sm font-medium text-muted-foreground">
                                {column}
                              </div>
                              {isSelected && (
                                <Input
                                  placeholder="Rename column..."
                                  value={displayName}
                                  onChange={(e) => handleColumnRename(column, e.target.value)}
                                  className="h-8 text-sm"
                                />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Fields Section */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Custom Fields</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewField}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                  </Button>
                </div>
                {newFields.length > 0 && (
                  <div className="border rounded-lg p-4 space-y-2">
                    {newFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="Field name"
                          value={field.name}
                          onChange={(e) => handleNewFieldChange(index, 'name', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Default value (optional)"
                          value={field.defaultValue}
                          onChange={(e) => handleNewFieldChange(index, 'defaultValue', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveNewField(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview Section */}
              {importedData.length > 0 && selectedColumns.length > 0 && (
                <div className="grid gap-3">
                  <Label className="text-base font-semibold">
                    Preview Data ({importedData.length} rows)
                  </Label>
                  <div className="border rounded-lg p-4 max-h-[300px] overflow-auto">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            {selectedColumns.map((col) => {
                              const displayName = getDisplayName(col)
                              return (
                                <th key={col} className="text-left p-2 font-medium sticky top-0 bg-background">
                                  {displayName}
                                </th>
                              )
                            })}
                            {newFields.filter(f => f.name.trim()).map((field, idx) => (
                              <th key={`new-${idx}`} className="text-left p-2 font-medium sticky top-0 bg-background">
                                {field.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importedData.slice(0, 10).map((row, idx) => (
                            <tr key={idx} className="border-b">
                              {selectedColumns.map((col) => (
                                <td key={col} className="p-2 text-muted-foreground">
                                  {row[col] || '-'}
                                </td>
                              ))}
                              {newFields.filter(f => f.name.trim()).map((field, fieldIdx) => (
                                <td key={`new-${fieldIdx}`} className="p-2 text-muted-foreground">
                                  {field.defaultValue || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importedData.length > 10 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Showing first 10 of {importedData.length} rows
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleImportConfirm}
              disabled={isImporting || selectedColumns.length === 0}
            >
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

