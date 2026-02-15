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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, FileText, Loader2, Play, Trash2, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function InterviewPage() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [mockName, setMockName] = useState("")
    const [criteria, setCriteria] = useState("")
    const [duration, setDuration] = useState("30")
    const [level, setLevel] = useState("Intermediate")
    const [language, setLanguage] = useState("English")
    const [interviews, setInterviews] = useState([])
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        const fetchInterviews = async () => {
            try {
                console.log("Fetching interviews from internal API")
                const res = await fetch('/api/interview/generate')

                if (!res.ok) {
                    console.error("Fetch failed with status:", res.status)
                    throw new Error(`HTTP error! status: ${res.status}`)
                }

                const data = await res.json()
                console.log("Fetched interviews:", data)

                if (data.interviews) {
                    setInterviews(data.interviews)
                }
            } catch (error) {
                console.error("Failed to fetch interviews", error)
            }
        }
        fetchInterviews()
    }, [])

    const handleCreateMock = async () => {
        if (!mockName || !criteria || !duration) return

        setLoading(true)
        try {
            const response = await fetch('/api/interview/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mockName,
                    criteria,
                    duration,
                    level,
                    language
                }),
            })

            const data = await response.json()

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Interview session created successfully.",
                })

                // Add to local list (optimistic update matching DB schema)
                setInterviews(prev => [{
                    interviewId: data.interviewId,
                    mockName,
                    criteria,
                    duration,
                    level,
                    language,
                    createdAt: new Date().toISOString()
                }, ...prev])

                setOpen(false)
                setMockName("")
                setCriteria("")
                setDuration("30")
                setLevel("Intermediate")
                setLanguage("English")

                // Navigate to the new interview page
                router.push(`/interview/${data.interviewId}`)
            } else {
                throw new Error(data.error || "Failed to create interview")
            }
        } catch (error) {
            console.error("Error creating mock:", error)
            toast({
                title: "Error",
                description: "Failed to create interview session. Please try again.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (interviewId) => {
        if (!confirm("Are you sure you want to delete this interview?")) return

        try {
            const response = await fetch(`/api/interview/generate?interviewId=${interviewId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                toast({
                    title: "Deleted",
                    description: "Interview deleted successfully.",
                })
                setInterviews(prev => prev.filter(i => (i.interviewId || i._id) !== interviewId))
            } else {
                const data = await response.json()
                throw new Error(data.error || "Failed to delete interview")
            }
        } catch (error) {
            console.error("Error deleting interview:", error)
            toast({
                title: "Error",
                description: "Failed to delete interview. Please try again.",
                variant: "destructive",
            })
        }
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/dashboard" className="text-xs md:text-sm">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-xs md:text-sm">Interview</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </header>

                <div className="flex flex-1 flex-col p-4 md:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Interview Sessions</h2>
                            <p className="text-muted-foreground">
                                Manage your mock interviews and track your progress.
                            </p>
                        </div>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <PlusCircle className="h-4 w-4" />
                                    New Interview
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Create New Mock Interview</DialogTitle>
                                    <DialogDescription>
                                        Setup your interview parameters to generate specific questions.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-6 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Mock Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. Senior React Developer Interview"
                                            value={mockName}
                                            onChange={(e) => setMockName(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="duration">Duration (Minutes)</Label>
                                            <Input
                                                id="duration"
                                                type="number"
                                                placeholder="30"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                                min="1"
                                                max="180"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Job Level</Label>
                                            <Select value={level} onValueChange={setLevel}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select level" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Beginner">Beginner</SelectItem>
                                                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                                                    <SelectItem value="Advanced">Advanced</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Language</Label>
                                        <Select value={language} onValueChange={setLanguage}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select language" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="English">English</SelectItem>
                                                <SelectItem value="Hindi">Hindi</SelectItem>
                                                <SelectItem value="Tamil">Tamil</SelectItem>
                                                <SelectItem value="Telugu">Telugu</SelectItem>
                                                <SelectItem value="Spanish">Spanish</SelectItem>
                                                <SelectItem value="French">French</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="criteria">Job Description / Topics</Label>
                                        <Textarea
                                            id="criteria"
                                            placeholder="Paste job description or topics (e.g. System Design, AWS, Node.js)..."
                                            className="min-h-[120px] resize-none"
                                            value={criteria}
                                            onChange={(e) => setCriteria(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            The AI will generate questions based on this information.
                                        </p>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
                                    <Button onClick={handleCreateMock} disabled={!mockName || !criteria || !duration || loading}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create & Start
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {interviews.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px] border-2 border-dashed rounded-lg bg-muted/50">
                            <div className="bg-background 4 p-4 rounded-full shadow-sm">
                                <FileText className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <div className="max-w-md space-y-2">
                                <h3 className="text-xl font-semibold">No interviews yet</h3>
                                <p className="text-muted-foreground">
                                    Create your first mock interview to start practicing your skills with AI-generated questions.
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => setOpen(true)}>
                                Create First Interview
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {interviews.map((interview) => (
                                <Card key={interview.interviewId || interview._id} className="group hover:border-primary/50 transition-colors">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="truncate pr-4 text-lg">{interview.mockName}</CardTitle>
                                            <div className="flex items-center gap-2">
                                                {interview.level && (
                                                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">
                                                        {interview.level}
                                                    </Badge>
                                                )}
                                                <div className="bg-secondary text-secondary-foreground text-xs px-2.5 py-0.5 rounded-md font-medium whitespace-nowrap">
                                                    {interview.duration} min
                                                </div>
                                                {interview.status === 'completed' && (
                                                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1 rounded-full">
                                                        <CheckCircle className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <CardDescription className="line-clamp-2 text-xs">
                                            Created {new Date(interview.createdAt).toLocaleDateString()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-3">
                                        <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3em]">
                                            {interview.criteria}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="gap-2">
                                        {interview.status === 'completed' ? (
                                            <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700 pointer-events-none" disabled>
                                                <CheckCircle className="h-4 w-4" /> Already Completed
                                            </Button>
                                        ) : (
                                            <Button className="flex-1 gap-2" onClick={() => router.push(`/interview/${interview.interviewId || interview._id || interview.id}`)}>
                                                <Play className="h-4 w-4" /> Start Session
                                            </Button>
                                        )}
                                        <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => handleDelete(interview.interviewId || interview._id || interview.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
