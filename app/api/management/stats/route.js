import { NextResponse } from 'next/server'
import { getManagementCollection, getUsersCollection, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/management/stats
 * Get management statistics (admin only)
 */
export async function GET(request) {
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
        { error: 'Only admins can view statistics' },
        { status: 403 }
      )
    }

    const managementCollection = await getManagementCollection(DB_NAME)
    const usersCollection = await getUsersCollection(DB_NAME)

    // Get management
    const management = await managementCollection.findOne({
      managementId: session.managementId,
    })

    if (!management) {
      return NextResponse.json(
        { error: 'Management not found' },
        { status: 404 }
      )
    }

    // Get user counts
    const totalUsers = await usersCollection.countDocuments({
      managementId: session.managementId,
    })

    const adminCount = await usersCollection.countDocuments({
      managementId: session.managementId,
      role: 'admin',
    })

    const userCount = await usersCollection.countDocuments({
      managementId: session.managementId,
      role: 'user',
    })

    return NextResponse.json({
      stats: {
        totalUsers,
        adminCount,
        userCount,
        numCoaches: management.numCoaches || 0,
        numStudents: management.numStudents || 0,
        managementName: management.name || '',
        emailDomain: management.emailDomain,
        createdAt: management.createdAt,
      },
    })
  } catch (error) {
    console.error('Management stats API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


