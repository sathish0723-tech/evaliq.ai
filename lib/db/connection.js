import { MongoClient } from 'mongodb'

// Support both MONGODB_URI and MONGO_URL environment variables
const uri = process.env.MONGODB_URI || process.env.MONGO_URL

if (!uri) {
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'MONGODB_URI environment variable is not set in Vercel. Please add it in Settings → Environment Variables and redeploy.'
    : 'Please add your Mongo URI to .env.local as MONGODB_URI or MONGO_URL'
  console.error('❌ MongoDB Connection Error:', errorMessage)
  throw new Error(errorMessage)
}

// Ensure the connection string includes the database name
let mongoUri = uri

// Check if database name is already in the URI (pattern: /databaseName? or /databaseName)
const hasDatabaseName = mongoUri.match(/\/[^\/\?]+(\?|$)/)

// Also check if it ends with just /? or / (which means no database specified)
const endsWithSlashOnly = mongoUri.endsWith('/?') || mongoUri.match(/\/\?/) || (mongoUri.endsWith('/') && !mongoUri.includes('?'))

if (!hasDatabaseName || endsWithSlashOnly) {
  // If no database specified or just root path, add student_management
  if (mongoUri.includes('?')) {
    // Has query parameters, insert database name before ?
    mongoUri = mongoUri.replace(/\/\?/, '/student_management?').replace(/^([^?]+)\?/, '$1/student_management?')
  } else if (mongoUri.endsWith('/')) {
    // Ends with /, just append database name
    mongoUri = mongoUri + 'student_management'
  } else {
    // No query params and doesn't end with /, add /database
    mongoUri = mongoUri + '/student_management'
  }
}

// Add authSource=admin for MongoDB Atlas (required for production)
// This ensures authentication works correctly in serverless environments
if (!mongoUri.includes('authSource=')) {
  const separator = mongoUri.includes('?') ? '&' : '?'
  mongoUri = `${mongoUri}${separator}authSource=admin`
}

// Log the final connection string (without password for security)
if (process.env.NODE_ENV === 'development') {
  const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@')
  console.log('🔗 MongoDB connection string:', maskedUri)
}

// MongoDB connection options optimized for serverless (Vercel)
const options = {
  // SSL/TLS options for MongoDB Atlas
  tls: true,
  tlsAllowInvalidCertificates: false,
  // Connection pool options - optimized for serverless
  maxPoolSize: 1, // Reduced for serverless (each function gets its own connection)
  minPoolSize: 0, // Allow connections to close when idle
  // Server selection timeout
  serverSelectionTimeoutMS: 10000, // Increased for serverless cold starts
  // Socket timeout
  socketTimeoutMS: 45000,
  // Connection timeout
  connectTimeoutMS: 15000, // Increased for serverless
  // Retry options
  retryWrites: true,
  retryReads: true,
  // Serverless-friendly: don't keep connections alive too long
  maxIdleTimeMS: 30000, // Close idle connections after 30s
}

// Serverless-safe connection caching
// In Vercel, each serverless function instance can reuse the same connection
// We use a global cache that works across function invocations
const globalForMongo = globalThis

let client
let clientPromise

if (!globalForMongo._mongoClientPromise) {
  // Create a new connection promise
  globalForMongo._mongoClientPromise = (async () => {
    try {
      console.log('🔄 Connecting to MongoDB...')
      client = new MongoClient(mongoUri, options)
      await client.connect()
      console.log('✅ MongoDB connected successfully')
      return client
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message)
      // Clear the promise on error so it can be retried
      globalForMongo._mongoClientPromise = null
      throw error
    }
  })()
}

clientPromise = globalForMongo._mongoClientPromise

// Export a module-scoped MongoClient promise
// This pattern works in both development and production (serverless)
export default clientPromise
