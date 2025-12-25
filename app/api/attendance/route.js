import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * POST /api/attendance
 * Update attendance status for a student
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
    const { studentId, status, date } = body

    if (!studentId || !status) {
      return NextResponse.json(
        { error: 'Student ID and status are required' },
        { status: 400 }
      )
    }

    const validStatuses = ['present', 'absent', 'late', 'approved_leave']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be present, absent, late, or approved_leave' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const studentsCollection = db.collection('students')
    const attendanceCollection = db.collection('attendance')

    // Verify student belongs to the same management
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

    // Use Indian timezone for date
    const now = new Date()
    const indianDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const attendanceDate = date || indianDate.toISOString().split('T')[0]
    
    // Get day name
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dateObj = new Date(attendanceDate + 'T00:00:00')
    const dayName = dayNames[dateObj.getDay()]

    // Get class and coach information
    const classesCollection = db.collection('classes')
    const classData = student.classId ? await classesCollection.findOne({
      classId: student.classId,
      managementId: session.managementId,
    }) : null

    // Check permissions: Admin or Coach assigned to this class
    if (session.role !== 'admin' && classData && classData.coachId && session.email) {
      // Check if user is a coach assigned to this class
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
    } else if (session.role !== 'admin' && (!classData || !classData.coachId)) {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can update attendance for classes without assigned coaches' },
        { status: 403 }
      )
    }

    // Update or create attendance record - one document per class per day
    // Use $set to update the nested student status
    await attendanceCollection.updateOne(
      {
        classId: student.classId || '',
        date: attendanceDate,
        managementId: session.managementId,
      },
      {
        $set: {
          [`students.${studentId}`]: status,
          classId: student.classId || '',
          coachId: classData?.coachId || '',
          date: attendanceDate,
          day: dayName,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          students: {},
          managementId: session.managementId,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    )

    // Also update the student's current attendance status (for quick reference)
    await studentsCollection.updateOne(
      { _id: new ObjectId(studentId) },
      {
        $set: {
          attendanceStatus: status,
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Attendance updated successfully',
    })
  } catch (error) {
    console.error('Attendance API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/attendance
 * Get attendance records
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
    
    // Use Indian timezone for date
    const now = new Date()
    const indianDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const date = searchParams.get('date') || indianDate.toISOString().split('T')[0]

    const db = await getDb(DB_NAME)
    const attendanceCollection = db.collection('attendance')
    const studentsCollection = db.collection('students')

    const query = {
      managementId: session.managementId,
      date,
    }

    if (classId) {
      query.classId = classId
    }

    // If batch is specified, filter attendance to only include classes that have students in that batch using aggregation
    let classIds = null
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
        // No students in this batch, return empty attendance array
        return NextResponse.json({ attendance: [] })
      }
      
      // Filter by classIds that have students in this batch
      if (query.classId) {
        // If classId is already specified, check if it's in the list
        if (!classIds.includes(query.classId)) {
          return NextResponse.json({ attendance: [] })
        }
      } else {
        // Add classId filter
        query.classId = { $in: classIds }
      }
    }

    // Use aggregation with $match for attendance
    const attendanceRecords = await attendanceCollection.aggregate([
      {
        $match: query
      }
    ]).toArray()

    // If batch is specified, also filter by student IDs in that batch using aggregation
    let studentIdsInBatch = null
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
      studentIdsInBatch = new Set(studentsInBatch.map(s => s._id.toString()))
    }

    // Convert nested structure to flat array for frontend compatibility
    const attendanceArray = []
    attendanceRecords.forEach(record => {
      if (record.students && typeof record.students === 'object') {
        Object.entries(record.students).forEach(([studentId, status]) => {
          // Filter by batch if specified
          if (batch && !studentIdsInBatch.has(studentId)) {
            return
          }
          // Get leave reason if status is approved_leave
          const reason = (status === 'approved_leave' && record.leaveReasons && record.leaveReasons[studentId]) 
            ? record.leaveReasons[studentId] 
            : undefined
          
          attendanceArray.push({
            id: record._id.toString(),
            studentId: studentId,
            date: record.date,
            day: record.day || '',
            status: status,
            reason: reason,
            classId: record.classId || '',
            coachId: record.coachId || '',
          })
        })
      }
    })

    return NextResponse.json({
      attendance: attendanceArray,
    })
  } catch (error) {
    console.error('Get attendance API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

