import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'auth_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/**
 * Create a session cookie with user data on a NextResponse object
 * @param {NextResponse} response - Next.js response object
 * @param {Object} sessionData - Session data to store
 * @param {string} sessionData.userId - User ID
 * @param {string} sessionData.managementId - Management ID
 * @param {string} sessionData.email - User email
 * @param {string} sessionData.role - User role (admin/user)
 */
export function createSessionOnResponse(response, sessionData) {
  response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return response
}

/**
 * Get current session data
 * @param {Request} request - Optional request object to read cookies from headers
 * @returns {Object|null} - Session data or null if not authenticated
 */
export async function getSession(request = null) {
  try {
    const cookieStore = await cookies()
    let sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    
    // Fallback: Try to read from request headers if cookie not found
    if (!sessionCookie && request) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          if (key === SESSION_COOKIE_NAME) {
            acc[key] = decodeURIComponent(value)
          }
          return acc
        }, {})
        
        if (cookies[SESSION_COOKIE_NAME]) {
          sessionCookie = { value: cookies[SESSION_COOKIE_NAME] }
        }
      }
    }
    
    if (!sessionCookie) {
      return null
    }

    try {
      const sessionData = JSON.parse(sessionCookie.value)
      return sessionData
    } catch (error) {
      console.error('Error parsing session cookie:', error)
      return null
    }
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * Delete session cookie
 */
export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export async function isAuthenticated() {
  const session = await getSession()
  return session !== null
}

