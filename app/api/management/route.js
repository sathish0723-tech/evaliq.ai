import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getManagementCollection, getUsersCollection, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/management
 * Get management information
 */
export async function GET(request) {
  try {
    // Initialize collections
    await initializeCollections(DB_NAME)
    
    // Check authentication
    const session = await getSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in again' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const managementId = searchParams.get('managementId') || session.managementId

    if (!managementId) {
      return NextResponse.json(
        { error: 'Management ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this management
    if (session.managementId !== managementId && session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const managementCollection = await getManagementCollection(DB_NAME)
    const management = await managementCollection.findOne({ managementId })

    if (!management) {
      return NextResponse.json(
        { error: 'Management not found' },
        { status: 404 }
      )
    }

    // Get admin user info
    const usersCollection = await getUsersCollection(DB_NAME)
    let admin = null
    if (management.adminId) {
      try {
        admin = await usersCollection.findOne({ _id: new ObjectId(management.adminId) })
      } catch (error) {
        console.error('Error fetching admin:', error)
      }
    }

    // Serialize management data
    const managementData = {
      _id: management._id.toString(),
      managementId: management.managementId,
      name: management.name,
      emailDomain: management.emailDomain,
      adminId: management.adminId,
      numCoaches: management.numCoaches,
      numStudents: management.numStudents,
      logo: management.logo,
      createdAt: management.createdAt,
      updatedAt: management.updatedAt,
      admin: admin ? {
        _id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        picture: admin.picture,
      } : null,
    }

    return NextResponse.json({
      management: managementData,
    })
  } catch (error) {
    console.error('Management API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/management
 * Update management information (admin only)
 */
export async function PUT(request) {
  try {
    // Initialize collections
    await initializeCollections(DB_NAME)
    
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
        { error: 'Only admins can update management information' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, numCoaches, numStudents, logo } = body

    const managementCollection = await getManagementCollection(DB_NAME)

    // Get management to verify it exists
    const management = await managementCollection.findOne({
      managementId: session.managementId,
    })

    if (!management) {
      return NextResponse.json(
        { error: 'Management not found' },
        { status: 404 }
      )
    }

    // Update management
    const updateData = {
      updatedAt: new Date(),
    }

    if (name !== undefined) updateData.name = name
    if (numCoaches !== undefined) updateData.numCoaches = numCoaches
    if (numStudents !== undefined) updateData.numStudents = numStudents
    if (logo !== undefined) updateData.logo = logo

    await managementCollection.updateOne(
      { managementId: session.managementId },
      { $set: updateData }
    )

    return NextResponse.json({
      success: true,
      message: 'Management updated successfully',
    })
  } catch (error) {
    console.error('Management API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

