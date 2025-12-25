import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getUsersCollection, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/users
 * Get current user or all users (admin only)
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
    const userId = searchParams.get('userId')
    const managementId = searchParams.get('managementId')

    const usersCollection = await getUsersCollection(DB_NAME)

    // If specific user ID requested
    if (userId) {
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      // Check if user has permission (own profile or admin)
      if (user._id.toString() !== session.userId && session.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      return NextResponse.json({ user })
    }

    // If managementId provided, get users from that management
    if (managementId) {
      // Verify user has access to this management
      if (session.managementId !== managementId && session.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const users = await usersCollection
        .find({ managementId })
        .project({ password: 0 }) // Exclude sensitive fields
        .toArray()

      return NextResponse.json({ users })
    }

    // Get current user
    const user = await usersCollection.findOne({ _id: new ObjectId(session.userId) })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Remove sensitive fields and convert _id to string
    const userData = {
      _id: user._id.toString(),
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
      managementId: user.managementId,
      role: user.role,
      emailDomain: user.emailDomain,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
    
    return NextResponse.json({ user: userData })
  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users
 * Update current user
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

    const body = await request.json()
    const { name, picture } = body

    const usersCollection = await getUsersCollection(DB_NAME)

    // Update user
    const updateData = {
      updatedAt: new Date(),
    }

    if (name !== undefined) updateData.name = name
    if (picture !== undefined) updateData.picture = picture

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(session.userId) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    })
  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

