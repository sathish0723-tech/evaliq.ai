import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/tests
 * Get all tests for a class, subject, or management
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
    const classId = searchParams.get('classId')
    const subjectId = searchParams.get('subjectId')
    const batch = searchParams.get('batch')

    const db = await getDb(DB_NAME)
    const testsCollection = db.collection('tests')
    const studentsCollection = db.collection('students')

    let query = { managementId: session.managementId }
    if (classId) {
      query.classId = classId
    }
    if (subjectId) {
      query.subjectId = subjectId
    }

    // If batch is specified, filter tests to only include classes that have students in that batch using aggregation
    if (batch) {
      const normalizedBatch = batch.trim()
      const studentsInBatch = await studentsCollection.aggregate([
        {
          $match: {
            managementId: session.managementId,
            batch: normalizedBatch, // Exact match
            classId: { $exists: true, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$classId'
          }
        }
      ]).toArray()
      
      const classIds = studentsInBatch.map(s => s._id).filter(Boolean)
      
      if (classIds.length === 0) {
        // No students in this batch, return empty tests array
        return NextResponse.json({ tests: [] })
      }
      
      // Filter by classIds that have students in this batch
      if (query.classId) {
        // If classId is already specified, check if it's in the list
        if (!classIds.includes(query.classId)) {
          return NextResponse.json({ tests: [] })
        }
      } else {
        // Add classId filter
        query.classId = { $in: classIds }
      }
    }

    // Use aggregation with $match for tests
    const tests = await testsCollection.aggregate([
      {
        $match: query
      },
      {
        $sort: { date: -1, createdAt: -1 }
      }
    ]).toArray()

    const formattedTests = tests.map(test => ({
      id: test._id.toString(),
      testId: test.testId,
      name: test.name,
      date: test.date,
      time: test.time || '',
      classId: test.classId || '',
      subjectId: test.subjectId || '',
      coachId: test.coachId || '',
      coachName: test.coachName || '',
      managementId: test.managementId,
      published: test.published || false,
      status: test.status || 'scheduled',
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    }))

    // For students, filter tests that haven't reached their scheduled date/time yet
    let filteredTests = formattedTests
    if (session.role === 'student') {
      const now = new Date()
      filteredTests = formattedTests.filter(test => {
        // If test is not published, don't show it
        if (!test.published) return false
        
        // If test doesn't have a date, don't show it
        if (!test.date) return false
        
        // Parse the scheduled date (assuming YYYY-MM-DD format)
        const dateParts = test.date.split('-')
        if (dateParts.length !== 3) return false
        
        const scheduledDate = new Date()
        scheduledDate.setFullYear(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
        
        // If time is provided, combine date and time
        if (test.time && test.time.trim()) {
          const [hours, minutes] = test.time.split(':').map(Number)
          scheduledDate.setHours(hours || 0, minutes || 0, 0, 0)
        } else {
          // If no time, set to start of day (00:00:00) in local timezone
          scheduledDate.setHours(0, 0, 0, 0)
        }
        
        // Only show if current time is >= scheduled time
        return now >= scheduledDate
      })
    }

    return NextResponse.json({ tests: filteredTests })
  } catch (error) {
    console.error('Tests API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tests
 * Create a new test
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
    const { name, date, time, classId, subjectId, coachId } = body

    if (!name || !date || !classId || !subjectId) {
      return NextResponse.json(
        { error: 'Test name, date, class ID, and subject ID are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const testsCollection = db.collection('tests')
    const classesCollection = db.collection('classes')
    const subjectsCollection = db.collection('subjects')
    const coachesCollection = db.collection('coaches')

    // Verify class exists
    const existingClass = await classesCollection.findOne({
      classId,
      managementId: session.managementId,
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Verify subject exists
    const existingSubject = await subjectsCollection.findOne({
      subjectId,
      managementId: session.managementId,
    })

    if (!existingSubject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    // Get coach name if coachId is provided
    let coachName = ''
    if (coachId) {
      const coach = await coachesCollection.findOne({
        coachId,
        managementId: session.managementId,
      })
      if (coach) {
        coachName = coach.name
      }
    }

    // Generate unique test ID
    const testId = await generateTestId(testsCollection, session.managementId)

    // Create test
    const now = new Date()
    const result = await testsCollection.insertOne({
      testId,
      name,
      date,
      time: time || '',
      classId,
      subjectId,
      coachId: coachId || '',
      coachName,
      managementId: session.managementId,
      published: false,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      test: {
        id: result.insertedId.toString(),
        testId,
        name,
        date,
        time: time || '',
        classId,
        subjectId,
        coachId: coachId || '',
        coachName,
        status: 'scheduled',
      },
    })
  } catch (error) {
    console.error('Create test API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/tests
 * Update a test
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
    const { id, name, date, time, coachId } = body

    if (!id || !name || !date) {
      return NextResponse.json(
        { error: 'Test ID, name, and date are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const testsCollection = db.collection('tests')
    const coachesCollection = db.collection('coaches')

    // Verify test belongs to the same management
    const existingTest = await testsCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingTest) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      )
    }

    // Get coach name if coachId is provided
    let coachName = existingTest.coachName || ''
    if (coachId) {
      const coach = await coachesCollection.findOne({
        coachId,
        managementId: session.managementId,
      })
      if (coach) {
        coachName = coach.name
      }
    }

    // Update test
    await testsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          date,
          time: time || '',
          coachId: coachId || '',
          coachName,
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Test updated successfully',
    })
  } catch (error) {
    console.error('Update test API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tests
 * Delete a test
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const testsCollection = db.collection('tests')
    const marksCollection = db.collection('marks')

    // Verify test belongs to the same management
    const existingTest = await testsCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingTest) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      )
    }

    // Delete test
    await testsCollection.deleteOne({ _id: new ObjectId(id) })

    // Also delete all marks for this test
    await marksCollection.deleteMany({
      testId: existingTest.testId,
      managementId: session.managementId,
    })

    return NextResponse.json({
      success: true,
      message: 'Test deleted successfully',
    })
  } catch (error) {
    console.error('Delete test API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tests
 * Publish or unpublish a test
 */
export async function PATCH(request) {
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
    const { id, published, status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      )
    }

    if (typeof published !== 'boolean' && !status) {
      return NextResponse.json(
        { error: 'Either published status or status is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const testsCollection = db.collection('tests')

    // Verify test belongs to the same management
    const existingTest = await testsCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingTest) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      )
    }

    // Update published status and/or status
    const updateFields = {
      updatedAt: new Date(),
    }
    
    if (typeof published === 'boolean') {
      updateFields.published = published
    }
    
    if (status && ['scheduled', 'completed', 'cancelled'].includes(status)) {
      updateFields.status = status
    }

    await testsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updateFields,
      }
    )

    return NextResponse.json({
      success: true,
      message: published ? 'Test published successfully' : 'Test unpublished successfully',
    })
  } catch (error) {
    console.error('Publish test API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate unique test ID
 */
async function generateTestId(testsCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let testId
  let isUnique = false

  while (!isUnique) {
    testId = 'TEST_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    
    const existing = await testsCollection.findOne({
      testId,
      managementId,
    })
    
    if (!existing) {
      isUnique = true
    }
  }
  
  return testId
}

