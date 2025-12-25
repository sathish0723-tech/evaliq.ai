import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/batches
 * Get all unique batches for the current management
 */
export async function GET(request) {
  try {
    await initializeCollections(DB_NAME)
    
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const db = await getDb(DB_NAME)
    const batchesCollection = db.collection('batches')
    const studentsCollection = db.collection('students')

    // Get all batches from batches collection
    const batchDocs = await batchesCollection
      .find({ managementId: session.managementId })
      .sort({ batchName: 1 })
      .toArray()

    // Also get batches from students (for backward compatibility)
    const studentBatches = await studentsCollection.distinct('batch', {
      managementId: session.managementId,
      batch: { $exists: true, $ne: '' }
    })

    // Combine both sources and remove duplicates
    const allBatches = new Set()
    batchDocs.forEach(b => allBatches.add(b.batchName))
    studentBatches.forEach(b => allBatches.add(b))

    // Sort batches (Batch-1, Batch-2, etc.)
    const sortedBatches = Array.from(allBatches).sort((a, b) => {
      const numA = parseInt(a.replace('Batch-', '')) || 0
      const numB = parseInt(b.replace('Batch-', '')) || 0
      return numA - numB
    })

    return NextResponse.json({ batches: sortedBatches })
  } catch (error) {
    console.error('Batches API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/batches
 * Create a new batch or get students/coaches for a batch
 */
export async function POST(request) {
  try {
    await initializeCollections(DB_NAME)
    
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, batchName, studentId, newBatch, coachId } = body

    const db = await getDb(DB_NAME)
    const studentsCollection = db.collection('students')
    const coachesCollection = db.collection('coaches')

    if (action === 'getBatchData') {
      // Get students and coaches for a specific batch
      // Normalize batch name to ensure exact match
      const normalizedBatchName = batchName.trim()
      
      console.log(`[Batch API] Fetching data for batch: "${normalizedBatchName}"`)
      
      // Use aggregation with $match to ensure exact batch filtering
      const students = await studentsCollection.aggregate([
        {
          $match: {
            managementId: session.managementId,
            batch: normalizedBatchName, // Exact match
          }
        },
        {
          $sort: { name: 1 }
        }
      ]).toArray()
      
      console.log(`[Batch API] Found ${students.length} students for batch: "${normalizedBatchName}"`)
      
      // Log sample student batches for debugging
      if (students.length > 0) {
        console.log(`[Batch API] Sample student batches:`, students.slice(0, 3).map(s => s.batch))
      } else {
        console.log(`[Batch API] No students found for batch: "${normalizedBatchName}"`)
      }

      // Get coaches - we'll check which coaches are assigned to classes that have students in this batch
      const classIds = [...new Set(students.map(s => s.classId).filter(Boolean))]
      
      const classesCollection = db.collection('classes')
      const classes = await classesCollection
        .find({
          classId: { $in: classIds },
          managementId: session.managementId,
        })
        .toArray()

      const coachIds = [...new Set(classes.map(c => c.coachId).filter(Boolean))]
      const coaches = await coachesCollection
        .find({
          coachId: { $in: coachIds },
          managementId: session.managementId,
        })
        .toArray()

      // Map coaches to their classes
      const coachesWithClasses = coaches.map(coach => {
        const coachClasses = classes
          .filter(c => c.coachId === coach.coachId)
          .map(c => c.name)
        return {
          id: coach._id.toString(),
          coachId: coach.coachId,
          name: coach.name,
          email: coach.email,
          classes: coachClasses,
        }
      })

      return NextResponse.json({
        students: students.map(s => ({
          id: s._id.toString(),
          studentId: s.studentId,
          name: s.name,
          email: s.email,
          batch: s.batch || '',
          classId: s.classId || '',
        })),
        coaches: coachesWithClasses,
      })
    } else if (action === 'changeStudentBatch') {
      // Change a student's batch
      if (!studentId || !newBatch) {
        return NextResponse.json(
          { error: 'Student ID and new batch are required' },
          { status: 400 }
        )
      }

      await studentsCollection.updateOne(
        { _id: new ObjectId(studentId), managementId: session.managementId },
        {
          $set: {
            batch: newBatch,
            updatedAt: new Date(),
          },
        }
      )

      return NextResponse.json({
        success: true,
        message: 'Student batch updated successfully',
      })
    } else if (action === 'createBatch') {
      // Create a new batch
      if (!batchName || !batchName.trim()) {
        return NextResponse.json(
          { error: 'Batch name is required' },
          { status: 400 }
        )
      }

      const trimmedBatchName = batchName.trim()
      const batchesCollection = db.collection('batches')
      const now = new Date()

      // Check if batch already exists
      const existingBatch = await batchesCollection.findOne({
        batchName: trimmedBatchName,
        managementId: session.managementId,
      })

      if (existingBatch) {
        return NextResponse.json({
          success: true,
          message: 'Batch already exists',
          batch: trimmedBatchName,
        })
      }

      // Create new batch
      await batchesCollection.insertOne({
        batchName: trimmedBatchName,
        managementId: session.managementId,
        createdAt: now,
        updatedAt: now,
      })

      return NextResponse.json({
        success: true,
        message: 'Batch created successfully',
        batch: trimmedBatchName,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Batches API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

