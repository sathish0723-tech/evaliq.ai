import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/marks
 * Get marks for a test (nested structure: one document per test with nested student marks)
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

    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('testId')
    const classId = searchParams.get('classId')
    const subjectId = searchParams.get('subjectId')
    const batch = searchParams.get('batch')

    const db = await getDb(DB_NAME)
    const marksCollection = db.collection('marks')
    const studentsCollection = db.collection('students')

    const query = { managementId: session.managementId }
    if (testId) {
      query.testId = testId
    }
    if (classId) {
      query.classId = classId
    }
    if (subjectId) {
      query.subjectId = subjectId
    }

    // Use aggregation with $match for marks
    const marksRecords = await marksCollection.aggregate([
      {
        $match: query
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray()

    // If batch is specified, filter marks to only include students in that batch using aggregation
    let studentObjectIdsInBatch = null
    if (batch) {
      const normalizedBatch = batch.trim()
      const studentsInBatch = await studentsCollection.aggregate([
        {
          $match: {
            managementId: session.managementId,
            batch: normalizedBatch // Exact match
          }
        },
        {
          $project: {
            _id: 1
          }
        }
      ]).toArray()
      // Use ObjectId strings for matching (marks use _id.toString() as keys)
      studentObjectIdsInBatch = new Set(studentsInBatch.map(s => s._id.toString()))
    }

    // Convert nested structure to flat array for frontend compatibility
    const marksArray = []
    marksRecords.forEach(record => {
      if (record.students && typeof record.students === 'object') {
        Object.entries(record.students).forEach(([studentId, studentMarks]) => {
          // Filter by batch if specified - studentId in marks is the ObjectId string
          if (batch && studentObjectIdsInBatch) {
            if (!studentObjectIdsInBatch.has(studentId)) {
              return // Skip this student if not in the batch
            }
          }
          marksArray.push({
            id: record._id.toString(),
            testId: record.testId,
            studentId: studentId, // This is the ObjectId string from the marks document
            subjectId: record.subjectId || '',
            classId: record.classId || '',
            marks: studentMarks.marks || 0,
            maxMarks: studentMarks.maxMarks || 100,
            managementId: record.managementId,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          })
        })
      }
    })
    
    console.log(`[Marks API] Found ${marksRecords.length} marks records, returning ${marksArray.length} marks entries for testId: ${testId || 'all'}, batch: ${batch || 'all'}`)

    return NextResponse.json({ marks: marksArray })
  } catch (error) {
    console.error('Marks API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/marks
 * Create or update marks for students in a test (nested structure)
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
    const { testId, classId, subjectId, students } = body

    if (!testId || !classId || !subjectId || !students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: 'Test ID, Class ID, Subject ID, and students array are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const marksCollection = db.collection('marks')
    const testsCollection = db.collection('tests')
    const studentsCollection = db.collection('students')

    // Verify test exists
    const test = await testsCollection.findOne({
      testId,
      managementId: session.managementId,
    })

    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      )
    }

    // Verify all students exist
    const studentIds = students.map(s => s.studentId)
    const existingStudents = await studentsCollection.find({
      _id: { $in: studentIds.map(id => new ObjectId(id)) },
      managementId: session.managementId,
    }).toArray()

    if (existingStudents.length !== studentIds.length) {
      return NextResponse.json(
        { error: 'One or more students not found' },
        { status: 404 }
      )
    }

    // Build nested students object
    const studentsMarks = {}
    students.forEach(student => {
      const marksValue = parseFloat(student.marks) || 0
      const maxMarksValue = parseFloat(student.maxMarks) || 100
      
      if (marksValue < 0 || marksValue > maxMarksValue) {
        throw new Error(`Marks must be between 0 and ${maxMarksValue} for student ${student.studentId}`)
      }

      studentsMarks[student.studentId] = {
        marks: marksValue,
        maxMarks: maxMarksValue,
      }
    })

    const now = new Date()

    // Update or create marks record (one document per test)
    await marksCollection.updateOne(
      {
        testId,
        managementId: session.managementId,
      },
      {
        $set: {
          testId,
          classId,
          subjectId,
          students: studentsMarks,
          updatedAt: now,
        },
        $setOnInsert: {
          managementId: session.managementId,
          createdAt: now,
        },
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Marks saved successfully',
    })
  } catch (error) {
    console.error('Create/Update marks API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/marks
 * Update marks for a specific student in a test
 */
export async function PUT(request) {
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
    const { testId, studentId, marks, maxMarks = 100 } = body

    if (!testId || !studentId || marks === undefined || marks === null) {
      return NextResponse.json(
        { error: 'Test ID, Student ID, and marks value are required' },
        { status: 400 }
      )
    }

    const marksValue = parseFloat(marks)
    const maxMarksValue = parseFloat(maxMarks) || 100

    if (marksValue < 0 || marksValue > maxMarksValue) {
      return NextResponse.json(
        { error: `Marks must be between 0 and ${maxMarksValue}` },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const marksCollection = db.collection('marks')
    const testsCollection = db.collection('tests')

    // Get test information to get classId and subjectId
    const test = await testsCollection.findOne({
      testId,
      managementId: session.managementId,
    })

    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      )
    }

    const now = new Date()

    // Update or create nested student marks (upsert)
    await marksCollection.updateOne(
      { testId, managementId: session.managementId },
      {
        $set: {
          testId,
          classId: test.classId,
          subjectId: test.subjectId,
          [`students.${studentId}.marks`]: marksValue,
          [`students.${studentId}.maxMarks`]: maxMarksValue,
          updatedAt: now,
        },
        $setOnInsert: {
          students: {},
          managementId: session.managementId,
          createdAt: now,
        },
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Marks updated successfully',
    })
  } catch (error) {
    console.error('Update marks API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/marks
 * Delete marks for a test or a specific student
 */
export async function DELETE(request) {
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

    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('testId')
    const studentId = searchParams.get('studentId')

    if (!testId) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const marksCollection = db.collection('marks')

    // Verify mark record belongs to the same management
    const existingMark = await marksCollection.findOne({
      testId,
      managementId: session.managementId,
    })

    if (!existingMark) {
      return NextResponse.json(
        { error: 'Test marks record not found' },
        { status: 404 }
      )
    }

    if (studentId) {
      // Delete marks for a specific student
      await marksCollection.updateOne(
        { testId, managementId: session.managementId },
        {
          $unset: {
            [`students.${studentId}`]: '',
          },
          $set: {
            updatedAt: new Date(),
          },
        }
      )
    } else {
      // Delete entire test marks record
      await marksCollection.deleteOne({ testId, managementId: session.managementId })
    }

    return NextResponse.json({
      success: true,
      message: 'Marks deleted successfully',
    })
  } catch (error) {
    console.error('Delete marks API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
