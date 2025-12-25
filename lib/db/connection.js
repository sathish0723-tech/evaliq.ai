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
// This regex looks for: / followed by non-slash, non-? characters, then ? or end of string
const hasDatabaseName = mongoUri.match(/\/[^\/\?]+(\?|$)/)

// Also check if it ends with just /? or / (which means no database specified)
const endsWithSlashOnly = mongoUri.endsWith('/?') || mongoUri.match(/\/\?/) || (mongoUri.endsWith('/') && !mongoUri.includes('?'))

if (!hasDatabaseName || endsWithSlashOnly) {
  // If no database specified or just root path, add student_management
  if (mongoUri.includes('?')) {
    // Has query parameters, insert database name before ?
    // Replace /? with /student_management? or ? with /student_management?
    mongoUri = mongoUri.replace(/\/\?/, '/student_management?').replace(/^([^?]+)\?/, '$1/student_management?')
  } else if (mongoUri.endsWith('/')) {
    // Ends with /, just append database name
    mongoUri = mongoUri + 'student_management'
  } else {
    // No query params and doesn't end with /, add /database
    mongoUri = mongoUri + '/student_management'
  }
}

// Log the final connection string (without password for security)
if (process.env.NODE_ENV === 'development') {
  const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@')
  console.log('MongoDB connection string:', maskedUri)
}

// MongoDB connection options
const options = {
  // SSL/TLS options for MongoDB Atlas
  tls: true,
  tlsAllowInvalidCertificates: false,
  // Connection pool options
  maxPoolSize: 10,
  minPoolSize: 1,
  // Server selection timeout
  serverSelectionTimeoutMS: 5000,
  // Socket timeout
  socketTimeoutMS: 45000,
  // Connection timeout
  connectTimeoutMS: 10000,
  // Retry options
  retryWrites: true,
  retryReads: true,
}

let client
let clientPromise
let connectionAttempts = 0
const MAX_RETRY_ATTEMPTS = 3
let lastConnectionError = null
let lastConnectionAttempt = 0
const RETRY_DELAY_MS = 5000 // Wait 5 seconds between retry attempts

// Helper function to create connection with retry logic
async function createConnection() {
  const now = Date.now()
  
  // If we recently failed and haven't waited long enough, throw the cached error
  if (lastConnectionError && (now - lastConnectionAttempt) < RETRY_DELAY_MS) {
    throw lastConnectionError
  }
  
  // Reset if enough time has passed
  if (lastConnectionError && (now - lastConnectionAttempt) >= RETRY_DELAY_MS) {
    connectionAttempts = 0
    lastConnectionError = null
  }
  
  if (connectionAttempts >= MAX_RETRY_ATTEMPTS) {
    const error = new Error('MongoDB connection failed after multiple attempts. Please check your network connection and MongoDB Atlas cluster status.')
    lastConnectionError = error
    lastConnectionAttempt = now
    throw error
  }
  
  connectionAttempts++
  lastConnectionAttempt = now
  
  try {
    client = new MongoClient(mongoUri, options)
    await client.connect()
    // Reset on success
    connectionAttempts = 0
    lastConnectionError = null
    return client
  } catch (error) {
    console.error(`MongoDB connection error (attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS}):`, error.message)
    lastConnectionError = error
    throw error
  }
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = createConnection().catch((error) => {
      // Reset the promise so it can be retried after delay
      globalWithMongo._mongoClientPromise = null
      throw error
    })
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = createConnection().catch((error) => {
    throw error
  })
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise

