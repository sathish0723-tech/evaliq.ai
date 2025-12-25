import { NextResponse } from 'next/server'
import { getManagementCollection, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const setupSchema = z.object({
  managementId: z.string().min(1, 'Management ID is required'),
  name: z.string().min(2, 'Management name must be at least 2 characters'),
  numCoaches: z.number().min(0).int(),
  numStudents: z.number().min(0).int(),
  logo: z.string().optional(),
})

export async function POST(request) {
  try {
    // Check authentication
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can complete setup' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = setupSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { managementId, name, numCoaches, numStudents, logo } = validationResult.data

    // Verify managementId matches session
    if (session.managementId !== managementId) {
      return NextResponse.json(
        { error: 'Management ID mismatch' },
        { status: 403 }
      )
    }

    // Initialize collections
    await initializeCollections(DB_NAME)
    
    // Get management collection
    const managementCollection = await getManagementCollection(DB_NAME)

    // Check if management exists
    const management = await managementCollection.findOne({ managementId })
    if (!management) {
      return NextResponse.json(
        { error: 'Management not found' },
        { status: 404 }
      )
    }

    // Verify user is the admin of this management
    if (management.adminId !== session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to update this management' },
        { status: 403 }
      )
    }

    // Update management
    const updateData = {
      name,
      numCoaches,
      numStudents,
      updatedAt: new Date(),
    }

    if (logo) {
      updateData.logo = logo
    }

    await managementCollection.updateOne(
      { managementId },
      { $set: updateData }
    )

    return NextResponse.json({
      success: true,
      message: 'Management setup completed successfully',
    })
  } catch (error) {
    console.error('Setup API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

