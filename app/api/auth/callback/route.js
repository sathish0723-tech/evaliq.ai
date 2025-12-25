import { NextResponse } from 'next/server'
import { getUsersCollection, getManagementCollection, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { extractEmailDomain, generateManagementId } from '@/lib/utils-management'
import { createSessionOnResponse } from '@/lib/session'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/onboarding?error=no_code', request.url)
    )
  }

  try {
    // Exchange authorization code for access token
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 })
    }
    
    const redirectUri = `${new URL(request.url).origin}/api/auth/callback`

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      const errorMessage = errorData.error_description || errorData.error || 'Failed to exchange code for token'
      
      if (errorData.error === 'redirect_uri_mismatch') {
        throw new Error(
          `OAuth redirect URI mismatch. The redirect URI "${redirectUri}" is not registered in Google Cloud Console. ` +
          `Please add this exact URI to your OAuth client settings. See OAUTH_SETUP.md for instructions.`
        )
      }
      
      throw new Error(`OAuth error: ${errorMessage}`)
    }

    const tokens = await tokenResponse.json()

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info')
    }

    const userInfo = await userResponse.json()
    const { id: googleId, email, name, picture } = userInfo

    if (!email) {
      throw new Error('Email not provided by Google')
    }

    // Extract email domain
    const emailDomain = extractEmailDomain(email)
    if (!emailDomain) {
      throw new Error('Invalid email address')
    }

    // Initialize collections
    await initializeCollections(DB_NAME)
    
    // Get collections
    const usersCollection = await getUsersCollection(DB_NAME)
    const managementCollection = await getManagementCollection(DB_NAME)

    // Check if user already exists (case-insensitive email search)
    let user = await usersCollection.findOne({ email: email.toLowerCase() })

    if (user) {
      // Existing user - update last login and OAuth data if needed
      const updateData = {
        updatedAt: new Date(),
      }
      
      // Update googleId if it was missing (for pre-invited users)
      if (!user.googleId) {
        updateData.googleId = googleId
        updateData.name = name || user.name || ''
        updateData.picture = picture || user.picture || ''
      }
      
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: updateData }
      )

      // Create session
      const response = NextResponse.redirect(new URL('/dashboard', request.url))
      const sessionData = {
        userId: user._id.toString(),
        managementId: user.managementId,
        email: user.email,
        role: user.role,
      }
      console.log('Setting session for existing user:', sessionData)
      return createSessionOnResponse(response, sessionData)
    }

    // New user - check if management exists for this domain
    const existingManagement = await managementCollection.findOne({ emailDomain })

    if (!existingManagement) {
      // First user from this domain - create management and make user admin
      const managementId = await generateManagementId()
      
      // Create user first
      const now = new Date()
      const userResult = await usersCollection.insertOne({
        googleId,
        email: email.toLowerCase(),
        name: name || '',
        picture: picture || '',
        managementId,
        role: 'admin',
        emailDomain,
        createdAt: now,
        updatedAt: now,
      })

      const userId = userResult.insertedId

      // Create management record
      await managementCollection.insertOne({
        managementId,
        name: '', // Will be set in setup page
        emailDomain,
        adminId: userId.toString(),
        numCoaches: 0, // Will be set in setup page
        numStudents: 0, // Will be set in setup page
        logo: '', // Will be set in setup page
        createdAt: now,
        updatedAt: now,
      })

      // Create session and redirect to setup
      const response = NextResponse.redirect(
        new URL(`/onboarding/setup?managementId=${managementId}`, request.url)
      )
      const sessionData = {
        userId: userId.toString(),
        managementId,
        email,
        role: 'admin',
      }
      console.log('Setting session for new admin:', sessionData)
      return createSessionOnResponse(response, sessionData)
    } else {
      // Management exists - check if user was pre-invited
      const preInvitedUser = await usersCollection.findOne({ 
        email: email.toLowerCase(),
        managementId: existingManagement.managementId,
        $or: [
          { googleId: '' },
          { googleId: { $exists: false } }
        ]
      })

      const now = new Date()
      let userId
      let userRole

      if (preInvitedUser) {
        // User was pre-invited - update with OAuth data and keep their assigned role
        await usersCollection.updateOne(
          { _id: preInvitedUser._id },
          {
            $set: {
              googleId,
              name: name || preInvitedUser.name || '',
              picture: picture || preInvitedUser.picture || '',
              updatedAt: now,
            }
          }
        )
        userId = preInvitedUser._id
        userRole = preInvitedUser.role || 'student'
      } else {
        // New user - add to existing management with default role
        const userResult = await usersCollection.insertOne({
          googleId,
          email,
          name: name || '',
          picture: picture || '',
          managementId: existingManagement.managementId,
          role: 'student', // Default role for new users
          emailDomain,
          createdAt: now,
          updatedAt: now,
        })
        userId = userResult.insertedId
        userRole = 'student'
      }

      // Create session and redirect to dashboard
      const response = NextResponse.redirect(new URL('/dashboard', request.url))
      const sessionData = {
        userId: userId.toString(),
        managementId: existingManagement.managementId,
        email,
        role: userRole,
      }
      console.log('Setting session for new user:', sessionData)
      return createSessionOnResponse(response, sessionData)
    }
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }
}
