import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * POST /api/attendance/bulk
 * Save bulk attendance for a class
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
    const { classId, coachId, date, day, attendance } = body

    if (!classId || !date || !day || !Array.isArray(attendance)) {
      return NextResponse.json(
        { error: 'Class ID, date, day, and attendance array are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const studentsCollection = db.collection('students')
    const attendanceCollection = db.collection('attendance')
    const classesCollection = db.collection('classes')

    // Verify class exists
    const classData = await classesCollection.findOne({
      classId,
      managementId: session.managementId,
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Check permissions: Admin or Coach assigned to this class
    if (session.role !== 'admin') {
      // Check if user is a coach assigned to this class
      if (classData.coachId && session.email) {
        const coachesCollection = db.collection('coaches')
        const coach = await coachesCollection.findOne({
          email: session.email,
          managementId: session.managementId,
          coachId: classData.coachId,
        })

        if (!coach) {
          return NextResponse.json(
            { error: 'Forbidden - Only admins or assigned coaches can update attendance' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Forbidden - Only admins can update attendance for classes without assigned coaches' },
          { status: 403 }
        )
      }
    }

    // Get all student IDs for validation
    const studentIds = attendance.map(a => new ObjectId(a.studentId))
    const students = await studentsCollection.find({
      _id: { $in: studentIds },
      managementId: session.managementId,
      classId: classId,
    }).toArray()

    if (students.length !== attendance.length) {
      return NextResponse.json(
        { error: 'Some students not found or do not belong to this class' },
        { status: 400 }
      )
    }

    const validStatuses = ['present', 'absent', 'late', 'approved_leave']
    const now = new Date()

    // Use Indian timezone for date
    const indianDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const dateString = date || indianDate.toISOString().split('T')[0]

    // Validate all statuses
    for (const { studentId, status } of attendance) {
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`)
      }
    }

    // Create nested students object: { "studentId": "status", ... }
    // Also store reasons for approved_leave in a separate field
    const studentsData = {}
    const leaveReasonsData = {}
    attendance.forEach(({ studentId, status, reason }) => {
      studentsData[studentId] = status
      if (status === 'approved_leave' && reason) {
        leaveReasonsData[studentId] = reason
      }
    })

    // Upsert attendance record - one document per class per day
    const updateData = {
      classId: classId,
      coachId: coachId || classData.coachId || '',
      date: dateString,
      day: day,
      managementId: session.managementId,
      students: studentsData,
      updatedAt: now,
    }
    
    // Add leave reasons if any
    if (Object.keys(leaveReasonsData).length > 0) {
      updateData.leaveReasons = leaveReasonsData
    }
    
    const updateOperation = {
      $set: updateData,
      $setOnInsert: {
        createdAt: now,
      },
    }
    
    // Remove leaveReasons if no approved leaves
    if (Object.keys(leaveReasonsData).length === 0) {
      updateOperation.$unset = { leaveReasons: '' }
    }
    
    await attendanceCollection.updateOne(
      {
        classId: classId,
        date: dateString,
        managementId: session.managementId,
      },
      updateOperation,
      { upsert: true }
    )

    // Update students' current attendance status
    const studentUpdateOperations = attendance.map(({ studentId, status }) => ({
      updateOne: {
        filter: { _id: new ObjectId(studentId) },
        update: {
          $set: {
            attendanceStatus: status,
            updatedAt: now,
          },
        },
      },
    }))

    if (studentUpdateOperations.length > 0) {
      await studentsCollection.bulkWrite(studentUpdateOperations)
    }

    return NextResponse.json({
      success: true,
      message: `Attendance saved for ${attendance.length} students`,
      date: dateString,
      day: day,
    })
  } catch (error) {
    console.error('Bulk attendance API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

