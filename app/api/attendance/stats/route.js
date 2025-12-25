import { NextResponse } from 'next/server'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/attendance/stats
 * Get attendance statistics for dashboard
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
    const studentId = searchParams.get('studentId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const db = await getDb(DB_NAME)
    const attendanceCollection = db.collection('attendance')
    const studentsCollection = db.collection('students')

    // Build query
    const query = {
      managementId: session.managementId,
    }

    if (classId) {
      query.classId = classId
    }

    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate,
      }
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
        // No students in this batch, return empty stats
        return NextResponse.json({
          chartData: [],
          stats: {
            totalPresent: 0,
            totalAbsent: 0,
            totalLate: 0,
            totalStudents: 0,
          },
        })
      }
      
      // Filter by classIds that have students in this batch
      if (query.classId) {
        // If classId is already specified, check if it's in the list
        if (!classIds.includes(query.classId)) {
          return NextResponse.json({
            chartData: [],
            stats: {
              totalPresent: 0,
              totalAbsent: 0,
              totalLate: 0,
              totalStudents: 0,
            },
          })
        }
      } else {
        // Add classId filter
        query.classId = { $in: classIds }
      }
    }

    // Get attendance records using aggregation with $match
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

    // Process data for charts
    const chartData = []
    const stats = {
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalStudents: 0,
    }

    // Group by date
    const dateMap = new Map()

    attendanceRecords.forEach(record => {
      if (!record.students || typeof record.students !== 'object') return

      const date = record.date
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          present: 0,
          absent: 0,
          late: 0,
        })
      }

      const dayData = dateMap.get(date)
      Object.entries(record.students).forEach(([recordStudentId, status]) => {
        // Filter by studentId if specified (for individual student view)
        if (studentId && recordStudentId !== studentId) {
          return
        }
        
        // Filter by batch if specified
        if (batch && !studentIdsInBatch.has(recordStudentId)) {
          return
        }
        
        if (status === 'present') {
          dayData.present++
          stats.totalPresent++
        } else if (status === 'absent') {
          dayData.absent++
          stats.totalAbsent++
        } else if (status === 'late') {
          dayData.late++
          stats.totalLate++
        }
        stats.totalStudents++
      })
    })

    // Convert to array and sort by date
    chartData.push(...Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    ))

    // Calculate per-student attendance statistics
    const studentStatsMap = new Map()
    
    attendanceRecords.forEach(record => {
      if (!record.students || typeof record.students !== 'object') return
      
      Object.entries(record.students).forEach(([recordStudentId, status]) => {
        // Filter by studentId if specified (for individual student view)
        if (studentId && recordStudentId !== studentId) {
          return
        }
        
        // Filter by batch if specified
        if (batch && !studentIdsInBatch.has(recordStudentId)) {
          return
        }
        
        if (!studentStatsMap.has(recordStudentId)) {
          studentStatsMap.set(recordStudentId, {
            studentId: recordStudentId,
            present: 0,
            absent: 0,
            late: 0,
            total: 0,
          })
        }
        
        const studentStat = studentStatsMap.get(recordStudentId)
        studentStat.total++
        
        if (status === 'present') {
          studentStat.present++
        } else if (status === 'absent') {
          studentStat.absent++
        } else if (status === 'late') {
          studentStat.late++
        }
      })
    })

    // Convert to array and calculate percentages
    const studentStats = Array.from(studentStatsMap.values()).map(stat => ({
      studentId: stat.studentId,
      present: stat.present,
      absent: stat.absent,
      late: stat.late,
      total: stat.total,
      attendancePercentage: stat.total > 0 
        ? ((stat.present + stat.late * 0.5) / stat.total) * 100 
        : 0, // Late counts as 0.5 for attendance percentage
    }))

    return NextResponse.json({
      chartData,
      stats,
      studentStats, // Per-student statistics
    })
  } catch (error) {
    console.error('Attendance stats API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

