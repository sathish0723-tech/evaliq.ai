
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDb, COLLECTIONS } from '@/lib/db/collections'
import { ObjectId } from 'mongodb'

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { interviewId, userResponse, timeRemaining } = await req.json()

        if (!interviewId) {
            return NextResponse.json({ error: 'Missing interviewId' }, { status: 400 })
        }

        const db = await getDb()
        const collection = db.collection(COLLECTIONS.INTERVIEW_PROCESS)
        const userId = session.user.id

        // Fetch the interview to check ownership and context
        const interview = await collection.findOne({
            interviewId: interviewId,
            userId: userId
        })

        if (!interview) {
            return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
        }

        const now = new Date()

        // 1. Save User's Message
        if (userResponse) {
            await collection.updateOne(
                { interviewId: interviewId },
                {
                    $push: {
                        messages: {
                            role: 'user',
                            content: userResponse,
                            timestamp: now
                        }
                    }
                }
            )
        }

        // 2. Generate AI Response
        const backendUrl = process.env.BACK_END_ENDPOINT
        let aiContent = ""

        if (backendUrl) {
            try {
                // Prepare context for the external AI service
                const payload = {
                    interviewId: interview.interviewId,
                    mockName: interview.mockName,
                    criteria: interview.criteria,
                    level: interview.level,
                    language: interview.language || "English",
                    currentTiming: timeRemaining || "00:00",
                    history: interview.messages || [],
                    userResponse: userResponse
                }

                console.log("Calling external backend:", `${backendUrl}/generate_question`)
                const beResponse = await fetch(`${backendUrl}/generate_question`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })

                if (beResponse.ok) {
                    const beData = await beResponse.json()
                    aiContent = beData.question || beData.response
                } else {
                    console.error("External backend returned error:", beResponse.status)
                }
            } catch (err) {
                console.error("Failed to call external backend:", err)
            }
        }

        // Check if content was generated
        if (!aiContent) {
            console.error("No AI response generated")
            return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 })
        }

        // 3. Save AI Message
        await collection.updateOne(
            { interviewId: interviewId },
            {
                $push: {
                    messages: {
                        role: 'ai',
                        content: aiContent,
                        timestamp: new Date()
                    }
                }
            }
        )

        return NextResponse.json({
            success: true,
            aiResponse: aiContent
        })

    } catch (error) {
        console.error('Error in interview chat:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
