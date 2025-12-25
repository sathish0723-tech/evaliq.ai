import clientPromise from './connection'

// Database name
export const DB_NAME = 'student_management'

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  MANAGEMENT: 'management',
  STUDENTS: 'students',
  ATTENDANCE: 'attendance',
  CLASSES: 'classes',
  COACHES: 'coaches',
  SUBJECTS: 'subjects',
  MARKS: 'marks',
  TESTS: 'tests',
  BATCHES: 'batches',
  CONVERSATIONS: 'conversations',
  ACTIVITIES: 'activities',
  MEMORIES: 'memories',
  SQUADS: 'squads',
  MARKSHEET_TEMPLATES: 'marksheet_templates',
  GENERATED_MARKSHEETS: 'generated_marksheets',
  ASSESSMENTS: 'assessments',
  NOTES: 'notes',
  QUESTIONS: 'questions',
  TEST_COMPLETED: 'test_completed',
  DATA_FIELD_KEYS: 'data_field_keys',
}

// Cache connection state to avoid unnecessary pings
let connectionState = {
  isConnected: false,
  lastPing: 0,
  pingInterval: 30000 // Ping every 30 seconds max
}

/**
 * Get database instance
 * @param {string} dbName - Database name (default: student_management)
 * @returns {Promise<Db>} Database instance
 */
export async function getDb(dbName = DB_NAME) {
  try {
    const client = await clientPromise
    const now = Date.now()
    
    // Only ping if we haven't pinged recently or if we're not sure about connection state
    // This reduces unnecessary network calls
    if (!connectionState.isConnected || (now - connectionState.lastPing) > connectionState.pingInterval) {
      try {
        await client.db('admin').command({ ping: 1 })
        connectionState.isConnected = true
        connectionState.lastPing = now
      } catch (pingError) {
        connectionState.isConnected = false
        connectionState.lastPing = now
        throw pingError
      }
    }
    
    return client.db(dbName)
  } catch (error) {
    connectionState.isConnected = false
    console.error('MongoDB connection error in getDb:', error)
    throw new Error(`Failed to connect to MongoDB: ${error.message}`)
  }
}

/**
 * Get Users collection
 * @param {string} dbName - Database name (default: student_management)
 * @returns {Promise<Collection>} Users collection
 */
export async function getUsersCollection(dbName = DB_NAME) {
  const db = await getDb(dbName)
  return db.collection(COLLECTIONS.USERS)
}

/**
 * Get Management collection
 * @param {string} dbName - Database name (default: student_management)
 * @returns {Promise<Collection>} Management collection
 */
export async function getManagementCollection(dbName = DB_NAME) {
  const db = await getDb(dbName)
  return db.collection(COLLECTIONS.MANAGEMENT)
}

/**
 * Get Students collection
 * @param {string} dbName - Database name (default: student_management)
 * @returns {Promise<Collection>} Students collection
 */
export async function getStudentsCollection(dbName = DB_NAME) {
  const db = await getDb(dbName)
  return db.collection(COLLECTIONS.STUDENTS)
}

/**
 * Get Attendance collection
 * @param {string} dbName - Database name (default: student_management)
 * @returns {Promise<Collection>} Attendance collection
 */
export async function getAttendanceCollection(dbName = DB_NAME) {
  const db = await getDb(dbName)
  return db.collection(COLLECTIONS.ATTENDANCE)
}

/**
 * Get Conversations collection
 * @param {string} dbName - Database name (default: student_management)
 * @returns {Promise<Collection>} Conversations collection
 */
export async function getConversationsCollection(dbName = DB_NAME) {
  const db = await getDb(dbName)
  return db.collection(COLLECTIONS.CONVERSATIONS)
}

/**
 * Get Squads collection
 * @param {string} dbName - Database name (default: student_management)
 * @returns {Promise<Collection>} Squads collection
 */
export async function getSquadsCollection(dbName = DB_NAME) {
  const db = await getDb(dbName)
  return db.collection(COLLECTIONS.SQUADS)
}

// Cache initialization state to avoid re-initializing on every request
let initializationCache = new Map()

/**
 * Initialize collections with indexes
 * @param {string} dbName - Database name (default: student_management)
 */
export async function initializeCollections(dbName = DB_NAME) {
  // Check if we've already initialized recently (within last 5 minutes)
  const cacheKey = dbName
  const cached = initializationCache.get(cacheKey)
  const now = Date.now()
  
  // Skip re-initialization if done recently (indexes don't need to be recreated constantly)
  if (cached && (now - cached) < 300000) { // 5 minutes
    // Still get DB to ensure connection is valid, but skip index creation
    await getDb(dbName)
    return
  }
  
  const db = await getDb(dbName)
  
  // Initialize Users collection
  const usersCollection = db.collection(COLLECTIONS.USERS)
  await usersCollection.createIndex({ email: 1 }, { unique: true })
  await usersCollection.createIndex({ googleId: 1 }, { unique: true })
  await usersCollection.createIndex({ managementId: 1 })
  await usersCollection.createIndex({ emailDomain: 1 })
  
  // Initialize Management collection
  const managementCollection = db.collection(COLLECTIONS.MANAGEMENT)
  await managementCollection.createIndex({ managementId: 1 }, { unique: true })
  await managementCollection.createIndex({ emailDomain: 1 }, { unique: true })
  await managementCollection.createIndex({ adminId: 1 })
  
  // Initialize Students collection
  const studentsCollection = db.collection(COLLECTIONS.STUDENTS)
  await studentsCollection.createIndex({ email: 1, managementId: 1 }, { unique: true })
  await studentsCollection.createIndex({ managementId: 1 })
  await studentsCollection.createIndex({ batch: 1, managementId: 1 })
  await studentsCollection.createIndex({ batch: 1 })
  
  // Initialize Attendance collection
  const attendanceCollection = db.collection(COLLECTIONS.ATTENDANCE)
  await attendanceCollection.createIndex({ classId: 1, date: 1, managementId: 1 }, { unique: true })
  await attendanceCollection.createIndex({ managementId: 1 })
  await attendanceCollection.createIndex({ date: 1 })
  await attendanceCollection.createIndex({ classId: 1 })
  await attendanceCollection.createIndex({ batch: 1, managementId: 1 })
  await attendanceCollection.createIndex({ batch: 1 })
  
  // Initialize Classes collection
  const classesCollection = db.collection(COLLECTIONS.CLASSES)
  await classesCollection.createIndex({ classId: 1, managementId: 1 }, { unique: true })
  await classesCollection.createIndex({ managementId: 1 })
  await classesCollection.createIndex({ coachId: 1 })
  await classesCollection.createIndex({ batch: 1, managementId: 1 })
  await classesCollection.createIndex({ batch: 1 })
  
  // Initialize Coaches collection
  const coachesCollection = db.collection(COLLECTIONS.COACHES)
  await coachesCollection.createIndex({ email: 1, managementId: 1 }, { unique: true })
  await coachesCollection.createIndex({ coachId: 1, managementId: 1 }, { unique: true })
  await coachesCollection.createIndex({ managementId: 1 })
  await coachesCollection.createIndex({ batch: 1, managementId: 1 })
  await coachesCollection.createIndex({ batch: 1 })
  
  // Update Students collection indexes to include classId
  await studentsCollection.createIndex({ classId: 1 })
  await studentsCollection.createIndex({ studentId: 1, managementId: 1 }, { unique: true })
  
  // Initialize Subjects collection
  const subjectsCollection = db.collection(COLLECTIONS.SUBJECTS)
  await subjectsCollection.createIndex({ subjectId: 1, managementId: 1 }, { unique: true })
  await subjectsCollection.createIndex({ managementId: 1 })
  await subjectsCollection.createIndex({ classId: 1 })
  await subjectsCollection.createIndex({ batch: 1, managementId: 1 })
  await subjectsCollection.createIndex({ batch: 1 })
  
  // Initialize Marks collection
  const marksCollection = db.collection(COLLECTIONS.MARKS)
  await marksCollection.createIndex({ testId: 1, managementId: 1 }, { unique: true })
  await marksCollection.createIndex({ managementId: 1 })
  await marksCollection.createIndex({ classId: 1 })
  await marksCollection.createIndex({ subjectId: 1 })
  await marksCollection.createIndex({ testId: 1 })
  await marksCollection.createIndex({ batch: 1, managementId: 1 })
  await marksCollection.createIndex({ batch: 1 })
  
  // Initialize Tests collection
  const testsCollection = db.collection(COLLECTIONS.TESTS)
  await testsCollection.createIndex({ testId: 1, managementId: 1 }, { unique: true })
  await testsCollection.createIndex({ managementId: 1 })
  await testsCollection.createIndex({ classId: 1 })
  await testsCollection.createIndex({ subjectId: 1 })
  await testsCollection.createIndex({ date: 1 })
  await testsCollection.createIndex({ batch: 1, managementId: 1 })
  await testsCollection.createIndex({ batch: 1 })
  
  // Initialize Batches collection
  const batchesCollection = db.collection(COLLECTIONS.BATCHES)
  await batchesCollection.createIndex({ batchName: 1, managementId: 1 }, { unique: true })
  await batchesCollection.createIndex({ managementId: 1 })
  
  // Initialize Conversations collection
  const conversationsCollection = db.collection(COLLECTIONS.CONVERSATIONS)
  await conversationsCollection.createIndex({ chatId: 1 }, { unique: true })
  await conversationsCollection.createIndex({ userId: 1 })
  await conversationsCollection.createIndex({ managementId: 1 })
  await conversationsCollection.createIndex({ createdAt: -1 })
  
  // Initialize Memories collection
  const memoriesCollection = db.collection(COLLECTIONS.MEMORIES)
  await memoriesCollection.createIndex({ memoryId: 1, managementId: 1 }, { unique: true })
  await memoriesCollection.createIndex({ managementId: 1 })
  await memoriesCollection.createIndex({ batch: 1, managementId: 1 })
  await memoriesCollection.createIndex({ batch: 1 })
  await memoriesCollection.createIndex({ date: -1 })
  await memoriesCollection.createIndex({ createdAt: -1 })
  
  // Initialize Squads collection
  const squadsCollection = db.collection(COLLECTIONS.SQUADS)
  await squadsCollection.createIndex({ squadId: 1, managementId: 1 }, { unique: true })
  await squadsCollection.createIndex({ managementId: 1 })
  await squadsCollection.createIndex({ classId: 1 })
  await squadsCollection.createIndex({ batch: 1, managementId: 1 })
  await squadsCollection.createIndex({ batch: 1 })
  await squadsCollection.createIndex({ createdAt: -1 })
  
  // Initialize Assessments collection
  const assessmentsCollection = db.collection(COLLECTIONS.ASSESSMENTS)
  await assessmentsCollection.createIndex({ assessmentId: 1, managementId: 1 }, { unique: true })
  await assessmentsCollection.createIndex({ managementId: 1 })
  await assessmentsCollection.createIndex({ classId: 1, managementId: 1 })
  await assessmentsCollection.createIndex({ section: 1, classId: 1, managementId: 1 })
  await assessmentsCollection.createIndex({ createdAt: -1 })
  
  // Initialize Notes collection
  const notesCollection = db.collection(COLLECTIONS.NOTES)
  await notesCollection.createIndex({ noteId: 1, managementId: 1 }, { unique: true })
  await notesCollection.createIndex({ managementId: 1 })
  await notesCollection.createIndex({ userId: 1, managementId: 1 })
  await notesCollection.createIndex({ createdAt: -1 })
  await notesCollection.createIndex({ updatedAt: -1 })
  
  // Initialize Questions collection
  const questionsCollection = db.collection(COLLECTIONS.QUESTIONS)
  await questionsCollection.createIndex({ questionId: 1, managementId: 1 }, { unique: true })
  await questionsCollection.createIndex({ managementId: 1 })
  await questionsCollection.createIndex({ testId: 1, managementId: 1 })
  await questionsCollection.createIndex({ classId: 1, managementId: 1 })
  await questionsCollection.createIndex({ createdAt: -1 })
  await questionsCollection.createIndex({ updatedAt: -1 })
  
  // Initialize Test Completed collection
  const testCompletedCollection = db.collection(COLLECTIONS.TEST_COMPLETED)
  await testCompletedCollection.createIndex({ completedId: 1, managementId: 1 }, { unique: true })
  await testCompletedCollection.createIndex({ managementId: 1 })
  await testCompletedCollection.createIndex({ testId: 1, managementId: 1 })
  await testCompletedCollection.createIndex({ classId: 1, managementId: 1 })
  await testCompletedCollection.createIndex({ studentId: 1, managementId: 1 })
  await testCompletedCollection.createIndex({ testId: 1, studentId: 1, managementId: 1 }, { unique: true })
  await testCompletedCollection.createIndex({ createdAt: -1 })
  await testCompletedCollection.createIndex({ updatedAt: -1 })
  
  // Initialize Data Field Keys collection
  const dataFieldKeysCollection = db.collection(COLLECTIONS.DATA_FIELD_KEYS)
  await dataFieldKeysCollection.createIndex({ placeholderKey: 1, managementId: 1 }, { unique: true })
  await dataFieldKeysCollection.createIndex({ managementId: 1 })
  await dataFieldKeysCollection.createIndex({ createdAt: -1 })
  await dataFieldKeysCollection.createIndex({ updatedAt: -1 })
  
  // Cache the initialization time
  initializationCache.set(cacheKey, now)
  console.log(`Collections initialized for database: ${dbName}`)
}

