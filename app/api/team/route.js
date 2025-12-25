import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getUsersCollection, getManagementCollection, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/team
 * Get all users in the management (admin only)
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

    // Verify user is admin
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can access team management' },
        { status: 403 }
      )
    }

    const usersCollection = await getUsersCollection(DB_NAME)
    const managementCollection = await getManagementCollection(DB_NAME)

    // Verify management exists
    const management = await managementCollection.findOne({
      managementId: session.managementId,
    })

    if (!management) {
      return NextResponse.json(
        { error: 'Management not found' },
        { status: 404 }
      )
    }

    // Get all users in this management
    const users = await usersCollection
      .find({ managementId: session.managementId })
      .project({ password: 0, googleId: 0 }) // Exclude sensitive fields
      .sort({ createdAt: -1 })
      .toArray()

    // Serialize users
    const usersData = users.map(user => ({
      _id: user._id.toString(),
      email: user.email,
      name: user.name || '',
      picture: user.picture || '',
      role: user.role || 'student',
      emailDomain: user.emailDomain,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))

    return NextResponse.json({ users: usersData })
  } catch (error) {
    console.error('Team API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/team
 * Invite/add a user to the platform (admin only)
 */
export async function POST(request) {
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
        { error: 'Only admins can invite users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, name, role = 'student' } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['admin', 'coach', 'student']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    const usersCollection = await getUsersCollection(DB_NAME)
    const managementCollection = await getManagementCollection(DB_NAME)

    // Verify management exists
    const management = await managementCollection.findOne({
      managementId: session.managementId,
    })

    if (!management) {
      return NextResponse.json(
        { error: 'Management not found' },
        { status: 404 }
      )
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() })

    if (existingUser) {
      // If user exists but in different management, return error
      if (existingUser.managementId !== session.managementId) {
        return NextResponse.json(
          { error: 'User already exists in another management' },
          { status: 400 }
        )
      }
      // If user exists in same management, update their role
      await usersCollection.updateOne(
        { _id: existingUser._id },
        { 
          $set: { 
            role: role,
            updatedAt: new Date(),
            ...(name && { name })
          } 
        }
      )

      return NextResponse.json({
        success: true,
        message: 'User role updated successfully',
        user: {
          _id: existingUser._id.toString(),
          email: existingUser.email,
          name: existingUser.name || name || '',
          role: role,
        }
      })
    }

    // Extract email domain
    const emailDomain = email.split('@')[1]?.toLowerCase() || ''

    // Create new user (they'll need to sign in via OAuth to activate)
    const newUser = {
      email: email.toLowerCase(),
      name: name || '',
      picture: '',
      managementId: session.managementId,
      role: role,
      emailDomain: emailDomain,
      googleId: '', // Will be set when they sign in via OAuth
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await usersCollection.insertOne(newUser)

    return NextResponse.json({
      success: true,
      message: 'User invited successfully. They will need to sign in via OAuth to activate their account.',
      user: {
        _id: result.insertedId.toString(),
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      }
    })
  } catch (error) {
    console.error('Team API error:', error)
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/team
 * Update user role (admin only)
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
        { error: 'Only admins can update user roles' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['admin', 'coach', 'student']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    const usersCollection = await getUsersCollection(DB_NAME)
    const managementCollection = await getManagementCollection(DB_NAME)

    // Verify management exists
    const management = await managementCollection.findOne({
      managementId: session.managementId,
    })

    if (!management) {
      return NextResponse.json(
        { error: 'Management not found' },
        { status: 404 }
      )
    }

    // Get user to update
    let user
    try {
      user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify user belongs to same management
    if (user.managementId !== session.managementId) {
      return NextResponse.json(
        { error: 'User does not belong to this management' },
        { status: 403 }
      )
    }

    // Prevent admin from removing their own admin access
    if (user._id.toString() === session.userId && role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot remove your own admin access' },
        { status: 400 }
      )
    }

    // Update user role
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          role: role,
          updatedAt: new Date(),
        } 
      }
    )

    return NextResponse.json({
      success: true,
      message: 'User role updated successfully',
    })
  } catch (error) {
    console.error('Team API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/team
 * Remove user from management (admin only)
 */
export async function DELETE(request) {
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
        { error: 'Only admins can remove users' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const usersCollection = await getUsersCollection(DB_NAME)
    const managementCollection = await getManagementCollection(DB_NAME)

    // Verify management exists
    const management = await managementCollection.findOne({
      managementId: session.managementId,
    })

    if (!management) {
      return NextResponse.json(
        { error: 'Management not found' },
        { status: 404 }
      )
    }

    // Get user to delete
    let user
    try {
      user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify user belongs to same management
    if (user.managementId !== session.managementId) {
      return NextResponse.json(
        { error: 'User does not belong to this management' },
        { status: 403 }
      )
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === session.userId) {
      return NextResponse.json(
        { error: 'You cannot remove yourself' },
        { status: 400 }
      )
    }

    // Prevent deleting the management admin
    if (management.adminId === userId) {
      return NextResponse.json(
        { error: 'Cannot remove the management admin' },
        { status: 400 }
      )
    }

    // Remove user
    await usersCollection.deleteOne({ _id: new ObjectId(userId) })

    return NextResponse.json({
      success: true,
      message: 'User removed successfully',
    })
  } catch (error) {
    console.error('Team API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

