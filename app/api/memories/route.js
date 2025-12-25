import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME, COLLECTIONS } from '@/lib/db/collections'
import { getSession } from '@/lib/session'
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary'

/**
 * GET /api/memories
 * Get memories for a batch or all memories
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
    const batch = searchParams.get('batch')
    const memoryId = searchParams.get('memoryId')

    const db = await getDb(DB_NAME)
    const memoriesCollection = db.collection(COLLECTIONS.MEMORIES)

    let query = { 
      managementId: session.managementId,
    }

    if (memoryId) {
      query.memoryId = memoryId
    }

    if (batch) {
      query.batch = batch.trim()
    }

    const memories = await memoriesCollection
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .toArray()

    return NextResponse.json({ memories })
  } catch (error) {
    console.error('Error fetching memories:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/memories
 * Create a new memory with images
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
    const name = formData.get('name')
    const date = formData.get('date')
    const data = formData.get('data') || ''
    const batch = formData.get('batch')

    if (!name || !date || !batch) {
      return NextResponse.json(
        { error: 'Memory name, date, and batch are required' },
        { status: 400 }
      )
    }

    // Get image files (max 25)
    const imageFiles = []
    for (let i = 0; i < 25; i++) {
      const file = formData.get(`image${i}`)
      if (file) {
        imageFiles.push(file)
      }
    }

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      )
    }

    if (imageFiles.length > 25) {
      return NextResponse.json(
        { error: 'Maximum 25 images allowed' },
        { status: 400 }
      )
    }

    // Upload images to Cloudinary
    const uploadedImages = []
    for (const file of imageFiles) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'All files must be images' },
          { status: 400 }
        )
      }

      // Validate file size (max 5MB per image)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'Each image must be less than 5MB' },
          { status: 400 }
        )
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(buffer, {
        folder: 'student-management/memories',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' },
        ],
      })

      uploadedImages.push({
        url: uploadResult.url,
        public_id: uploadResult.public_id,
      })
    }

    const db = await getDb(DB_NAME)
    const memoriesCollection = db.collection(COLLECTIONS.MEMORIES)

    // Generate unique memory ID
    const memoryId = `MEM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create memory
    const memory = {
      memoryId,
      name: name.trim(),
      date: new Date(date),
      data: data.trim(),
      batch: batch.trim(),
      images: uploadedImages,
      managementId: session.managementId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.userId,
    }

    const result = await memoriesCollection.insertOne(memory)

    return NextResponse.json({
      success: true,
      memory: {
        ...memory,
        _id: result.insertedId,
      },
    })
  } catch (error) {
    console.error('Error creating memory:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/memories
 * Update a memory
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

    const formData = await request.formData()
    const memoryId = formData.get('memoryId')
    const name = formData.get('name')
    const date = formData.get('date')
    const data = formData.get('data')
    const batch = formData.get('batch')

    if (!memoryId) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const memoriesCollection = db.collection(COLLECTIONS.MEMORIES)

    // Verify memory exists and belongs to management
    const existingMemory = await memoriesCollection.findOne({
      memoryId,
      managementId: session.managementId,
    })

    if (!existingMemory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    const updateData = {
      updatedAt: new Date(),
    }

    if (name !== null) {
      updateData.name = name.trim()
    }

    if (date !== null) {
      updateData.date = new Date(date)
    }

    if (data !== null) {
      updateData.data = data.trim()
    }

    if (batch !== null) {
      updateData.batch = batch.trim()
    }

    // Handle new image uploads if provided
    const newImageFiles = []
    for (let i = 0; i < 25; i++) {
      const file = formData.get(`image${i}`)
      if (file) {
        newImageFiles.push(file)
      }
    }

    if (newImageFiles.length > 0) {
      // Check total images won't exceed 25
      const currentImageCount = existingMemory.images?.length || 0
      if (currentImageCount + newImageFiles.length > 25) {
        return NextResponse.json(
          { error: 'Total images cannot exceed 25' },
          { status: 400 }
        )
      }

      // Upload new images to Cloudinary
      const uploadedImages = []
      for (const file of newImageFiles) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          return NextResponse.json(
            { error: 'All files must be images' },
            { status: 400 }
          )
        }

        // Validate file size (max 5MB per image)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
          return NextResponse.json(
            { error: 'Each image must be less than 5MB' },
            { status: 400 }
          )
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(buffer, {
          folder: 'student-management/memories',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' },
          ],
        })

        uploadedImages.push({
          url: uploadResult.url,
          public_id: uploadResult.public_id,
        })
      }

      // Combine existing images with new ones
      updateData.images = [...(existingMemory.images || []), ...uploadedImages]
    }

    const result = await memoriesCollection.updateOne(
      {
        memoryId,
        managementId: session.managementId,
      },
      {
        $set: updateData,
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    const updatedMemory = await memoriesCollection.findOne({
      memoryId,
      managementId: session.managementId,
    })

    return NextResponse.json({
      success: true,
      memory: updatedMemory,
    })
  } catch (error) {
    console.error('Error updating memory:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/memories
 * Delete a memory and its images from Cloudinary
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
    const memoryId = searchParams.get('memoryId')

    if (!memoryId) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const memoriesCollection = db.collection(COLLECTIONS.MEMORIES)

    // Get memory to delete images from Cloudinary
    const memory = await memoriesCollection.findOne({
      memoryId,
      managementId: session.managementId,
    })

    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    // Delete images from Cloudinary
    if (memory.images && memory.images.length > 0) {
      for (const image of memory.images) {
        if (image.public_id) {
          try {
            await deleteFromCloudinary(image.public_id)
          } catch (error) {
            console.error(`Error deleting image ${image.public_id}:`, error)
            // Continue even if image deletion fails
          }
        }
      }
    }

    // Delete memory from database
    const result = await memoriesCollection.deleteOne({
      memoryId,
      managementId: session.managementId,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Memory deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting memory:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

