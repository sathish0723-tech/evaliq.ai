"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
    Calendar as CalendarIcon,
    Clock,
    Plus,
    Search,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    Clock3,
    Video,
    X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import Script from 'next/script'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

function InterviewPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const [interviews, setInterviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
    const [jitsiLoaded, setJitsiLoaded] = useState(false)
    const [activeInterview, setActiveInterview] = useState(null)
    const jitsiContainerRef = useRef(null)
    const jitsiApiRef = useRef(null)

    // Form state for scheduling
    const [formData, setFormData] = useState({
        candidateName: "",
        position: "",
        date: "",
        time: "",
        interviewer: "",
        email: "",
        phone: "",
        duration: "60",
    })

    useEffect(() => {
        fetchInterviews()
    }, [])

    // Auto-join meeting from email link
    useEffect(() => {
        const joinRoomName = searchParams.get('join')
        if (joinRoomName && jitsiLoaded) {
            // Create a mock interview object for direct join
            const directJoinInterview = {
                roomName: joinRoomName,
                candidateName: "Guest",
                position: "Interview",
                interviewer: "Interviewer"
            }

            toast({
                title: "Joining Interview",
                description: "Starting your video interview...",
            })

            // Start the interview
            setTimeout(() => {
                setActiveInterview(directJoinInterview)
                setTimeout(() => {
                    if (jitsiContainerRef.current) {
                        initJitsi(directJoinInterview)
                    }
                }, 100)
            }, 500)
        }
    }, [searchParams, jitsiLoaded])

    const fetchInterviews = async () => {
        setLoading(true)
        try {
            // TODO: Replace with actual API call to fetch interviews
            // Example: const response = await fetch('/api/interviews')
            // const data = await response.json()
            // setInterviews(data.interviews)

            setTimeout(() => {
                setInterviews([]) // Start with empty array
                setLoading(false)
            }, 500)
        } catch (error) {
            console.error('Error fetching interviews:', error)
            toast({
                title: "Error",
                description: "Failed to load interviews",
                variant: "destructive",
            })
            setLoading(false)
        }
    }

    const handleScheduleInterview = async (e) => {
        e.preventDefault()

        // Generate unique room name
        const timestamp = new Date(`${formData.date}T${formData.time}`).getTime()
        const roomName = `interview-${formData.candidateName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`

        const newInterview = {
            id: interviews.length + 1,
            ...formData,
            status: "scheduled",
            roomName,
        }

        try {
            // Call API to schedule interview and send email
            const response = await fetch('/api/interview/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newInterview),
            })

            const data = await response.json()

            if (response.ok) {
                // Add to local state
                setInterviews([...interviews, newInterview])
                setScheduleDialogOpen(false)

                toast({
                    title: "Success!",
                    description: `Interview scheduled successfully! Email sent to ${formData.email}`,
                })
            } else {
                throw new Error(data.error || 'Failed to schedule interview')
            }
        } catch (error) {
            console.error('Error scheduling interview:', error)
            toast({
                title: "Error",
                description: error.message || "Failed to schedule interview. Please try again.",
                variant: "destructive",
            })
            return // Don't reset form on error
        }

        // Reset form
        setFormData({
            candidateName: "",
            position: "",
            date: "",
            time: "",
            interviewer: "",
            email: "",
            phone: "",
            duration: "60",
        })
    }

    const startInterview = (interview) => {
        setActiveInterview(interview)

        // Wait for next tick to ensure container is rendered
        setTimeout(() => {
            if (jitsiContainerRef.current && jitsiLoaded) {
                initJitsi(interview)
            }
        }, 100)
    }

    const initJitsi = (interview) => {
        // Clean up existing instance
        if (jitsiApiRef.current) {
            jitsiApiRef.current.dispose()
            jitsiApiRef.current = null
        }

        const domain = 'meet.jit.si'
        const options = {
            roomName: interview.roomName,
            width: '100%',
            height: 600,
            parentNode: jitsiContainerRef.current,
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: false,
                disableDeepLinking: true,
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone',
                    'camera',
                    'closedcaptions',
                    'desktop',
                    'fullscreen',
                    'fodeviceselection',
                    'hangup',
                    'chat',
                    'recording',
                    'livestreaming',
                    'etherpad',
                    'sharedvideo',
                    'settings',
                    'raisehand',
                    'videoquality',
                    'filmstrip',
                    'stats',
                    'shortcuts',
                    'tileview',
                    'download',
                    'help',
                    'mute-everyone',
                ],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
            },
            userInfo: {
                displayName: interview.interviewer,
                email: 'interviewer@company.com',
            },
        }

        try {
            jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options)

            jitsiApiRef.current.addEventListener('videoConferenceJoined', () => {
                console.log('Joined conference')
            })

            jitsiApiRef.current.addEventListener('videoConferenceLeft', () => {
                console.log('Left conference')
                endInterview()
            })
        } catch (error) {
            console.error('Error initializing Jitsi:', error)
            toast({
                title: "Error",
                description: "Failed to start video conference",
                variant: "destructive",
            })
        }
    }

    const endInterview = () => {
        if (jitsiApiRef.current) {
            jitsiApiRef.current.dispose()
            jitsiApiRef.current = null
        }
        setActiveInterview(null)
    }

    const getStatusBadge = (status) => {
        const statusConfig = {
            scheduled: { variant: "default", label: "Scheduled", icon: Clock3 },
            completed: { variant: "secondary", label: "Completed", icon: UserCheck },
            cancelled: { variant: "destructive", label: "Cancelled", icon: UserX },
        }
        const config = statusConfig[status] || statusConfig.scheduled
        const Icon = config.icon
        return (
            <Badge variant={config.variant} className="gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        )
    }

    const filteredInterviews = interviews.filter(interview => {
        const matchesSearch =
            interview.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            interview.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
            interview.interviewer.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = filterStatus === "all" || interview.status === filterStatus

        return matchesSearch && matchesStatus
    })

    return (
        <>
            <Script
                src="https://meet.jit.si/external_api.js"
                onLoad={() => setJitsiLoaded(true)}
            />

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
                                        <BreadcrumbPage>Interview Process</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                    </header>

                    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                        {/* Active Interview View */}
                        {activeInterview && (
                            <Card className="border-2 border-primary">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Video className="h-5 w-5 text-primary" />
                                                Live Interview: {activeInterview.candidateName}
                                            </CardTitle>
                                            <CardDescription>
                                                Position: {activeInterview.position}
                                            </CardDescription>
                                        </div>
                                        <Button variant="destructive" onClick={endInterview} className="gap-2">
                                            <X className="h-4 w-4" />
                                            End Interview
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        ref={jitsiContainerRef}
                                        className="rounded-lg overflow-hidden bg-gray-900"
                                        style={{ minHeight: '600px' }}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Main Interface (hidden when interview is active) */}
                        {!activeInterview && (
                            <>
                                {/* Header Section */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight">Interview Process</h1>
                                        <p className="text-muted-foreground mt-1">
                                            Manage and track all candidate interviews
                                        </p>
                                    </div>

                                    <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="gap-2">
                                                <Plus className="h-4 w-4" />
                                                Schedule Interview
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[600px]">
                                            <DialogHeader>
                                                <DialogTitle>Schedule New Interview</DialogTitle>
                                                <DialogDescription>
                                                    Fill in the details to schedule a video interview
                                                </DialogDescription>
                                            </DialogHeader>
                                            <form onSubmit={handleScheduleInterview}>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="candidateName">Candidate Name *</Label>
                                                            <Input
                                                                id="candidateName"
                                                                value={formData.candidateName}
                                                                onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="position">Position *</Label>
                                                            <Input
                                                                id="position"
                                                                value={formData.position}
                                                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="date">Date *</Label>
                                                            <Input
                                                                id="date"
                                                                type="date"
                                                                value={formData.date}
                                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="time">Time *</Label>
                                                            <Input
                                                                id="time"
                                                                type="time"
                                                                value={formData.time}
                                                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="email">Email *</Label>
                                                            <Input
                                                                id="email"
                                                                type="email"
                                                                value={formData.email}
                                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="phone">Phone</Label>
                                                            <Input
                                                                id="phone"
                                                                type="tel"
                                                                value={formData.phone}
                                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="interviewer">Interviewer *</Label>
                                                            <Input
                                                                id="interviewer"
                                                                value={formData.interviewer}
                                                                onChange={(e) => setFormData({ ...formData, interviewer: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="duration">Duration (minutes)</Label>
                                                            <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value })}>
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="30">30 minutes</SelectItem>
                                                                    <SelectItem value="45">45 minutes</SelectItem>
                                                                    <SelectItem value="60">60 minutes</SelectItem>
                                                                    <SelectItem value="90">90 minutes</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                                                        Cancel
                                                    </Button>
                                                    <Button type="submit">Schedule Interview</Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>


                                {/* Filters and Search */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Interview List</CardTitle>
                                        <CardDescription>
                                            View and manage all scheduled and completed interviews
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
                                            <div className="flex flex-1 items-center gap-2">
                                                <div className="relative flex-1 max-w-sm">
                                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search candidates, positions, or interviewers..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="pl-8"
                                                    />
                                                </div>
                                            </div>
                                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Filter by status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Status</SelectItem>
                                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                                    <SelectItem value="completed">Completed</SelectItem>
                                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Interviews Table */}
                                        {loading ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="text-muted-foreground">Loading interviews...</div>
                                            </div>
                                        ) : filteredInterviews.length === 0 ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="text-center">
                                                    <p className="text-muted-foreground mb-4">
                                                        {searchQuery || filterStatus !== "all"
                                                            ? "No interviews found matching your filters"
                                                            : "No interviews scheduled yet"}
                                                    </p>
                                                    {!searchQuery && filterStatus === "all" && (
                                                        <Button onClick={() => setScheduleDialogOpen(true)}>
                                                            <Plus className="h-4 w-4 mr-2" />
                                                            Schedule First Interview
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-md border overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Candidate</TableHead>
                                                            <TableHead>Position</TableHead>
                                                            <TableHead>Date & Time</TableHead>
                                                            <TableHead>Interviewer</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead className="text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredInterviews.map((interview) => (
                                                            <TableRow key={interview.id}>
                                                                <TableCell>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{interview.candidateName}</span>
                                                                        <span className="text-sm text-muted-foreground">{interview.email}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="font-medium">{interview.position}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center gap-1 text-sm">
                                                                            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                                                            {format(new Date(interview.date + 'T00:00:00'), 'MMM dd, yyyy')}
                                                                        </div>
                                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                            <Clock className="h-3 w-3" />
                                                                            {interview.time}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>{interview.interviewer}</TableCell>
                                                                <TableCell>{getStatusBadge(interview.status)}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        {interview.status === 'scheduled' && (
                                                                            <Button
                                                                                variant="default"
                                                                                size="sm"
                                                                                className="gap-2"
                                                                                onClick={() => startInterview(interview)}
                                                                            >
                                                                                <Video className="h-4 w-4" />
                                                                                Join Interview
                                                                            </Button>
                                                                        )}
                                                                        <Button variant="ghost" size="icon">
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon">
                                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    )
}

// Wrap in Suspense to handle useSearchParams
export default function InterviewPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InterviewPageContent />
        </Suspense>
    )
}
