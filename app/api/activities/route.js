import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME, COLLECTIONS } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/activities
 * Get activities for a class
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
    const batch = searchParams.get('batch')

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const activitiesCollection = db.collection(COLLECTIONS.ACTIVITIES)

    let query = { 
      classId,
      managementId: session.managementId,
    }

    if (batch) {
      query.batch = batch.trim()
    }

    const activities = await activitiesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ activities })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/activities
 * Create a new activity
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

    const body = await request.json()
    const { classId, studentId, coachId, batch, columnName, rowData } = body

    if (!classId || !studentId || !columnName) {
      return NextResponse.json(
        { error: 'Class ID, Student ID, and Column Name are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const activitiesCollection = db.collection(COLLECTIONS.ACTIVITIES)
    const studentsCollection = db.collection(COLLECTIONS.STUDENTS)

    // Verify student exists
    const student = await studentsCollection.findOne({
      _id: new ObjectId(studentId),
      managementId: session.managementId,
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Create activity
    const activity = {
      activityId: `ACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      classId,
      studentId: new ObjectId(studentId),
      coachId: coachId ? new ObjectId(coachId) : null,
      batch: batch || student.batch || '',
      columnName,
      rowData: rowData || {},
      managementId: session.managementId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.userId,
    }

    const result = await activitiesCollection.insertOne(activity)

    return NextResponse.json({
      activity: {
        ...activity,
        _id: result.insertedId,
      },
    })
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/activities
 * Update an activity
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

    const body = await request.json()
    const { activityId, columnName, rowData } = body

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const activitiesCollection = db.collection(COLLECTIONS.ACTIVITIES)

    const updateData = {
      updatedAt: new Date(),
    }

    if (columnName !== undefined) {
      updateData.columnName = columnName
    }

    if (rowData !== undefined) {
      updateData.rowData = rowData
    }

    const result = await activitiesCollection.updateOne(
      {
        activityId,
        managementId: session.managementId,
      },
      {
        $set: updateData,
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    const updatedActivity = await activitiesCollection.findOne({
      activityId,
      managementId: session.managementId,
    })

    return NextResponse.json({
      activity: updatedActivity,
    })
  } catch (error) {
    console.error('Error updating activity:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/activities
 * Delete an activity
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

    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('activityId')

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const activitiesCollection = db.collection(COLLECTIONS.ACTIVITIES)

    const result = await activitiesCollection.deleteOne({
      activityId,
      managementId: session.managementId,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Activity deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting activity:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

