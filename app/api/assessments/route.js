import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME, COLLECTIONS } from '@/lib/db/collections'
import { getSession } from '@/lib/session'
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary'

/**
 * GET /api/assessments
 * Get assessments for a section or all assessments
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
    const section = searchParams.get('section')
    const assessmentId = searchParams.get('assessmentId')
    const classId = searchParams.get('classId')

    const db = await getDb(DB_NAME)
    const assessmentsCollection = db.collection(COLLECTIONS.ASSESSMENTS)

    let query = { 
      managementId: session.managementId,
    }

    if (assessmentId) {
      query.assessmentId = assessmentId
    }

    if (classId) {
      query.classId = classId.trim()
    }

    if (section) {
      query.section = section.trim()
    }

    const assessments = await assessmentsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ assessments })
  } catch (error) {
    console.error('Error fetching assessments:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/assessments
 * Create a new assessment with file upload
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

    const formData = await request.formData()
    const section = formData.get('section')
    const classId = formData.get('classId')
    const title = formData.get('title') || ''
    const description = formData.get('description') || ''
    const file = formData.get('file')

    if (!section) {
      return NextResponse.json(
        { error: 'Section is required' },
        { status: 400 }
      )
    }

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB for documents)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determine resource type based on file type
    const isImage = file.type.startsWith('image/')
    const resourceType = isImage ? 'image' : 'raw' // raw for PDFs, docs, etc.

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(buffer, {
      folder: 'student-management/assessments',
      resource_type: resourceType,
      transformation: isImage ? [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' },
      ] : undefined,
    })

    const db = await getDb(DB_NAME)
    const assessmentsCollection = db.collection(COLLECTIONS.ASSESSMENTS)

    // Generate unique assessment ID
    const assessmentId = `ASSESS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create assessment
    const assessment = {
      assessmentId,
      classId: classId.trim(),
      section: section.trim(),
      title: title.trim(),
      description: description.trim(),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: uploadResult.url,
      publicId: uploadResult.public_id,
      resourceType: resourceType,
      managementId: session.managementId,
      createdBy: session.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await assessmentsCollection.insertOne(assessment)

    return NextResponse.json({
      success: true,
      assessment: {
        ...assessment,
        _id: result.insertedId,
      },
    })
  } catch (error) {
    console.error('Error creating assessment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/assessments
 * Delete an assessment
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

    const { searchParams } = new URL(request.url)
    const assessmentId = searchParams.get('assessmentId')

    if (!assessmentId) {
      return NextResponse.json(
        { error: 'Assessment ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const assessmentsCollection = db.collection(COLLECTIONS.ASSESSMENTS)

    // Find the assessment
    const assessment = await assessmentsCollection.findOne({
      assessmentId,
      managementId: session.managementId,
    })

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // Delete file from Cloudinary if publicId exists
    if (assessment.publicId) {
      try {
        await deleteFromCloudinary(assessment.publicId)
      } catch (error) {
        console.error('Error deleting file from Cloudinary:', error)
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    const result = await assessmentsCollection.deleteOne({
      assessmentId,
      managementId: session.managementId,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting assessment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

