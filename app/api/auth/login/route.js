import { NextResponse } from 'next/server'
import { getUsersCollection, getManagementCollection, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { extractEmailDomain, generateManagementId } from '@/lib/utils-management'
import { createSessionOnResponse } from '@/lib/session'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs')

/**
 * POST /api/auth/login
 * Handle email/password authentication
 */
export async function POST(request) {
  try {
    // Initialize collections
    await initializeCollections(DB_NAME)
    
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const usersCollection = await getUsersCollection(DB_NAME)
    const managementCollection = await getManagementCollection(DB_NAME)

    // Find user by email (case-insensitive)
    const user = await usersCollection.findOne({ email: email.toLowerCase() })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user has a password set
    if (!user.password) {
      return NextResponse.json(
        { error: 'This account does not have a password set. Please use Google sign-in or set a password first.' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { updatedAt: new Date() } }
    )

    // Create session and redirect to dashboard
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        managementId: user.managementId,
      }
    })

    const sessionData = {
      userId: user._id.toString(),
      managementId: user.managementId,
      email: user.email,
      role: user.role,
    }

    return createSessionOnResponse(response, sessionData)
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to login. Please try again.' },
      { status: 500 }
    )
  }
}

