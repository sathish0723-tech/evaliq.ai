import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/marks/stats
 * Get marks statistics for dashboard
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const batch = searchParams.get('batch')

    const db = await getDb(DB_NAME)
    const marksCollection = db.collection('marks')
    const testsCollection = db.collection('tests')
    const studentsCollection = db.collection('students')

    // Build query for marks
    const marksQuery = { managementId: session.managementId }
    if (classId) {
      marksQuery.classId = classId
    }
    if (subjectId) {
      marksQuery.subjectId = subjectId
    }

    // Build query for tests to filter by date range
    const testsQuery = { managementId: session.managementId }
    if (classId) {
      testsQuery.classId = classId
    }
    if (subjectId) {
      testsQuery.subjectId = subjectId
    }
    if (startDate && endDate) {
      testsQuery.date = {
        $gte: startDate,
        $lte: endDate
      }
    }

    // Get test IDs in date range
    const tests = await testsCollection.find(testsQuery).toArray()
    const testIds = tests.map(t => t.testId)

    if (testIds.length === 0) {
      return NextResponse.json({
        chartData: [],
        stats: {
          totalTests: 0,
          totalStudents: 0,
          averageMarks: 0,
          averagePercentage: 0,
        },
        studentStats: []
      })
    }

    marksQuery.testId = { $in: testIds }

    // If batch is specified, filter marks to only include students in that batch
    let studentObjectIdsInBatch = null
    if (batch) {
      const normalizedBatch = batch.trim()
      const studentsInBatch = await studentsCollection.aggregate([
        {
          $match: {
            managementId: session.managementId,
            batch: normalizedBatch
          }
        },
        {
          $project: {
            _id: 1
          }
        }
      ]).toArray()
      studentObjectIdsInBatch = new Set(studentsInBatch.map(s => s._id.toString()))
    }

    // Get all marks records
    const marksRecords = await marksCollection.find(marksQuery).toArray()

    // Get subjects collection for name resolution when All Classes
    let subjectsNameMap = new Map() // Map subjectId to normalized name
    let classesNameMap = new Map() // Map classId to class name
    if (!classId) {
      const subjectsCollection = db.collection('subjects')
      const allSubjects = await subjectsCollection.find({ managementId: session.managementId }).toArray()
      allSubjects.forEach(subject => {
        if (subject.subjectId && subject.name) {
          subjectsNameMap.set(subject.subjectId, subject.name.trim().toLowerCase())
        }
      })
      
      // Get class names for All Classes view
      const classesCollection = db.collection('classes')
      const allClasses = await classesCollection.find({ managementId: session.managementId }).toArray()
      allClasses.forEach(cls => {
        if (cls.classId && cls.name) {
          classesNameMap.set(cls.classId, cls.name)
        }
      })
    }

    // Process marks data
    const studentMarksMap = {}
    const chartDataMap = {}
    const subjectMarksMap = {} // For subject-wise averages when All Classes (by normalized name)
    let totalMarks = 0
    let totalMaxMarks = 0
    let totalRecords = 0

    marksRecords.forEach(record => {
      if (!record.students || typeof record.students !== 'object') return

      const test = tests.find(t => t.testId === record.testId)
      if (!test) return

      const testDate = test.date
      const recordSubjectId = record.subjectId
      const recordClassId = record.classId // Get classId from record

      Object.entries(record.students).forEach(([studentId, studentMarks]) => {
        // Filter by batch if specified
        if (batch && studentObjectIdsInBatch) {
          if (!studentObjectIdsInBatch.has(studentId)) {
            return
          }
        }

        const marks = studentMarks.marks || 0
        const maxMarks = studentMarks.maxMarks || 100
        const percentage = maxMarks > 0 ? (marks / maxMarks) * 100 : 0

        // Aggregate by student
        if (!studentMarksMap[studentId]) {
          studentMarksMap[studentId] = {
            totalMarks: 0,
            totalMaxMarks: 0,
            testCount: 0,
            tests: []
          }
        }
        studentMarksMap[studentId].totalMarks += marks
        studentMarksMap[studentId].totalMaxMarks += maxMarks
        studentMarksMap[studentId].testCount += 1
        studentMarksMap[studentId].tests.push({
          testId: record.testId,
          testName: test.name,
          testDate,
          marks,
          maxMarks,
          percentage
        })

        // Aggregate by date for chart
        if (!chartDataMap[testDate]) {
          chartDataMap[testDate] = {
            date: testDate,
            totalMarks: 0,
            totalMaxMarks: 0,
            count: 0,
            averagePercentage: 0,
            subjects: {}, // Per-subject data
            classes: {} // Per-class data (for All Classes view)
          }
        }
        chartDataMap[testDate].totalMarks += marks
        chartDataMap[testDate].totalMaxMarks += maxMarks
        chartDataMap[testDate].count += 1
        
        // Aggregate by class for All Classes view
        if (!classId && recordClassId) {
          if (!chartDataMap[testDate].classes[recordClassId]) {
            chartDataMap[testDate].classes[recordClassId] = {
              totalMarks: 0,
              totalMaxMarks: 0,
              count: 0
            }
          }
          chartDataMap[testDate].classes[recordClassId].totalMarks += marks
          chartDataMap[testDate].classes[recordClassId].totalMaxMarks += maxMarks
          chartDataMap[testDate].classes[recordClassId].count += 1
        }
        
        // Aggregate by subject and date
        // When no classId (All Classes), aggregate by normalized subject name to combine same subjects across classes
        // When classId is specified, aggregate by subjectId
        if (recordSubjectId) {
          let subjectKey = recordSubjectId
          
          // For All Classes view, use normalized subject name as key to aggregate across classes
          if (!classId && subjectsNameMap.has(recordSubjectId)) {
            subjectKey = subjectsNameMap.get(recordSubjectId) // Use normalized name
          }
          
          if (!chartDataMap[testDate].subjects[subjectKey]) {
            chartDataMap[testDate].subjects[subjectKey] = {
              totalMarks: 0,
              totalMaxMarks: 0,
              count: 0
            }
          }
          chartDataMap[testDate].subjects[subjectKey].totalMarks += marks
          chartDataMap[testDate].subjects[subjectKey].totalMaxMarks += maxMarks
          chartDataMap[testDate].subjects[subjectKey].count += 1
        }

        // Aggregate by subject for All Classes view (by normalized name)
        if (!classId && recordSubjectId && subjectsNameMap.has(recordSubjectId)) {
          const normalizedName = subjectsNameMap.get(recordSubjectId)
          if (!subjectMarksMap[normalizedName]) {
            subjectMarksMap[normalizedName] = {
              totalMarks: 0,
              totalMaxMarks: 0,
              count: 0
            }
          }
          subjectMarksMap[normalizedName].totalMarks += marks
          subjectMarksMap[normalizedName].totalMaxMarks += maxMarks
          subjectMarksMap[normalizedName].count += 1
        }

        totalMarks += marks
        totalMaxMarks += maxMarks
        totalRecords += 1
      })
    })

    // Calculate chart data
    const chartData = Object.values(chartDataMap)
      .map(item => {
        const baseData = {
          date: item.date,
          averageMarks: item.count > 0 ? item.totalMarks / item.count : 0,
          averagePercentage: item.totalMaxMarks > 0 ? (item.totalMarks / item.totalMaxMarks) * 100 : 0,
          totalMarks: item.totalMarks,
          totalMaxMarks: item.totalMaxMarks,
          count: item.count
        }
        
        // Add per-subject averages
        if (item.subjects) {
          Object.entries(item.subjects).forEach(([subjectId, subjectData]) => {
            const subjectPercentage = subjectData.totalMaxMarks > 0 
              ? (subjectData.totalMarks / subjectData.totalMaxMarks) * 100 
              : 0
            baseData[`subject_${subjectId}`] = subjectPercentage
          })
        }
        
        // Add per-class averages for All Classes view
        if (!classId && item.classes) {
          Object.entries(item.classes).forEach(([classIdKey, classData]) => {
            const classPercentage = classData.totalMaxMarks > 0 
              ? (classData.totalMarks / classData.totalMaxMarks) * 100 
              : 0
            const className = classesNameMap.get(classIdKey) || classIdKey
            // Use a safe key for the class name
            const classKey = className.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
            baseData[`class_${classKey}`] = classPercentage
            baseData[`class_${classKey}_name`] = className // Store original name
            baseData[`class_${classKey}_id`] = classIdKey // Store classId for reference
          })
        }
        
        return baseData
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    // Calculate subject-wise averages for All Classes view (aggregated by normalized name)
    let subjectAverages = []
    if (!classId && Object.keys(subjectMarksMap).length > 0) {
      // Get all subjects to map normalized names back to display names
      const subjectsCollection = db.collection('subjects')
      const allSubjects = await subjectsCollection.find({ managementId: session.managementId }).toArray()
      
      // Create a map of normalized name to display name (use first occurrence)
      const normalizedToDisplayName = new Map()
      allSubjects.forEach(subject => {
        if (subject.name) {
          const normalizedName = subject.name.trim().toLowerCase()
          if (!normalizedToDisplayName.has(normalizedName)) {
            normalizedToDisplayName.set(normalizedName, subject.name)
          }
        }
      })

      subjectAverages = Object.entries(subjectMarksMap).map(([normalizedName, subjectData]) => {
        const averagePercentage = subjectData.totalMaxMarks > 0 
          ? (subjectData.totalMarks / subjectData.totalMaxMarks) * 100 
          : 0
        const averageMarks = subjectData.count > 0 
          ? subjectData.totalMarks / subjectData.count 
          : 0

        return {
          subjectId: normalizedName, // Use normalized name as ID for consistency
          subjectName: normalizedToDisplayName.get(normalizedName) || normalizedName,
          averageMarks: averageMarks,
          averagePercentage: averagePercentage,
          totalMarks: subjectData.totalMarks,
          totalMaxMarks: subjectData.totalMaxMarks,
          count: subjectData.count
        }
      }).sort((a, b) => a.subjectName.localeCompare(b.subjectName))
    }

    // Calculate overall stats
    const averageMarks = totalRecords > 0 ? totalMarks / totalRecords : 0
    const averagePercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0

    // Get student details and calculate per-student stats
    const studentIds = Object.keys(studentMarksMap)
    const students = await studentsCollection.find({
      _id: { $in: studentIds.map(id => new ObjectId(id)) },
      managementId: session.managementId
    }).toArray()

    const studentStats = students.map(student => {
      const studentId = student._id.toString()
      const marksData = studentMarksMap[studentId] || {
        totalMarks: 0,
        totalMaxMarks: 0,
        testCount: 0,
        tests: []
      }
      const percentage = marksData.totalMaxMarks > 0
        ? (marksData.totalMarks / marksData.totalMaxMarks) * 100
        : 0

      return {
        studentId,
        studentName: student.name || '',
        studentEmail: student.email || '',
        batch: student.batch || '',
        totalMarks: marksData.totalMarks,
        totalMaxMarks: marksData.totalMaxMarks,
        averageMarks: marksData.testCount > 0 ? marksData.totalMarks / marksData.testCount : 0,
        averagePercentage: percentage,
        testCount: marksData.testCount,
        tests: marksData.tests
      }
    })

    return NextResponse.json({
      chartData,
      stats: {
        totalTests: testIds.length,
        totalStudents: studentStats.length,
        averageMarks,
        averagePercentage,
        totalRecords
      },
      studentStats,
      subjectAverages // Subject-wise averages for All Classes view
    })
  } catch (error) {
    console.error('Marks stats API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}







