"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  Save,
  ArrowLeft,
  Type,
  Highlighter,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const COLOR_PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
  '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
  '#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD',
  '#CC4125', '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6D9EEB', '#6FA8DC', '#8E7CC3', '#C27BA0',
  '#A61C00', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79',
  '#85200C', '#990000', '#B45F06', '#BF9000', '#38761D', '#134F5C', '#1155CC', '#0B5394', '#351C75', '#741B47',
  '#5B0F00', '#660000', '#783F04', '#7F6000', '#274E13', '#0C343D', '#1C4587', '#073763', '#20124D', '#4C1130',
]

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Georgia',
  'Palatino',
  'Garamond',
  'Bookman',
  'Comic Sans MS',
  'Trebuchet MS',
  'Arial Black',
  'Impact',
]

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96]

export default function NoteEditorPage() {
  const router = useRouter()
  const params = useParams()
  const noteId = params.noteId
  const editorRef = useRef(null)
  const titleInputRef = useRef(null)
  const [note, setNote] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fontSize, setFontSize] = useState('14')
  const [fontFamily, setFontFamily] = useState('Arial')
  const [textColor, setTextColor] = useState('#000000')
  const [highlightColor, setHighlightColor] = useState('transparent')
  const { toast } = useToast()

  useEffect(() => {
    if (noteId) {
      fetchNote()
    }
  }, [noteId])

  const fetchNote = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notes?noteId=${noteId}`, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.notes && data.notes.length > 0) {
          const fetchedNote = data.notes[0]
          setNote(fetchedNote)
          setTitle(fetchedNote.title || '')
          setContent(fetchedNote.content || '')
          // Set editor content
          if (editorRef.current) {
            editorRef.current.innerHTML = fetchedNote.content || ''
          }
        } else {
          // New note - initialize with paragraph
          setTitle('')
          setContent('')
          if (editorRef.current) {
            editorRef.current.innerHTML = '<p><br></p>'
          }
        }
      } else {
        // New note - initialize with paragraph
        setTitle('')
        setContent('')
        if (editorRef.current) {
          editorRef.current.innerHTML = '<p><br></p>'
        }
      }
    } catch (error) {
      console.error('Error fetching note:', error)
      setTitle('')
      setContent('')
      if (editorRef.current) {
        editorRef.current.innerHTML = '<p><br></p>'
      }
    } finally {
      setLoading(false)
      // Ensure editor has content after loading
      setTimeout(() => {
        if (editorRef.current && editorRef.current.innerHTML.trim() === '') {
          editorRef.current.innerHTML = '<p><br></p>'
        }
      }, 100)
    }
  }


  const handleManualSave = async () => {
    if (!title.trim() && !editorRef.current?.innerHTML) {
      toast({
        title: "Error",
        description: "Please add a title or content",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const editorContent = editorRef.current?.innerHTML || ''
      const currentContent = editorContent || content

      const checkResponse = await fetch(`/api/notes?noteId=${noteId}`, {
        credentials: 'include',
      })
      
      const checkData = await checkResponse.json()
      const noteExists = checkData.notes && checkData.notes.length > 0

      const url = '/api/notes'
      const method = noteExists ? 'PUT' : 'POST'
      const body = noteExists
        ? {
            noteId: noteId,
            title: title.trim() || 'Untitled',
            content: currentContent,
          }
        : {
            noteId: noteId,
            title: title.trim() || 'Untitled',
            content: currentContent,
          }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Note saved successfully",
        })
        if (!note) {
          setNote(result.note)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save note",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving note:', error)
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getSelection = () => {
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return null
    return selection.getRangeAt(0)
  }

  const applyFormatting = (formatFn) => {
    if (!editorRef.current) return
    
    editorRef.current.focus()
    const range = getSelection()
    
    if (!range || range.collapsed) {
      // No selection, apply to next typed text
      formatFn()
      return
    }

    try {
      formatFn(range)
    } catch (e) {
      console.error('Error applying formatting:', e)
    }
    
    // Update content state
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML)
    }
  }

  const execCommand = (command, value = null) => {
    if (!editorRef.current) return
    editorRef.current.focus()
    document.execCommand(command, false, value)
    // Update content state
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML)
    }
  }

  const formatHeading = (level) => {
    if (!editorRef.current) return
    
    editorRef.current.focus()
    const selection = window.getSelection()
    
    // If no selection, create a range at the end
    if (selection.rangeCount === 0) {
      const range = document.createRange()
      if (editorRef.current.childNodes.length > 0) {
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
      } else {
        range.setStart(editorRef.current, 0)
        range.collapse(true)
      }
      selection.removeAllRanges()
      selection.addRange(range)
    }
    
    const range = selection.getRangeAt(0)
    
    if (level === 'normal') {
      execCommand('formatBlock', '<p>')
    } else {
      // Ensure we have content to format
      if (range.collapsed && (!range.startContainer.textContent || range.startContainer.textContent.trim() === '')) {
        const textNode = document.createTextNode('\u200B') // Zero-width space
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      
      // Use formatBlock to create heading
      execCommand('formatBlock', `<h${level}>`)
      
      // Find and style the heading element immediately
      requestAnimationFrame(() => {
        let current = range.commonAncestorContainer
        if (current.nodeType === 3) {
          current = current.parentElement
        }
        
        // Walk up to find the heading element
        let headingFound = false
        while (current && current !== editorRef.current) {
          if (current.tagName && current.tagName.toLowerCase() === `h${level}`) {
            current.style.fontSize = level === '1' ? '32px' : level === '2' ? '24px' : level === '3' ? '20px' : '18px'
            current.style.fontWeight = 'bold'
            current.style.marginTop = level === '1' ? '24px' : level === '2' ? '20px' : level === '3' ? '16px' : '12px'
            current.style.marginBottom = level === '1' ? '16px' : level === '2' ? '12px' : level === '3' ? '8px' : '8px'
            current.style.lineHeight = '1.2'
            current.style.display = 'block'
            headingFound = true
            break
          }
          current = current.parentElement
        }
        
        // If heading not found, try to find it in the editor
        if (!headingFound) {
          const headings = editorRef.current.querySelectorAll(`h${level}`)
          if (headings.length > 0) {
            const lastHeading = headings[headings.length - 1]
            lastHeading.style.fontSize = level === '1' ? '32px' : level === '2' ? '24px' : level === '3' ? '20px' : '18px'
            lastHeading.style.fontWeight = 'bold'
            lastHeading.style.marginTop = level === '1' ? '24px' : level === '2' ? '20px' : level === '3' ? '16px' : '12px'
            lastHeading.style.marginBottom = level === '1' ? '16px' : level === '2' ? '12px' : level === '3' ? '8px' : '8px'
            lastHeading.style.lineHeight = '1.2'
            lastHeading.style.display = 'block'
          }
        }
        
        if (editorRef.current) {
          setContent(editorRef.current.innerHTML)
        }
        editorRef.current.focus()
      })
    }
    
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML)
    }
  }

  const handleFontSizeChange = (size) => {
    if (!editorRef.current) return
    
    setFontSize(size)
    editorRef.current.focus()
    
    // Use execCommand with styleWithCSS for better control
    execCommand('styleWithCSS', true)
    
    const selection = window.getSelection()
    if (selection.rangeCount === 0) {
      // No selection - create a marker for next typed text
      const marker = document.createElement('span')
      marker.style.fontSize = `${size}px`
      marker.style.display = 'inline-block'
      marker.style.width = '0'
      marker.style.height = '0'
      marker.style.overflow = 'hidden'
      marker.innerHTML = '\u200B' // Zero-width space
      
      const range = selection.getRangeAt(0)
      range.insertNode(marker)
      range.setStartAfter(marker)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }
    
    const range = selection.getRangeAt(0)
    
    if (range.collapsed) {
      // Cursor position - insert marker
      const marker = document.createElement('span')
      marker.style.fontSize = `${size}px`
      marker.style.display = 'inline-block'
      marker.style.width = '0'
      marker.style.height = '0'
      marker.style.overflow = 'hidden'
      marker.innerHTML = '\u200B'
      range.insertNode(marker)
      range.setStartAfter(marker)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      // Has selection - wrap in span
      try {
        const span = document.createElement('span')
        span.style.fontSize = `${size}px`
        const contents = range.extractContents()
        
        // Remove empty spans that might be created
        const walker = document.createTreeWalker(
          contents,
          NodeFilter.SHOW_ELEMENT,
          null,
          false
        )
        const nodesToClean = []
        let node
        while (node = walker.nextNode()) {
          if (node.tagName === 'SPAN' && (!node.textContent.trim() || node.style.fontSize === `${size}px`)) {
            nodesToClean.push(node)
          }
        }
        nodesToClean.forEach(n => {
          const parent = n.parentNode
          while (n.firstChild) {
            parent.insertBefore(n.firstChild, n)
          }
          parent.removeChild(n)
        })
        
        span.appendChild(contents)
        range.insertNode(span)
        
        // Select the newly inserted span
        const newRange = document.createRange()
        newRange.selectNodeContents(span)
        selection.removeAllRanges()
        selection.addRange(newRange)
      } catch (e) {
        console.error('Error applying font size:', e)
        // Fallback: use execCommand
        execCommand('fontSize', '7')
        // Then apply inline style
        const selectedElement = range.commonAncestorContainer.nodeType === 1 
          ? range.commonAncestorContainer 
          : range.commonAncestorContainer.parentElement
        if (selectedElement) {
          selectedElement.style.fontSize = `${size}px`
        }
      }
    }
    
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML)
    }
  }

  const handleFontFamilyChange = (family) => {
    setFontFamily(family)
    if (!editorRef.current) return
    
    editorRef.current.focus()
    const range = getSelection()
    
    if (!range || range.collapsed) {
      execCommand('fontName', family)
      return
    }

    try {
      const span = document.createElement('span')
      span.style.fontFamily = family
      
      if (range.startContainer === range.endContainer && range.startContainer.nodeType === 3) {
        const textNode = range.startContainer
        const text = textNode.textContent
        const beforeText = text.substring(0, range.startOffset)
        const selectedText = text.substring(range.startOffset, range.endOffset)
        const afterText = text.substring(range.endOffset)
        
        const beforeNode = document.createTextNode(beforeText)
        const selectedNode = document.createTextNode(selectedText)
        const afterNode = document.createTextNode(afterText)
        
        span.appendChild(selectedNode)
        
        const parent = textNode.parentNode
        parent.insertBefore(beforeNode, textNode)
        parent.insertBefore(span, textNode)
        parent.insertBefore(afterNode, textNode)
        parent.removeChild(textNode)
      } else {
        const contents = range.extractContents()
        span.appendChild(contents)
        range.insertNode(span)
      }
      
      editorRef.current.focus()
      setContent(editorRef.current.innerHTML)
    } catch (e) {
      execCommand('fontName', family)
      if (editorRef.current) {
        setContent(editorRef.current.innerHTML)
      }
    }
  }

  const handleTextColorChange = (color) => {
    setTextColor(color)
    execCommand('foreColor', color)
  }

  const handleHighlightColorChange = (color) => {
    setHighlightColor(color)
    if (color === 'transparent') {
      execCommand('backColor', 'transparent')
    } else {
      execCommand('backColor', color)
    }
  }

  const updateFormattingState = () => {
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    if (range.collapsed) {
      // Get formatting from the current position
      const container = range.startContainer
      const element = container.nodeType === 3 ? container.parentElement : container
      
      if (element) {
        const computedStyle = window.getComputedStyle(element)
        const fontSize = computedStyle.fontSize
        const fontFamily = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '')
        
        if (fontSize) {
          const size = parseInt(fontSize)
          if (!isNaN(size)) setFontSize(size.toString())
        }
        if (fontFamily) {
          setFontFamily(fontFamily)
        }
      }
    } else {
      // Get formatting from selection
      const container = range.commonAncestorContainer
      const element = container.nodeType === 3 ? container.parentElement : container
      
      if (element) {
        const computedStyle = window.getComputedStyle(element)
        const fontSize = computedStyle.fontSize
        const fontFamily = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '')
        
        if (fontSize) {
          const size = parseInt(fontSize)
          if (!isNaN(size)) setFontSize(size.toString())
        }
        if (fontFamily) {
          setFontFamily(fontFamily)
        }
      }
    }
  }

  const handleEditorChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML)
    }
    updateFormattingState()
  }

  const handleSelectionChange = () => {
    updateFormattingState()
  }

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [])

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-muted-foreground">Loading note...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push('/students/notes')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/students/notes">
                    Notes
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Separator
              orientation="vertical"
              className="h-6 mx-2"
            />
            {/* Title Input in Header */}
            <Input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="flex-1 max-w-md text-lg font-normal border-0 shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2 px-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </header>

        <div className="flex flex-col h-[calc(100vh-4rem)]">
          {/* Formatting Toolbar */}
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
              <TooltipProvider>
                {/* Undo/Redo */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => execCommand('undo')}
                    >
                      <Undo className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => execCommand('redo')}
                    >
                      <Redo className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Heading Selector */}
                <Select onValueChange={formatHeading} defaultValue="normal">
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Normal text" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal text</SelectItem>
                    <SelectItem value="1">Heading 1</SelectItem>
                    <SelectItem value="2">Heading 2</SelectItem>
                    <SelectItem value="3">Heading 3</SelectItem>
                    <SelectItem value="4">Heading 4</SelectItem>
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Font Family */}
                <Select onValueChange={handleFontFamilyChange} value={fontFamily}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Font Size */}
                <Select onValueChange={handleFontSizeChange} value={fontSize}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Text Formatting */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault()
                        if (!editorRef.current) return
                        editorRef.current.focus()
                        execCommand('bold')
                      }}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bold</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault()
                        if (!editorRef.current) return
                        editorRef.current.focus()
                        execCommand('italic')
                      }}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Italic</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault()
                        if (!editorRef.current) return
                        editorRef.current.focus()
                        execCommand('underline')
                      }}
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Underline</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault()
                        if (!editorRef.current) return
                        editorRef.current.focus()
                        execCommand('strikeThrough')
                      }}
                    >
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Strikethrough</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Text Color */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <div className="relative">
                            <Type className="h-4 w-4" />
                            <div 
                              className="absolute bottom-0 left-0 right-0 h-0.5 rounded" 
                              style={{ backgroundColor: textColor }}
                            />
                          </div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Text Color</TooltipContent>
                    </Tooltip>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" side="bottom">
                    <div className="grid grid-cols-10 gap-1">
                      {COLOR_PALETTE.map((color) => (
                        <button
                          key={color}
                          className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => handleTextColorChange(color)}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Highlight Color */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Highlighter className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Highlight Color</TooltipContent>
                    </Tooltip>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" side="bottom">
                    <div className="grid grid-cols-10 gap-1">
                      <button
                        className="w-6 h-6 rounded border hover:scale-110 transition-transform bg-white relative"
                        onClick={() => handleHighlightColorChange('transparent')}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-0.5 bg-red-500 rotate-45" />
                        </div>
                      </button>
                      {COLOR_PALETTE.slice(0, 9).map((color) => (
                        <button
                          key={color}
                          className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => handleHighlightColorChange(color)}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Alignment */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => execCommand('justifyLeft')}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Align Left</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => execCommand('justifyCenter')}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Align Center</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => execCommand('justifyRight')}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Align Right</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => execCommand('justifyFull')}
                    >
                      <AlignJustify className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Justify</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Lists */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => execCommand('insertUnorderedList')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bullet List</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => execCommand('insertOrderedList')}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Numbered List</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 overflow-auto bg-background">
            <div className="max-w-4xl mx-auto px-16 py-8">
              {/* Content Editor */}
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorChange}
                onMouseUp={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                onFocus={(e) => {
                  // Ensure there's at least a paragraph if editor is empty
                  if (!editorRef.current || editorRef.current.innerHTML.trim() === '') {
                    const p = document.createElement('p')
                    p.innerHTML = '<br>'
                    editorRef.current.appendChild(p)
                    // Set cursor to the paragraph
                    const range = document.createRange()
                    const selection = window.getSelection()
                    range.setStart(p, 0)
                    range.collapse(true)
                    selection.removeAllRanges()
                    selection.addRange(range)
                  }
                }}
                onClick={(e) => {
                  // Ensure we can click and type anywhere
                  if (!editorRef.current) return
                  const selection = window.getSelection()
                  if (selection.rangeCount === 0) {
                    const range = document.createRange()
                    range.selectNodeContents(editorRef.current)
                    range.collapse(false)
                    selection.removeAllRanges()
                    selection.addRange(range)
                  }
                }}
                className="min-h-[500px] focus:outline-none prose prose-sm max-w-none dark:prose-invert [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:mt-3 [&_h4]:mb-2 [&_p]:mb-4 [&_p]:leading-7 [&_p]:min-h-[1.5em] [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_li]:mb-2 [&_span]:!text-inherit [&_div]:min-h-[1.5em]"
                style={{
                  lineHeight: '1.75',
                }}
                data-placeholder="Start typing..."
              />
            </div>
          </div>
        </div>

        <style jsx global>{`
          [contenteditable][data-placeholder]:empty:before,
          [contenteditable][data-placeholder]:has(> p:only-child:empty):before,
          [contenteditable][data-placeholder]:has(> div:only-child:empty):before {
            content: attr(data-placeholder);
            color: hsl(var(--muted-foreground));
            pointer-events: none;
            position: absolute;
          }
          [contenteditable] {
            position: relative;
          }
          [contenteditable] p:empty:only-child:before,
          [contenteditable] div:empty:only-child:before {
            content: '';
          }
        `}</style>
      </SidebarInset>
    </SidebarProvider>
  )
}
