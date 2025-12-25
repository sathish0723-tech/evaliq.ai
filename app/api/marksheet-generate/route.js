import { NextResponse } from 'next/server'
import { getDb, COLLECTIONS } from '@/lib/db/collections'
import { getSession } from '@/lib/session'
import { getCurrentBatch } from '@/lib/utils-batch'

// GET - Fetch generated marksheets
export async function GET(request) {
  try {
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')
    const classId = searchParams.get('classId')
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status') // draft, pending_review, approved, published
    const batch = searchParams.get('batch')

    const db = await getDb()
    const collection = db.collection(COLLECTIONS.GENERATED_MARKSHEETS)

    const query = {
      managementId: session.managementId
    }
    if (batch) query.batch = batch

    if (templateId) query.templateId = templateId
    if (classId) query.classId = classId
    if (studentId) query.studentId = studentId
    if (status) query.status = status

    const marksheets = await collection.find(query).sort({ createdAt: -1 }).toArray()

    return NextResponse.json({ marksheets })
  } catch (error) {
    console.error('Error fetching generated marksheets:', error)
    return NextResponse.json({ error: 'Failed to fetch marksheets' }, { status: 500 })
  }
}

// POST - Generate marksheets for students
export async function POST(request) {
  try {
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      templateId,
      classId,
      students, // Array of student data with marks
      batch
    } = body

    if (!templateId || !classId || !students || !students.length) {
      return NextResponse.json({ 
        error: 'Template ID, Class ID, and students data are required' 
      }, { status: 400 })
    }

    const currentBatch = batch || getCurrentBatch()
    const db = await getDb()

    // Get the template
    const templatesCollection = db.collection(COLLECTIONS.MARKSHEET_TEMPLATES)
    const template = await templatesCollection.findOne({
      templateId,
      managementId: session.managementId
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Generate marksheets for each student
    const marksheetsCollection = db.collection(COLLECTIONS.GENERATED_MARKSHEETS)
    const generatedMarksheets = []

    for (const student of students) {
      const marksheetId = `mks_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      
      // Calculate totals
      const totalMaxMarks = student.subjects.reduce((acc, s) => acc + (parseInt(s.maxMarks) || 0), 0)
      const totalObtainedMarks = student.subjects.reduce((acc, s) => acc + (parseInt(s.obtainedMarks) || 0), 0)
      const percentage = totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) : 0
      
      let grade = ""
      if (percentage >= 90) grade = "A+"
      else if (percentage >= 80) grade = "A"
      else if (percentage >= 70) grade = "B+"
      else if (percentage >= 60) grade = "B"
      else if (percentage >= 50) grade = "C"
      else if (percentage >= 40) grade = "D"
      else grade = "F"

      const marksheet = {
        marksheetId,
        templateId,
        classId,
        studentId: student.studentId,
        studentName: student.studentName,
        studentClass: student.studentClass,
        rollNumber: student.rollNumber,
        logo: template.logo,
        institutionName: template.institutionName,
        subtitle: template.subtitle,
        subjects: student.subjects,
        totalMaxMarks,
        totalObtainedMarks,
        percentage: parseFloat(percentage),
        grade,
        result: parseFloat(percentage) >= 40 ? 'PASS' : 'FAIL',
        remarks: student.remarks || '',
        status: 'pending_review', // draft, pending_review, approved, published
        managementId: session.managementId,
        batch: currentBatch,
        createdBy: session.email,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      generatedMarksheets.push(marksheet)
    }

    if (generatedMarksheets.length > 0) {
      await marksheetsCollection.insertMany(generatedMarksheets)
    }

    return NextResponse.json({ 
      success: true, 
      count: generatedMarksheets.length,
      marksheets: generatedMarksheets,
      message: `${generatedMarksheets.length} marksheets generated successfully` 
    })
  } catch (error) {
    console.error('Error generating marksheets:', error)
    return NextResponse.json({ error: 'Failed to generate marksheets' }, { status: 500 })
  }
}

// PUT - Update marksheet status or data (for review/approval)
export async function PUT(request) {
  try {
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      marksheetId,
      marksheetIds, // For bulk updates
      status,
      subjects,
      remarks
    } = body

    const db = await getDb()
    const collection = db.collection(COLLECTIONS.GENERATED_MARKSHEETS)

    // Bulk update
    if (marksheetIds && marksheetIds.length > 0) {
      const result = await collection.updateMany(
        { 
          marksheetId: { $in: marksheetIds },
          managementId: session.managementId 
        },
        { 
          $set: { 
            status,
            updatedAt: new Date(),
            reviewedBy: session.email,
            reviewedAt: new Date()
          } 
        }
      )

      return NextResponse.json({ 
        success: true, 
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} marksheets updated` 
      })
    }

    // Single update
    if (!marksheetId) {
      return NextResponse.json({ error: 'Marksheet ID is required' }, { status: 400 })
    }

    const updateData = {
      ...(status && { status }),
      ...(remarks !== undefined && { remarks }),
      updatedAt: new Date()
    }

    // If subjects are updated, recalculate totals
    if (subjects) {
      const totalMaxMarks = subjects.reduce((acc, s) => acc + (parseInt(s.maxMarks) || 0), 0)
      const totalObtainedMarks = subjects.reduce((acc, s) => acc + (parseInt(s.obtainedMarks) || 0), 0)
      const percentage = totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) : 0
      
      let grade = ""
      if (percentage >= 90) grade = "A+"
      else if (percentage >= 80) grade = "A"
      else if (percentage >= 70) grade = "B+"
      else if (percentage >= 60) grade = "B"
      else if (percentage >= 50) grade = "C"
      else if (percentage >= 40) grade = "D"
      else grade = "F"

      updateData.subjects = subjects
      updateData.totalMaxMarks = totalMaxMarks
      updateData.totalObtainedMarks = totalObtainedMarks
      updateData.percentage = parseFloat(percentage)
      updateData.grade = grade
      updateData.result = parseFloat(percentage) >= 40 ? 'PASS' : 'FAIL'
    }

    if (status === 'approved') {
      updateData.reviewedBy = session.email
      updateData.reviewedAt = new Date()
    }

    const result = await collection.updateOne(
      { marksheetId, managementId: session.managementId },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Marksheet not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Marksheet updated successfully' 
    })
  } catch (error) {
    console.error('Error updating marksheet:', error)
    return NextResponse.json({ error: 'Failed to update marksheet' }, { status: 500 })
  }
}

// DELETE - Delete generated marksheets
export async function DELETE(request) {
  try {
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const marksheetId = searchParams.get('marksheetId')
    const templateId = searchParams.get('templateId') // Delete all for a template

    const db = await getDb()
    const collection = db.collection(COLLECTIONS.GENERATED_MARKSHEETS)

    if (templateId) {
      // Delete all marksheets for a template
      const result = await collection.deleteMany({
        templateId,
        managementId: session.managementId
      })

      return NextResponse.json({ 
        success: true, 
        deletedCount: result.deletedCount,
        message: `${result.deletedCount} marksheets deleted` 
      })
    }

    if (!marksheetId) {
      return NextResponse.json({ error: 'Marksheet ID is required' }, { status: 400 })
    }

    const result = await collection.deleteOne({
      marksheetId,
      managementId: session.managementId
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Marksheet not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Marksheet deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting marksheet:', error)
    return NextResponse.json({ error: 'Failed to delete marksheet' }, { status: 500 })
  }
}

