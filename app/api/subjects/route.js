import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/subjects
 * Get all subjects for a class or management
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

    const db = await getDb(DB_NAME)
    const subjectsCollection = db.collection('subjects')
    const studentsCollection = db.collection('students')

    let query = { managementId: session.managementId }
    if (classId) {
      query.classId = classId
    }

    // If batch is specified, filter subjects to only include classes that have students in that batch using aggregation
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
        // No students in this batch, return empty subjects array
        return NextResponse.json({ subjects: [] })
      }
      
      // Filter by classIds that have students in this batch
      if (query.classId) {
        // If classId is already specified, check if it's in the list
        if (!classIds.includes(query.classId)) {
          return NextResponse.json({ subjects: [] })
        }
      } else {
        // Add classId filter
        query.classId = { $in: classIds }
      }
    }

    // Use aggregation with $match for subjects
    const subjects = await subjectsCollection.aggregate([
      {
        $match: query
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray()

    const formattedSubjects = subjects.map(subject => ({
      id: subject._id.toString(),
      subjectId: subject.subjectId,
      name: subject.name,
      classId: subject.classId || '',
      managementId: subject.managementId,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    }))

    return NextResponse.json({ subjects: formattedSubjects })
  } catch (error) {
    console.error('Subjects API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/subjects
 * Create a new subject
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
    const { name, classId } = body

    if (!name || !classId) {
      return NextResponse.json(
        { error: 'Subject name and class ID are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const subjectsCollection = db.collection('subjects')
    const classesCollection = db.collection('classes')

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

    // Check if subject already exists for this class
    const existingSubject = await subjectsCollection.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      classId,
      managementId: session.managementId,
    })

    if (existingSubject) {
      return NextResponse.json(
        { error: 'Subject with this name already exists in this class' },
        { status: 400 }
      )
    }

    // Generate unique subject ID
    const subjectId = await generateSubjectId(subjectsCollection, session.managementId)

    // Create subject
    const now = new Date()
    const result = await subjectsCollection.insertOne({
      subjectId,
      name,
      classId,
      managementId: session.managementId,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      subject: {
        id: result.insertedId.toString(),
        subjectId,
        name,
        classId,
      },
    })
  } catch (error) {
    console.error('Create subject API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/subjects
 * Update a subject
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
    const { id, name } = body

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Subject ID and name are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const subjectsCollection = db.collection('subjects')

    // Verify subject belongs to the same management
    const existingSubject = await subjectsCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingSubject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    // Check if name is being changed and if it's already taken in the same class
    if (name !== existingSubject.name) {
      const nameTaken = await subjectsCollection.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        classId: existingSubject.classId,
        managementId: session.managementId,
        _id: { $ne: new ObjectId(id) },
      })

      if (nameTaken) {
        return NextResponse.json(
          { error: 'Subject name already exists in this class' },
          { status: 400 }
        )
      }
    }

    // Update subject
    await subjectsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Subject updated successfully',
    })
  } catch (error) {
    console.error('Update subject API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/subjects
 * Delete a subject
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
        { error: 'Subject ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const subjectsCollection = db.collection('subjects')
    const marksCollection = db.collection('marks')

    // Verify subject belongs to the same management
    const existingSubject = await subjectsCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingSubject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    // Delete subject
    await subjectsCollection.deleteOne({ _id: new ObjectId(id) })

    // Also delete all marks for this subject
    await marksCollection.deleteMany({
      subjectId: existingSubject.subjectId,
      managementId: session.managementId,
    })

    return NextResponse.json({
      success: true,
      message: 'Subject deleted successfully',
    })
  } catch (error) {
    console.error('Delete subject API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate unique subject ID
 */
async function generateSubjectId(subjectsCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let subjectId
  let isUnique = false

  while (!isUnique) {
    subjectId = 'SUB_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    
    const existing = await subjectsCollection.findOne({
      subjectId,
      managementId,
    })
    
    if (!existing) {
      isUnique = true
    }
  }
  
  return subjectId
}

