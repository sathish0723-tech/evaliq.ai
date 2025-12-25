import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME, COLLECTIONS } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/questions
 * Get all questions for a test
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
    const questionId = searchParams.get('questionId')

    if (!testId && !questionId) {
      return NextResponse.json(
        { error: 'Test ID or Question ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const questionsCollection = db.collection(COLLECTIONS.QUESTIONS)

    let query = { managementId: session.managementId }
    
    if (questionId) {
      query.questionId = questionId
    } else if (testId) {
      query.testId = testId
    }

    const questions = await questionsCollection
      .find(query)
      .sort({ order: 1, createdAt: 1 })
      .toArray()

    const formattedQuestions = questions.map(question => ({
      id: question._id.toString(),
      questionId: question.questionId,
      testId: question.testId,
      classId: question.classId,
      type: question.type,
      question: question.question,
      options: question.options || [],
      correctAnswer: question.correctAnswer,
      fillInBlanks: question.fillInBlanks || [],
      order: question.order || 0,
      points: question.points || 1,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    }))

    return NextResponse.json({ questions: formattedQuestions })
  } catch (error) {
    console.error('Questions API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/questions
 * Create a new question
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
    const { testId, classId, type, question, options, correctAnswer, fillInBlanks, points, order } = body

    if (!testId || !classId || !type || !question) {
      return NextResponse.json(
        { error: 'Test ID, Class ID, type, and question are required' },
        { status: 400 }
      )
    }

    // Validate question type specific requirements
    if (type === 'multiple_choice' && (!options || options.length < 2)) {
      return NextResponse.json(
        { error: 'Multiple choice questions require at least 2 options' },
        { status: 400 }
      )
    }

    if (type === 'multiple_choice' && !correctAnswer) {
      return NextResponse.json(
        { error: 'Multiple choice questions require a correct answer' },
        { status: 400 }
      )
    }

    if (type === 'fill_in_blanks' && (!fillInBlanks || fillInBlanks.length === 0)) {
      return NextResponse.json(
        { error: 'Fill in the blanks questions require at least one blank' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const questionsCollection = db.collection(COLLECTIONS.QUESTIONS)
    const testsCollection = db.collection(COLLECTIONS.TESTS)

    // Verify test exists
    const existingTest = await testsCollection.findOne({
      testId,
      managementId: session.managementId,
    })

    if (!existingTest) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      )
    }

    // Generate unique question ID
    const questionId = await generateQuestionId(questionsCollection, session.managementId)

    // Get the next order number if not provided
    let questionOrder = order
    if (questionOrder === undefined || questionOrder === null) {
      const lastQuestion = await questionsCollection
        .findOne(
          { testId, managementId: session.managementId },
          { sort: { order: -1 } }
        )
      questionOrder = lastQuestion ? (lastQuestion.order || 0) + 1 : 1
    }

    // Create question
    const now = new Date()
    const result = await questionsCollection.insertOne({
      questionId,
      testId,
      classId,
      type,
      question,
      options: type === 'multiple_choice' ? options : [],
      correctAnswer: type === 'multiple_choice' || type === 'short_answer' ? correctAnswer : '',
      fillInBlanks: type === 'fill_in_blanks' ? fillInBlanks : [],
      points: points || 1,
      order: questionOrder,
      managementId: session.managementId,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      question: {
        id: result.insertedId.toString(),
        questionId,
        testId,
        classId,
        type,
        question,
        options: type === 'multiple_choice' ? options : [],
        correctAnswer: type === 'multiple_choice' || type === 'short_answer' ? correctAnswer : '',
        fillInBlanks: type === 'fill_in_blanks' ? fillInBlanks : [],
        points: points || 1,
        order: questionOrder,
      },
    })
  } catch (error) {
    console.error('Create question API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/questions
 * Update a question
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
    const { id, type, question, options, correctAnswer, fillInBlanks, points, order } = body

    if (!id || !type || !question) {
      return NextResponse.json(
        { error: 'Question ID, type, and question are required' },
        { status: 400 }
      )
    }

    // Validate question type specific requirements
    if (type === 'multiple_choice' && (!options || options.length < 2)) {
      return NextResponse.json(
        { error: 'Multiple choice questions require at least 2 options' },
        { status: 400 }
      )
    }

    if (type === 'multiple_choice' && !correctAnswer) {
      return NextResponse.json(
        { error: 'Multiple choice questions require a correct answer' },
        { status: 400 }
      )
    }

    if (type === 'fill_in_blanks' && (!fillInBlanks || fillInBlanks.length === 0)) {
      return NextResponse.json(
        { error: 'Fill in the blanks questions require at least one blank' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const questionsCollection = db.collection(COLLECTIONS.QUESTIONS)

    // Verify question belongs to the same management
    const existingQuestion = await questionsCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Update question
    const updateData = {
      type,
      question,
      points: points || existingQuestion.points || 1,
      updatedAt: new Date(),
    }

    if (type === 'multiple_choice') {
      updateData.options = options
      updateData.correctAnswer = correctAnswer
      updateData.fillInBlanks = []
    } else if (type === 'short_answer') {
      updateData.correctAnswer = correctAnswer
      updateData.options = []
      updateData.fillInBlanks = []
    } else if (type === 'fill_in_blanks') {
      updateData.fillInBlanks = fillInBlanks
      updateData.options = []
      updateData.correctAnswer = ''
    }

    if (order !== undefined && order !== null) {
      updateData.order = order
    }

    await questionsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    return NextResponse.json({
      success: true,
      message: 'Question updated successfully',
    })
  } catch (error) {
    console.error('Update question API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/questions
 * Delete a question
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
        { error: 'Question ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const questionsCollection = db.collection(COLLECTIONS.QUESTIONS)

    // Verify question belongs to the same management
    const existingQuestion = await questionsCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Delete question
    await questionsCollection.deleteOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully',
    })
  } catch (error) {
    console.error('Delete question API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate unique question ID
 */
async function generateQuestionId(questionsCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let questionId
  let isUnique = false

  while (!isUnique) {
    questionId = 'Q_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    
    const existing = await questionsCollection.findOne({
      questionId,
      managementId,
    })
    
    if (!existing) {
      isUnique = true
    }
  }
  
  return questionId
}

