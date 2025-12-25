import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/tasks
 * Get tasks for a class or student
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
    const studentId = searchParams.get('studentId')
    const batch = searchParams.get('batch')

    const db = await getDb(DB_NAME)
    const tasksCollection = db.collection('tasks')
    const studentsCollection = db.collection('students')

    let query = { managementId: session.managementId }

    if (classId) {
      query.classId = classId
    }

    if (studentId) {
      query.studentId = new ObjectId(studentId)
    }

    // If batch is specified, filter tasks to only include students in that batch
    if (batch && !studentId) {
      const normalizedBatch = batch.trim()
      const studentsInBatch = await studentsCollection.find({
        managementId: session.managementId,
        batch: normalizedBatch,
        ...(classId ? { classId } : {}),
      }).toArray()

      const studentIds = studentsInBatch.map(s => s._id)
      if (studentIds.length === 0) {
        return NextResponse.json({ tasks: [] })
      }
      query.studentId = { $in: studentIds }
    }

    const tasks = await tasksCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()

    // Populate student information
    const tasksWithStudents = await Promise.all(
      tasks.map(async (task) => {
        const student = await studentsCollection.findOne({
          _id: task.studentId,
          managementId: session.managementId,
        })

        return {
          ...task,
          studentName: student?.name || 'Unknown',
          studentEmail: student?.email || '',
          studentImage: student?.image || null,
        }
      })
    )

    return NextResponse.json({ tasks: tasksWithStudents })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks
 * Create a new task (admin or coach only)
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

    // Check if user is admin or coach
    if (session.role !== 'admin' && session.role !== 'coach') {
      return NextResponse.json(
        { error: 'Only admins and coaches can create tasks' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { classId, studentId, description, status, feedback, isCommonTask, deadline } = body

    if (!classId || !description) {
      return NextResponse.json(
        { error: 'Class ID and description are required' },
        { status: 400 }
      )
    }

    if (!isCommonTask && !studentId) {
      return NextResponse.json(
        { error: 'Student ID is required for manual tasks' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const tasksCollection = db.collection('tasks')
    const studentsCollection = db.collection('students')

    // Handle common task (for all students in the class)
    if (isCommonTask) {
      // Get all students in the class
      const students = await studentsCollection.find({
        classId,
        managementId: session.managementId,
      }).toArray()

      if (students.length === 0) {
        return NextResponse.json(
          { error: 'No students found in this class' },
          { status: 404 }
        )
      }

      // Create tasks for all students
      const baseTimestamp = Date.now()
      const tasks = students.map((student, index) => ({
        taskId: `TASK_${baseTimestamp}_${Math.random().toString(36).substr(2, 9)}_${student._id}_${index}`,
        classId,
        studentId: student._id,
        managementId: session.managementId,
        description,
        status: status || 'pending',
        feedback: feedback || '',
        deadline: deadline ? new Date(deadline) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: session.userId,
      }))

      const results = await tasksCollection.insertMany(tasks)

      // Populate student information for response
      const tasksWithStudents = tasks.map((task, index) => {
        const student = students[index]
        return {
          ...task,
          _id: results.insertedIds[index],
          studentName: student.name,
          studentEmail: student.email,
          studentImage: student.image || null,
        }
      })

      return NextResponse.json({
        tasks: tasksWithStudents,
        message: `Created ${tasksWithStudents.length} tasks for all students`,
      })
    }

    // Handle manual task (for single student)
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

    // Create task
    const task = {
      taskId: `TASK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      classId,
      studentId: new ObjectId(studentId),
      managementId: session.managementId,
      description,
      status: status || 'pending',
      feedback: feedback || '',
      deadline: deadline ? new Date(deadline) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.userId,
    }

    const result = await tasksCollection.insertOne(task)

    return NextResponse.json({
      task: {
        ...task,
        _id: result.insertedId,
        studentName: student.name,
        studentEmail: student.email,
        studentImage: student.image || null,
      },
    })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/tasks
 * Update a task (admin or coach only)
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

    // Check if user is admin or coach
    if (session.role !== 'admin' && session.role !== 'coach') {
      return NextResponse.json(
        { error: 'Only admins and coaches can update tasks' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { taskId, status, feedback, description } = body

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const tasksCollection = db.collection('tasks')

    const updateData = {
      updatedAt: new Date(),
    }

    if (status !== undefined) {
      updateData.status = status
    }

    if (feedback !== undefined) {
      updateData.feedback = feedback
    }

    if (description !== undefined) {
      updateData.description = description
    }

    const result = await tasksCollection.updateOne(
      {
        taskId,
        managementId: session.managementId,
      },
      {
        $set: updateData,
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Get updated task
    const updatedTask = await tasksCollection.findOne({
      taskId,
      managementId: session.managementId,
    })

    // Populate student information
    const studentsCollection = db.collection('students')
    const student = await studentsCollection.findOne({
      _id: updatedTask.studentId,
      managementId: session.managementId,
    })

    return NextResponse.json({
      task: {
        ...updatedTask,
        studentName: student?.name || 'Unknown',
        studentEmail: student?.email || '',
        studentImage: student?.image || null,
      },
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

