import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { getUsersCollection, getManagementCollection, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { extractEmailDomain, generateManagementId } from '@/lib/utils-management'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Initialize collections
        await initializeCollections(DB_NAME)
        
        const usersCollection = await getUsersCollection(DB_NAME)
        const managementCollection = await getManagementCollection(DB_NAME)

        const email = user.email?.toLowerCase()
        if (!email) {
          console.error('No email provided by Google')
          return false
        }

        const emailDomain = extractEmailDomain(email)
        if (!emailDomain) {
          console.error('Invalid email address')
          return false
        }

        const googleId = account.providerAccountId || profile.sub

        // Check if user already exists
        let existingUser = await usersCollection.findOne({ email })

        if (existingUser) {
          // Update user with OAuth data if missing
          const updateData = {
            updatedAt: new Date(),
          }
          
          if (!existingUser.googleId) {
            updateData.googleId = googleId
            updateData.name = user.name || existingUser.name || ''
            updateData.picture = user.image || existingUser.picture || ''
          }
          
          await usersCollection.updateOne(
            { _id: existingUser._id },
            { $set: updateData }
          )
          
          return true
        }

        // New user - check if management exists for this domain
        const existingManagement = await managementCollection.findOne({ emailDomain })

        if (!existingManagement) {
          // First user from this domain - create management and make user admin
          const managementId = await generateManagementId()
          
          const now = new Date()
          
          // Create user first
          const userResult = await usersCollection.insertOne({
            googleId,
            email,
            name: user.name || '',
            picture: user.image || '',
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

          // Store managementId in user object for redirect
          user.managementId = managementId
          user.isNewAdmin = true
          
          return true
        } else {
          // Management exists - check if user was pre-invited
          const preInvitedUser = await usersCollection.findOne({ 
            email,
            managementId: existingManagement.managementId,
            $or: [
              { googleId: '' },
              { googleId: { $exists: false } }
            ]
          })

          const now = new Date()

          if (preInvitedUser) {
            // User was pre-invited - update with OAuth data and keep their assigned role
            await usersCollection.updateOne(
              { _id: preInvitedUser._id },
              {
                $set: {
                  googleId,
                  name: user.name || preInvitedUser.name || '',
                  picture: user.image || preInvitedUser.picture || '',
                  updatedAt: now,
                }
              }
            )
            user.role = preInvitedUser.role || 'student'
          } else {
            // New user - add to existing management with default role
            const userResult = await usersCollection.insertOne({
              googleId,
              email,
              name: user.name || '',
              picture: user.image || '',
              managementId: existingManagement.managementId,
              role: 'student', // Default role for new users
              emailDomain,
              createdAt: now,
              updatedAt: now,
            })
            user.role = 'student'
          }

          user.managementId = existingManagement.managementId
          return true
        }
      } catch (error) {
        console.error('Error in signIn callback:', error)
        return false
      }
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.email = user.email
        token.role = user.role
        token.managementId = user.managementId
        token.isNewAdmin = user.isNewAdmin
        
        // Fetch user from DB to get the actual userId and check if setup is needed
        try {
          await initializeCollections(DB_NAME)
          const usersCollection = await getUsersCollection(DB_NAME)
          const managementCollection = await getManagementCollection(DB_NAME)
          const dbUser = await usersCollection.findOne({ email: user.email?.toLowerCase() })
          if (dbUser) {
            token.userId = dbUser._id.toString()
            token.role = dbUser.role
            token.managementId = dbUser.managementId
            
            // Check if this is a new admin that needs setup
            if (dbUser.role === 'admin' && dbUser.managementId) {
              const management = await managementCollection.findOne({ managementId: dbUser.managementId })
              if (management && !management.name) {
                token.needsSetup = true
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user in JWT callback:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.userId
        session.user.role = token.role
        session.user.managementId = token.managementId
        session.needsSetup = token.needsSetup
      }
      
      return session
    },
    async redirect({ url, baseUrl }) {
      // Handle redirect after sign in
      // Default redirect to dashboard
      if (url.includes('callbackUrl') || url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`
      }
      
      // Allow relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: '/onboarding',
    error: '/onboarding',
  },
}

