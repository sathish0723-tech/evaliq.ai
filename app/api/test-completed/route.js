import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME, COLLECTIONS } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/test-completed
 * Get completed tests for a student or test
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
    const studentId = searchParams.get('studentId')
    const completedId = searchParams.get('completedId')

    const db = await getDb(DB_NAME)
    const testCompletedCollection = db.collection(COLLECTIONS.TEST_COMPLETED)

    let query = { managementId: session.managementId }
    
    if (completedId) {
      query.completedId = completedId
    } else if (testId && studentId) {
      query.testId = testId
      query.studentId = studentId
    } else if (testId) {
      query.testId = testId
    } else if (studentId) {
      query.studentId = studentId
    } else {
      // For students, only show their own completed tests
      if (session.role === 'student') {
        // Get student ID from session or students collection
        const studentsCollection = db.collection(COLLECTIONS.STUDENTS)
        const student = await studentsCollection.findOne({
          email: session.email,
          managementId: session.managementId,
        })
        if (student) {
          query.studentId = student.studentId
        } else {
          return NextResponse.json({ completedTests: [] })
        }
      }
    }

    const completedTests = await testCompletedCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()

    const formattedTests = completedTests.map(test => ({
      id: test._id.toString(),
      completedId: test.completedId,
      testId: test.testId,
      classId: test.classId,
      coachId: test.coachId,
      batch: test.batch,
      managementId: test.managementId,
      studentId: test.studentId,
      studentName: test.studentName,
      studentEmail: test.studentEmail,
      answers: test.answers || [],
      totalQuestions: test.totalQuestions || 0,
      totalPoints: test.totalPoints || 0,
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    }))

    return NextResponse.json({ completedTests: formattedTests })
  } catch (error) {
    console.error('Test Completed API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/test-completed
 * Submit a completed test
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
    const { testId, answers } = body

    if (!testId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Test ID and answers are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const testCompletedCollection = db.collection(COLLECTIONS.TEST_COMPLETED)
    const testsCollection = db.collection(COLLECTIONS.TESTS)
    const questionsCollection = db.collection(COLLECTIONS.QUESTIONS)
    const studentsCollection = db.collection(COLLECTIONS.STUDENTS)

    // Verify test exists and is published
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

    if (!test.published) {
      return NextResponse.json(
        { error: 'Test is not published' },
        { status: 400 }
      )
    }

    // Get student information
    const student = await studentsCollection.findOne({
      email: session.email,
      managementId: session.managementId,
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Check if student already completed this test
    const existingCompletion = await testCompletedCollection.findOne({
      testId,
      studentId: student.studentId,
      managementId: session.managementId,
    })

    if (existingCompletion) {
      return NextResponse.json(
        { error: 'Test already completed' },
        { status: 400 }
      )
    }

    // Get all questions for the test
    const questions = await questionsCollection
      .find({
        testId,
        managementId: session.managementId,
      })
      .sort({ order: 1, createdAt: 1 })
      .toArray()

    // Calculate total points
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)

    // Generate unique completed ID
    const completedId = await generateCompletedId(testCompletedCollection, session.managementId)

    // Get student batch
    const batch = student.batch || ''

    // Create completed test record
    const now = new Date()
    const result = await testCompletedCollection.insertOne({
      completedId,
      testId,
      classId: test.classId,
      coachId: test.coachId || '',
      batch,
      managementId: session.managementId,
      studentId: student.studentId,
      studentName: student.name,
      studentEmail: student.email,
      answers: answers.map(answer => ({
        questionId: answer.questionId,
        answer: answer.answer || '',
        type: answer.type,
      })),
      totalQuestions: questions.length,
      totalPoints,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      completedTest: {
        id: result.insertedId.toString(),
        completedId,
        testId,
        classId: test.classId,
        studentId: student.studentId,
        totalQuestions: questions.length,
        totalPoints,
      },
    })
  } catch (error) {
    console.error('Submit test API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate unique completed test ID
 */
async function generateCompletedId(testCompletedCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let completedId
  let isUnique = false

  while (!isUnique) {
    completedId = 'COMP_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    
    const existing = await testCompletedCollection.findOne({
      completedId,
      managementId,
    })
    
    if (!existing) {
      isUnique = true
    }
  }
  
  return completedId
}

