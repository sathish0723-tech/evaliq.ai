import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDb, COLLECTIONS } from '@/lib/db/collections'
import { randomUUID } from 'crypto'

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions)
        console.log("Interview Generate API: Session Check:", session ? "Session Found" : "No Session")

        if (!session || !session.user) {
            console.log("Interview Generate API: Access Denied")
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { mockName, criteria, duration, level, language } = body
        console.log("Interview Generate API: Request Body:", { mockName, duration, level, language, criteriaLength: criteria?.length })

        if (!mockName || !criteria) {
            console.log("Interview Generate API: Missing Fields")
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const db = await getDb()
        const { id: userId, managementId, email, role } = session.user
        console.log("Interview Generate API: User Details:", { userId, managementId, role })

        // Try to find batch if user is a student
        let batch = null
        if (role === 'student') {
            try {
                const studentsCollection = db.collection(COLLECTIONS.STUDENTS)
                const student = await studentsCollection.findOne({ email: email })
                if (student && student.batch) {
                    batch = student.batch
                }
            } catch (err) {
                console.error("Interview Generate API: Error fetching student batch:", err)
            }
        }

        const interviewId = randomUUID()
        const now = new Date()

        const interviewData = {
            interviewId,
            userId,
            managementId,
            batch,
            mockName,
            criteria,
            duration: duration ? parseInt(duration) : 30,
            level: level || "Intermediate",
            language: language || "English",
            status: 'created',
            createdAt: now,
            updatedAt: now
        }

        console.log("Interview Generate API: Attempting Insert to", COLLECTIONS.INTERVIEW_PROCESS)
        const collection = db.collection(COLLECTIONS.INTERVIEW_PROCESS)
        const result = await collection.insertOne(interviewData)

        console.log("Interview Generate API: Insert Result:", result)

        if (!result.acknowledged) {
            throw new Error("Database insert was not acknowledged")
        }

        return NextResponse.json({
            success: true,
            interviewId,
            message: 'Interview created successfully'
        })

    } catch (error) {
        console.error('Interview Generate API: Critical Error:', error)
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
    }
}

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const db = await getDb()
        // Ensure we handle both id and _id depending on adapter mapping, though auth.js maps to .id
        const userId = session.user.id

        const collection = db.collection(COLLECTIONS.INTERVIEW_PROCESS)
        const interviews = await collection.find({ userId }).sort({ createdAt: -1 }).toArray()

        return NextResponse.json({ interviews })
    } catch (error) {
        console.error('Error fetching interviews:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(req) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const interviewId = searchParams.get('interviewId')

        if (!interviewId) {
            return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 })
        }

        const db = await getDb()
        const collection = db.collection(COLLECTIONS.INTERVIEW_PROCESS)

        // Ensure user can only delete their own interviews
        const result = await collection.deleteOne({
            interviewId: interviewId,
            userId: session.user.id
        })

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Interview not found or unauthorized' }, { status: 404 })
        }

        return NextResponse.json({ success: true, message: 'Interview deleted successfully' })
    } catch (error) {
        console.error('Error deleting interview:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(req) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { interviewId, status } = await req.json()

        if (!interviewId || !status) {
            return NextResponse.json({ error: 'Interview ID and status are required' }, { status: 400 })
        }

        const db = await getDb()
        const collection = db.collection(COLLECTIONS.INTERVIEW_PROCESS)

        const result = await collection.updateOne(
            { interviewId: interviewId, userId: session.user.id },
            { $set: { status, updatedAt: new Date() } }
        )

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Interview not found or unauthorized' }, { status: 404 })
        }

        return NextResponse.json({ success: true, message: `Interview status updated to ${status}` })
    } catch (error) {
        console.error('Error updating interview status:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}


