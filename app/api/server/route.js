import { NextResponse } from 'next/server'

// Backend endpoint from environment variable
const BACK_END_ENDPOINT = process.env.BACK_END_ENDPOINT || ''

/**
 * GET /api/server
 * Get backend endpoint information
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    // Get backend endpoint configuration
    if (action === 'config' || !action) {
      return NextResponse.json({
        backend: {
          endpoint: BACK_END_ENDPOINT || 'not configured',
          configured: !!BACK_END_ENDPOINT,
        },
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      })
    }
    
    // Health check for backend endpoint
    if (action === 'health') {
      if (!BACK_END_ENDPOINT) {
        return NextResponse.json(
          {
            status: 'unhealthy',
            backend: 'not configured',
            timestamp: new Date().toISOString(),
          },
          { status: 503 }
        )
      }
      
      try {
        const response = await fetch(BACK_END_ENDPOINT, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        return NextResponse.json({
          status: response.ok ? 'healthy' : 'unhealthy',
          backend: response.ok ? 'reachable' : 'error',
          statusCode: response.status,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        return NextResponse.json(
          {
            status: 'unhealthy',
            backend: 'unreachable',
            error: error.message,
            timestamp: new Date().toISOString(),
          },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Server API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/server
 * Proxy requests to backend endpoint
 */
export async function POST(request) {
  try {
    if (!BACK_END_ENDPOINT) {
      return NextResponse.json(
        { error: 'Backend endpoint not configured. Please set BACK_END_ENDPOINT environment variable.' },
        { status: 500 }
      )
    }
    
    const body = await request.json()
    const { action, path, method = 'GET', data, headers = {} } = body
    
    // Test backend endpoint connection
    if (action === 'test-backend' || action === 'test') {
      try {
        const response = await fetch(BACK_END_ENDPOINT, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        })
        
        return NextResponse.json({
          success: response.ok,
          message: response.ok ? 'Backend endpoint is reachable' : 'Backend endpoint returned an error',
          status: response.status,
          backendEndpoint: BACK_END_ENDPOINT,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            backendEndpoint: BACK_END_ENDPOINT,
            timestamp: new Date().toISOString(),
          },
          { status: 503 }
        )
      }
    }
    
    // Proxy request to backend endpoint
    if (action === 'proxy' || action === 'backend' || !action) {
      if (!path) {
        return NextResponse.json(
          { error: 'Path is required for backend proxy request' },
          { status: 400 }
        )
      }
      
      try {
        // Build the full URL
        const backendUrl = `${BACK_END_ENDPOINT.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
        
        // Prepare fetch options
        const fetchOptions = {
          method: method.toUpperCase(),
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
        
        // Add request body for POST, PUT, PATCH, DELETE
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && data) {
          fetchOptions.body = JSON.stringify(data)
        }
        
        // Forward the request to backend
        const response = await fetch(backendUrl, fetchOptions)
        let responseData
        try {
          responseData = await response.json()
        } catch {
          const text = await response.text()
          responseData = { message: text }
        }
        
        return NextResponse.json({
          success: response.ok,
          data: responseData,
          status: response.status,
          backendUrl,
          timestamp: new Date().toISOString(),
        }, { status: response.status })
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Server POST API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
