import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/classes
 * Get all classes for the current management
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
    const batch = searchParams.get('batch')

    const db = await getDb(DB_NAME)
    const classesCollection = db.collection('classes')
    const studentsCollection = db.collection('students')

    // Build query for classes
    let classQuery = { managementId: session.managementId }
    let classIds = null

    // If batch is specified, get classes that have students in that batch using aggregation
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
      
      classIds = studentsInBatch.map(s => s._id).filter(Boolean)
      
      if (classIds.length === 0) {
        // No students in this batch, return empty classes array
        return NextResponse.json({ classes: [] })
      }
      
      classQuery.classId = { $in: classIds }
    }

    // Get classes for the current management (filtered by batch if specified) using aggregation
    const classes = await classesCollection.aggregate([
      {
        $match: classQuery
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray()

    // Get coaches for coach name lookup
    const coachesCollection = db.collection('coaches')
    const coaches = await coachesCollection
      .find({ managementId: session.managementId })
      .toArray()
    
    const coachesMap = new Map(coaches.map(c => [c.coachId, c.name]))

    // Get student counts for each class (filtered by batch if specified) using aggregation
    const studentCountMatch = {
      managementId: session.managementId,
      classId: { $exists: true, $ne: '' }
    }
    if (batch) {
      studentCountMatch.batch = batch.trim() // Exact match with trimmed batch name
    }
    
    const studentCounts = await studentsCollection.aggregate([
      {
        $match: studentCountMatch
      },
      {
        $group: {
          _id: '$classId',
          count: { $sum: 1 }
        }
      }
    ]).toArray()

    const studentCountsMap = new Map(studentCounts.map(sc => [sc._id, sc.count]))

    // Format classes for response
    const formattedClasses = classes.map(cls => ({
      id: cls._id.toString(),
      classId: cls.classId,
      name: cls.name,
      description: cls.description || '',
      coachId: cls.coachId || '',
      coachName: cls.coachId ? coachesMap.get(cls.coachId) || 'Unknown' : '',
      studentCount: studentCountsMap.get(cls.classId) || 0,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
    }))

    return NextResponse.json({ classes: formattedClasses })
  } catch (error) {
    console.error('Classes API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/classes
 * Create a new class
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

    // Only admins can create classes
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, coachId } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Class name is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)

    // Verify coach if coachId is provided
    if (coachId) {
      const coachesCollection = db.collection('coaches')
      const existingCoach = await coachesCollection.findOne({
        coachId,
        managementId: session.managementId,
      })

      if (!existingCoach) {
        return NextResponse.json(
          { error: 'Coach not found' },
          { status: 404 }
        )
      }
    }

    const classesCollection = db.collection('classes')

    // Generate unique class ID
    const classId = await generateClassId(classesCollection, session.managementId)

    // Create class
    const now = new Date()
    const result = await classesCollection.insertOne({
      classId,
      name,
      description: description || '',
      coachId: coachId || '',
      managementId: session.managementId,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      class: {
        id: result.insertedId.toString(),
        classId,
        name,
        description: description || '',
      },
    })
  } catch (error) {
    console.error('Create class API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/classes
 * Update a class
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
    const { id, name, description, coachId } = body

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Class ID and name are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)

    // Verify coach if coachId is provided
    if (coachId) {
      const coachesCollection = db.collection('coaches')
      const existingCoach = await coachesCollection.findOne({
        coachId,
        managementId: session.managementId,
      })

      if (!existingCoach) {
        return NextResponse.json(
          { error: 'Coach not found' },
          { status: 404 }
        )
      }
    }

    const classesCollection = db.collection('classes')

    // Verify class belongs to the same management
    const existingClass = await classesCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Update class
    await classesCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          description: description || '',
          coachId: coachId || '',
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Class updated successfully',
    })
  } catch (error) {
    console.error('Update class API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/classes
 * Delete a class
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
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const classesCollection = db.collection('classes')
    const studentsCollection = db.collection('students')

    // Verify class belongs to the same management
    const existingClass = await classesCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Check if class has students
    const studentCount = await studentsCollection.countDocuments({
      classId: existingClass.classId,
      managementId: session.managementId,
    })

    if (studentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete class. It has ${studentCount} student(s). Please remove students first.` },
        { status: 400 }
      )
    }

    // Delete class
    await classesCollection.deleteOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully',
    })
  } catch (error) {
    console.error('Delete class API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate unique class ID
 */
async function generateClassId(classesCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let classId
  let isUnique = false

  while (!isUnique) {
    classId = 'CLS_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    
    const existing = await classesCollection.findOne({
      classId,
      managementId,
    })
    
    if (!existing) {
      isUnique = true
    }
  }
  
  return classId
}

