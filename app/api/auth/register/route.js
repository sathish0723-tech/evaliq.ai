import { NextResponse } from 'next/server'
import { getUsersCollection, getManagementCollection, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { extractEmailDomain, generateManagementId } from '@/lib/utils-management'
import { createSessionOnResponse } from '@/lib/session'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs')

/**
 * POST /api/auth/register
 * Handle user registration with email/password
 */
export async function POST(request) {
  try {
    // Initialize collections
    await initializeCollections(DB_NAME)
    
    const body = await request.json()
    const { email, password, name } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const usersCollection = await getUsersCollection(DB_NAME)
    const managementCollection = await getManagementCollection(DB_NAME)

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    const emailDomain = extractEmailDomain(email)

    // Check if management exists for this domain
    const existingManagement = await managementCollection.findOne({ emailDomain })

    const now = new Date()
    let managementId
    let userRole

    if (!existingManagement) {
      // First user from this domain - create management and make user admin
      managementId = await generateManagementId()
      
      await managementCollection.insertOne({
        managementId,
        emailDomain,
        name: name ? `${name}'s Organization` : 'My Organization',
        adminId: null, // Will be set after user creation
        createdAt: now,
        updatedAt: now,
      })

      userRole = 'admin'
    } else {
      // Management exists - add user with default role
      managementId = existingManagement.managementId
      userRole = 'student' // Default role for new users
    }

    // Create user
    const userResult = await usersCollection.insertOne({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || '',
      picture: '',
      managementId,
      role: userRole,
      emailDomain,
      createdAt: now,
      updatedAt: now,
    })

    // If this is the first user (admin), update management with adminId
    if (userRole === 'admin') {
      await managementCollection.updateOne(
        { managementId },
        { $set: { adminId: userResult.insertedId.toString() } }
      )
    }

    // Create session
    const response = NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: userResult.insertedId.toString(),
        email: email.toLowerCase(),
        name: name || '',
        role: userRole,
        managementId,
      }
    })

    const sessionData = {
      userId: userResult.insertedId.toString(),
      managementId,
      email: email.toLowerCase(),
      role: userRole,
    }

    return createSessionOnResponse(response, sessionData)
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register. Please try again.' },
      { status: 500 }
    )
  }
}

