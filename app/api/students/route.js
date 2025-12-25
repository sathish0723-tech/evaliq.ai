import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/students
 * Get all students for the current management or a specific class
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
    const batchParam = searchParams.get('batch')

    const db = await getDb(DB_NAME)
    const studentsCollection = db.collection('students')

    // Build aggregation pipeline with $match
    const matchStage = { managementId: session.managementId }
    if (classId) {
      matchStage.classId = classId
    }
    if (batchParam) {
      // Decode and normalize batch name: remove spaces around dashes
      let decodedBatch = batchParam.replace(/\+/g, ' ')
      try {
        decodedBatch = decodeURIComponent(decodedBatch)
      } catch (e) {
        decodedBatch = batchParam
      }
      // Normalize: "Batch - 7" -> "Batch-7"
      matchStage.batch = decodedBatch.trim().replace(/\s*-\s*/g, '-')
    }

    const students = await studentsCollection.aggregate([
      {
        $match: matchStage
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray()

    // Format students for response
    const formattedStudents = students.map(student => ({
      id: student._id.toString(),
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      phone: student.phone || '',
      photo: student.photo || '',
      classId: student.classId || '',
      batch: student.batch || '',
      attendanceStatus: student.attendanceStatus || 'present',
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    }))

    return NextResponse.json({ students: formattedStudents })
  } catch (error) {
    console.error('Students API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/students
 * Create a new student
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

    // Only admins can create students
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, phone, photo, classId, batch } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    if (classId) {
      // Verify class exists
      const db = await getDb(DB_NAME)
      const classesCollection = db.collection('classes')
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
    }

    const db = await getDb(DB_NAME)
    const studentsCollection = db.collection('students')

    // Check if student already exists
    const existingStudent = await studentsCollection.findOne({
      email,
      managementId: session.managementId,
    })

    if (existingStudent) {
      return NextResponse.json(
        { error: 'Student with this email already exists' },
        { status: 400 }
      )
    }

    // Generate unique student ID
    const studentId = await generateStudentId(studentsCollection, session.managementId)

    // Create student
    const now = new Date()
    const result = await studentsCollection.insertOne({
      studentId,
      name,
      email,
      phone: phone || '',
      photo: photo || '',
      classId: classId || '',
      batch: batch || '',
      managementId: session.managementId,
      attendanceStatus: 'present',
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      student: {
        id: result.insertedId.toString(),
        studentId,
        name,
        email,
        phone: phone || '',
        photo: photo || '',
        classId: classId || '',
      },
    })
  } catch (error) {
    console.error('Create student API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/students
 * Update a student
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
    const { id, name, email, phone, photo, classId, batch } = body

    if (!id || !name || !email) {
      return NextResponse.json(
        { error: 'Student ID, name, and email are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const studentsCollection = db.collection('students')

    // Verify student belongs to the same management
    const existingStudent = await studentsCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Check if email is being changed and if it's already taken
    if (email !== existingStudent.email) {
      const emailTaken = await studentsCollection.findOne({
        email,
        managementId: session.managementId,
        _id: { $ne: new ObjectId(id) },
      })

      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email already in use by another student' },
          { status: 400 }
        )
      }
    }

    // Verify class if classId is provided
    if (classId) {
      const classesCollection = db.collection('classes')
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
    }

    // Update student
    await studentsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          email,
          phone: phone || '',
          photo: photo || '',
          classId: classId || '',
          batch: batch || '',
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Student updated successfully',
    })
  } catch (error) {
    console.error('Update student API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/students
 * Delete a student
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
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const studentsCollection = db.collection('students')

    // Verify student belongs to the same management
    const existingStudent = await studentsCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Delete student
    await studentsCollection.deleteOne({ _id: new ObjectId(id) })

    // Also delete attendance records for this student
    const attendanceCollection = db.collection('attendance')
    await attendanceCollection.deleteMany({
      studentId: existingStudent._id,
    })

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully',
    })
  } catch (error) {
    console.error('Delete student API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate unique student ID
 */
async function generateStudentId(studentsCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let studentId
  let isUnique = false

  while (!isUnique) {
    studentId = 'STU_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    
    const existing = await studentsCollection.findOne({
      studentId,
      managementId,
    })
    
    if (!existing) {
      isUnique = true
    }
  }
  
  return studentId
}
