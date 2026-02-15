"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppSidebar } from '@/components/app-sidebar'
import {
    SidebarInset,
    SidebarProvider,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Tv, Monitor, User, Clock, ChevronLeft, Loader2, Send, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function InterviewSessionPage() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState("")
    const [interimTranscript, setInterimTranscript] = useState("")
    const [timeLeft, setTimeLeft] = useState(null) // Initialize as null to fetch from DB
    const [isStarted, setIsStarted] = useState(false)
    const [aiQuestion, setAiQuestion] = useState("Initializing interview...")
    const [conversation, setConversation] = useState([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [selectedLanguage, setSelectedLanguage] = useState('en-US')
    const [isInitialized, setIsInitialized] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false)
    const [showCompleteDialog, setShowCompleteDialog] = useState(false)
    const [isElevenLabsActive, setIsElevenLabsActive] = useState(true)
    const initializationRef = useRef(false)

    // Language mapping for Speech API
    const LANGUAGE_MAP = {
        'English': 'en-US',
        'Hindi': 'hi-IN',
        'Tamil': 'ta-IN',
        'Telugu': 'te-IN',
        'Spanish': 'es-ES',
        'French': 'fr-FR'
    }

    // Web Speech API
    const recognitionRef = useRef(null)

    useEffect(() => {
        if (initializationRef.current) return
        initializationRef.current = true

        // Fetch interview details to get language
        const fetchInterviewDetails = async () => {
            try {
                // We reuse the generate endpoint which returns all for user, but we need specific one.
                const res = await fetch('/api/interview/generate')
                const data = await res.json()
                const currentInterview = data.interviews?.find(i => i.interviewId === params.interviewId || i._id === params.interviewId)
                console.log("Current interview details:", currentInterview)

                if (currentInterview) {
                    if (currentInterview.status === 'completed') {
                        setIsCompleted(true)
                        setShowCompleteDialog(true)
                    }

                    const langCode = LANGUAGE_MAP[currentInterview.language] || 'en-US'
                    setSelectedLanguage(langCode)
                    initializeSpeech(langCode)

                    if (currentInterview.duration) {
                        const durationInSeconds = parseInt(currentInterview.duration) * 60
                        setTimeLeft(durationInSeconds)
                        console.log("Setting timer to:", durationInSeconds, "seconds")
                    }

                    // Trigger initial AI question
                    triggerInitialQuestion(params.interviewId, langCode)
                } else {
                    const fallbackLang = 'en-US'
                    setSelectedLanguage(fallbackLang)
                    initializeSpeech(fallbackLang)
                }
            } catch (err) {
                console.error("Failed to fetch interview details for language:", err)
                const fallbackLang = 'en-US'
                setSelectedLanguage(fallbackLang)
                initializeSpeech(fallbackLang)
            }
        }

        const initializeSpeech = (langCode) => {
            if (typeof window !== 'undefined') {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
                if (SpeechRecognition) {
                    const recognition = new SpeechRecognition()
                    recognition.continuous = true
                    recognition.interimResults = true
                    recognition.lang = langCode
                    console.log("Speech Recognition Initialized with language:", langCode)

                    recognition.onresult = (event) => {
                        let final = ''
                        let interim = ''
                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                final += event.results[i][0].transcript
                            } else {
                                interim += event.results[i][0].transcript
                            }
                        }
                        if (final) setTranscript(prev => prev + ' ' + final)
                        setInterimTranscript(interim)
                    }

                    recognition.onend = () => {
                        setIsRecording(false)
                    }

                    recognitionRef.current = recognition
                }
            }
        }

        fetchInterviewDetails()

        // Timer Logic
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === 0 && !isCompleted) {
                    handleCompleteSession()
                    return 0
                }
                return (prev !== null && prev > 0 ? prev - 1 : prev)
            })
        }, 1000)

        startSession()

        return () => clearInterval(timer)
    }, [])

    const triggerInitialQuestion = async (id, langCode) => {
        setIsProcessing(true)
        setIsInitialized(true)
        try {
            const response = await fetch('/api/interview/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interviewId: id,
                    userResponse: `[System]: Start the interview in ${Object.keys(LANGUAGE_MAP).find(key => LANGUAGE_MAP[key] === langCode) || 'English'}. Introduce yourself and ask the first question.`,
                    timeRemaining: "INITIAL",
                    isInitial: true
                })
            })

            const data = await response.json()
            if (response.ok) {
                setAiQuestion(data.aiResponse)
                setConversation([{ role: 'ai', content: data.aiResponse }])
                speakText(data.aiResponse, langCode)
            }
        } catch (error) {
            console.error("Error triggering initial question:", error)
        } finally {
            setIsProcessing(false)
        }
    }

    const speakText = async (text, langCode) => {
        // Tier 1: ElevenLabs
        if (isElevenLabsActive) {
            try {
                // Hardcoded defaults as requested
                const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "sk_3961cf481d00280d0ba17abb5fc5b0377cc18fc52f957540";
                const voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "hpp4J3VqNfWAUOO0d1Us";

                if (ELEVENLABS_API_KEY) {
                    console.log("Attempting ElevenLabs TTS...");
                    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'audio/mpeg',
                            'xi-api-key': ELEVENLABS_API_KEY,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            text: text,
                            model_id: "eleven_multilingual_v2",
                            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                        })
                    });

                    if (response.ok) {
                        const audioBlob = await response.blob();
                        const audio = new Audio(URL.createObjectURL(audioBlob));
                        audio.play();
                        return; // Success
                    }
                    const errData = await response.json();
                    console.warn("ElevenLabs TTS failed:", errData.detail?.status || response.status);

                    // If it's a permission issue, deactivate ElevenLabs for this session
                    if (errData.detail?.status === "missing_permissions") {
                        setIsElevenLabsActive(false);
                        console.log("Switching to Google TTS for this session due to ElevenLabs permission issues.");
                    }
                }
            } catch (error) {
                console.error("ElevenLabs error:", error);
            }
        }

        // Tier 2: Google TTS Fallback
        try {
            const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;
            if (GOOGLE_API_KEY && !GOOGLE_API_KEY.includes("YOUR_GOOGLE")) {
                console.log("Attempting Google TTS fallback...");
                const voiceMapping = {
                    'en-US': 'en-US-Neural2-A',
                    'hi-IN': 'hi-IN-Neural2-A',
                    'fr-FR': 'fr-FR-Neural2-A',
                    'es-ES': 'es-ES-Neural2-A',
                    'ta-IN': 'ta-IN-Wavenet-A',
                    'te-IN': 'te-IN-Standard-A'
                };
                const voiceName = voiceMapping[langCode] || `${langCode}-Neural2-A`;

                const response = await fetch(
                    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            input: { text },
                            voice: { languageCode: langCode, name: voiceName },
                            audioConfig: { audioEncoding: 'MP3' }
                        })
                    }
                );

                const data = await response.json();
                if (data.audioContent) {
                    const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
                    audio.play();
                    return; // Success
                }
            }
        } catch (error) {
            console.error("Google TTS error:", error);
        }

        // Tier 3: Browser Fallback
        console.warn("Using browser speech fallback...");
        fallbackSpeakText(text, langCode);
    }

    const fallbackSpeakText = (text, langCode) => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = langCode
            const voices = window.speechSynthesis.getVoices()
            const voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0])) ||
                voices.find(v => v.lang.includes(langCode))
            if (voice) utterance.voice = voice
            utterance.rate = 1
            utterance.pitch = 1
            window.speechSynthesis.speak(utterance)
        }
    }

    const startSession = async () => {
        setIsStarted(false)
        // setAiQuestion has been handled by initial trigger
    }

    const handleCompleteSession = async () => {
        if (isCompleted) return

        setIsCompleted(true)
        setShowCompleteDialog(true)

        try {
            await fetch('/api/interview/generate', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interviewId: params.interviewId,
                    status: 'completed'
                })
            })
            toast({
                title: "Interview Completed",
                description: "The time has reached its limit. Your interview has been saved.",
            })
        } catch (error) {
            console.error("Error completing session:", error)
        }
    }

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            toast({
                title: "Error",
                description: "Speech recognition not supported in this browser.",
                variant: "destructive"
            })
            return
        }

        if (isRecording) {
            recognitionRef.current.stop()
            setIsRecording(false)
            handleSendResponse()
        } else {
            if (!isStarted) setIsStarted(true)
            setTranscript("")
            setInterimTranscript("")

            recognitionRef.current.start()
            setIsRecording(true)
        }
    }

    const handleSendResponse = async () => {
        const fullResponse = transcript + (interimTranscript ? " " + interimTranscript : "")
        if (!fullResponse.trim()) {
            return
        }

        setIsProcessing(true)

        setConversation(prev => [...prev, { role: 'user', content: fullResponse }])

        try {
            const response = await fetch('/api/interview/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interviewId: params.interviewId,
                    userResponse: fullResponse,
                    timeRemaining: formatTime(timeLeft)
                })
            })

            const data = await response.json()

            if (response.ok) {
                setAiQuestion(data.aiResponse)
                setConversation(prev => [...prev, { role: 'ai', content: data.aiResponse }])
                speakText(data.aiResponse, selectedLanguage)
            } else {
                toast({
                    title: "Error",
                    description: "Failed to get AI response.",
                    variant: "destructive"
                })
            }

        } catch (error) {
            console.error("Error sending response:", error)
            toast({
                title: "Error",
                description: "Connection error.",
                variant: "destructive"
            })
        } finally {
            setIsProcessing(false)
            setTranscript("")
            setInterimTranscript("")
        }
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <SidebarProvider defaultOpen={false}>
            <AppSidebar />
            <SidebarInset className="bg-background">
                <div className="flex flex-col h-screen overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-card z-10">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-lg font-semibold flex items-center gap-2">
                                    Mock Interview Session
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {params.interviewId ? params.interviewId.slice(0, 8) + '...' : '...'}
                                    </Badge>
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={isRecording ? "destructive" : "secondary"} className="gap-1.5 py-1.5 px-3">
                                {isRecording && <span className="h-2 w-2 rounded-full bg-white animate-pulse" />}
                                {isRecording ? "Recording" : (isProcessing ? "Processing..." : "Ready")}
                            </Badge>
                            <div className="font-mono text-xl font-medium tabular-nums bg-muted px-3 py-1 rounded-md flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Areas */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">

                        {/* Left Side: TV Screen (Interviewer / Question) */}
                        <div className="bg-black/95 p-8 flex flex-col items-center justify-center relative border-r border-border/10">
                            {/* TV Frame Effect */}
                            <div className="w-full max-w-2xl aspect-video rounded-xl border-4 border-gray-800 bg-gray-900 shadow-2xl relative overflow-hidden flex flex-col transition-all duration-500">
                                {/* Screen Glare/Reflection (Subtle) */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-10" />

                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    <div className="relative h-48 w-48 mb-6">
                                        <img
                                            src="https://media2.dev.to/dynamic/image/width=800%2Cheight=%2Cfit=scale-down%2Cgravity=auto%2Cformat=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fr4dqwpjzzejz7p562bnr.png"
                                            alt="AI Interviewer"
                                            className={`w-full h-full object-contain transition-all duration-500 ${isRecording ? 'scale-110 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' : (isProcessing ? 'animate-pulse drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]')}`}
                                        />
                                    </div>
                                    <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest font-medium">
                                        {isRecording ? "Listening..." : (isProcessing ? "Analyzing Response..." : "AI Interviewer")}
                                    </p>
                                </div>

                                {/* Pseudo-UI for "Video Call" */}
                                <div className="bg-black/50 backdrop-blur-sm p-4 flex justify-between items-center text-white/50 text-xs z-20">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${isProcessing ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                        Connected
                                    </div>
                                    <Tv className="h-4 w-4" />
                                </div>
                            </div>
                        </div>

                        {/* Right Side: User Transcription */}
                        <div className="bg-card flex flex-col relative h-[calc(100vh-4rem)]">
                            <div className="flex-1 p-8 overflow-y-auto">
                                <div className="max-w-2xl mx-auto w-full">

                                    {/* History */}
                                    {conversation.length > 0 && (
                                        <div className="mb-8 space-y-4">
                                            {conversation.map((msg, idx) => (
                                                <div key={idx} className={`p-4 rounded-lg text-sm ${msg.role === 'ai' ? 'bg-muted/50 ml-0 mr-12' : 'bg-primary/10 ml-12 mr-0'}`}>
                                                    <p className="font-semibold mb-1 text-xs uppercase text-muted-foreground">{msg.role}</p>
                                                    {msg.content}
                                                </div>
                                            ))}
                                            <div className="h-px bg-border my-6" />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 mb-6">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${isRecording ? 'bg-red-100 text-red-600' : 'bg-muted'}`}>
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="font-semibold text-lg">Your Response</h2>
                                            <p className="text-sm text-muted-foreground">
                                                {isRecording ? "Speaking..." : "Waiting for input..."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Transcript Box */}
                                    <div className="min-h-[150px] text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap p-4 rounded-md border border-dashed border-border/50 bg-background/50">
                                        {transcript || interimTranscript ? (
                                            <>
                                                {transcript}
                                                <span className="text-muted-foreground">{interimTranscript}</span>
                                                <span className="inline-block w-1.5 h-5 bg-primary ml-1 animate-blink" />
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground/40 italic">
                                                {isProcessing ? "Sending response..." : "Click 'Start Speaking' to answer..."}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Control Bar */}
                            <div className="p-6 border-t bg-background/50 backdrop-blur-sm sticky bottom-0 mb-16 lg:mb-0">
                                <div className="max-w-2xl mx-auto w-full flex items-center justify-center gap-6">
                                    <Button
                                        size="lg"
                                        variant={isRecording ? "destructive" : "default"}
                                        className={`h-14 px-8 rounded-full shadow-lg transition-all ${isRecording ? 'animate-pulse' : 'hover:scale-105'}`}
                                        onClick={toggleRecording}
                                        disabled={isProcessing || isCompleted}
                                    >
                                        {isCompleted ? (
                                            <>
                                                <CheckCircle className="mr-2 h-6 w-6" /> Completed
                                            </>
                                        ) : isRecording ? (
                                            <>
                                                <MicOff className="mr-2 h-6 w-6" /> Stop & Send
                                            </>
                                        ) : (
                                            <>
                                                {isProcessing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Mic className="mr-2 h-6 w-6" />}
                                                {isProcessing ? "Processing..." : "Start Speaking"}
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <p className="text-center text-xs text-muted-foreground mt-4">
                                    {isRecording ? "Click to stop recording and send your answer" : "Click to start recording"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Completion Dialog */}
                <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader className="flex flex-col items-center gap-4 text-center">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <DialogTitle className="text-2xl font-bold">Interview Completed!</DialogTitle>
                                <DialogDescription className="text-base text-muted-foreground">
                                    Great job! You have completed your mock interview session. Your progress has been saved.
                                </DialogDescription>
                            </div>
                        </DialogHeader>
                        <DialogFooter className="mt-6">
                            <Button className="w-full" onClick={() => router.push('/interview')}>
                                Back to Interviews
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SidebarInset>
        </SidebarProvider>
    )
}
