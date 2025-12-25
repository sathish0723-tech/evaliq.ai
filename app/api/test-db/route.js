import { NextResponse } from 'next/server'
import clientPromise from '@/lib/db/connection'

/**
 * GET /api/test-db
 * Test MongoDB connection (for debugging)
 * Remove this endpoint in production for security
 */
export async function GET() {
  try {
    // Check if MONGODB_URI is set
    const hasEnv = !!(process.env.MONGODB_URI || process.env.MONGO_URL)
    
    if (!hasEnv) {
      return NextResponse.json({
        success: false,
        error: 'MONGODB_URI environment variable is not set',
        message: 'Please add MONGODB_URI in Vercel Settings → Environment Variables',
        hasEnv: false,
      }, { status: 500 })
    }

    // Test connection
    const client = await clientPromise
    const db = client.db()
    
    // Ping the database
    await db.admin().ping()
    
    // Get database name
    const dbName = db.databaseName
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      database: dbName,
      hasEnv: true,
      nodeEnv: process.env.NODE_ENV,
    })
  } catch (error) {
    console.error('MongoDB test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      hasEnv: !!(process.env.MONGODB_URI || process.env.MONGO_URL),
      nodeEnv: process.env.NODE_ENV,
      message: 'Check Vercel logs for detailed error information',
    }, { status: 500 })
  }
}

