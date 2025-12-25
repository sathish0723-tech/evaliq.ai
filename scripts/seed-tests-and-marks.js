/**
 * Script to seed 5 tests and marks for a class and subject
 * Usage: node scripts/seed-tests-and-marks.js [classId] [subjectId]
 * If classId and subjectId are not provided, it will use the first available class and subject
 */

const { MongoClient, ObjectId } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://clashseven02_db_user:NThuq1VYGB5jM5rv@cluster0.opegv1r.mongodb.net/student_management?retryWrites=true&w=majority'
const DB_NAME = 'student_management'

// Test names
const testNames = [
  'Monthly - Assessment',
  'Problem - Solving',
  'Unit Test - 1',
  'Mid-term Exam',
  'Final Assessment'
]

/**
 * Generate unique test ID
 */
async function generateTestId(testsCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let testId
  let isUnique = false

  while (!isUnique) {
    testId = 'TEST_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    
    const existing = await testsCollection.findOne({
      testId,
      managementId,
    })
    
    if (!existing) {
      isUnique = true
    }
  }
  
  return testId
}

/**
 * Get date string for a date offset (days from today)
 */
function getDateString(daysOffset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Generate random marks between min and max
 */
function generateRandomMarks(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Main function to seed tests and marks
 */
async function seedTestsAndMarks() {
  let client
  
  try {
    console.log('Connecting to MongoDB...')
    client = new MongoClient(MONGODB_URI, {
      tls: true,
      retryWrites: true,
    })
    
    await client.connect()
    console.log('Connected to MongoDB')
    
    const db = client.db(DB_NAME)
    const testsCollection = db.collection('tests')
    const marksCollection = db.collection('marks')
    const studentsCollection = db.collection('students')
    const classesCollection = db.collection('classes')
    const subjectsCollection = db.collection('subjects')
    const managementCollection = db.collection('management')
    
    // Drop old index if it exists (studentId_1_subjectId_1_managementId_1)
    try {
      await marksCollection.dropIndex('studentId_1_subjectId_1_managementId_1')
      console.log('Dropped old index: studentId_1_subjectId_1_managementId_1')
    } catch (error) {
      // Index doesn't exist, which is fine
      if (error.code !== 27) { // 27 is index not found
        console.log('Note: Could not drop old index (may not exist)')
      }
    }
    
    // Get the first management
    const management = await managementCollection.findOne({})
    
    if (!management) {
      console.error('No management found in database. Please create a management first.')
      process.exit(1)
    }
    
    const managementId = management.managementId
    console.log(`Using management: ${managementId}`)
    
    // Get classId and subjectId from command line arguments or use first available
    const classId = process.argv[2]
    const subjectId = process.argv[3]
    
    let classData, subjectData
    
    if (classId && subjectId) {
      classData = await classesCollection.findOne({ classId, managementId })
      subjectData = await subjectsCollection.findOne({ subjectId, managementId })
      
      if (!classData) {
        console.error(`Class with ID ${classId} not found`)
        process.exit(1)
      }
      if (!subjectData) {
        console.error(`Subject with ID ${subjectId} not found`)
        process.exit(1)
      }
    } else {
      // Get first available class and subject
      classData = await classesCollection.findOne({ managementId })
      subjectData = await subjectsCollection.findOne({ managementId })
      
      if (!classData) {
        console.error('No classes found. Please create a class first.')
        process.exit(1)
      }
      if (!subjectData) {
        console.error('No subjects found. Please create a subject first.')
        process.exit(1)
      }
    }
    
    console.log(`\nUsing class: ${classData.name} (${classData.classId})`)
    console.log(`Using subject: ${subjectData.name} (${subjectData.subjectId})`)
    
    // Get all students for this class
    const students = await studentsCollection.find({
      classId: classData.classId,
      managementId,
    }).toArray()
    
    if (students.length === 0) {
      console.error(`No students found in class ${classData.name}. Please add students first.`)
      process.exit(1)
    }
    
    console.log(`Found ${students.length} students in this class\n`)
    
    // Create 5 tests
    const createdTests = []
    const now = new Date()
    
    console.log('Creating 5 tests...')
    for (let i = 0; i < 5; i++) {
      const testName = testNames[i]
      const testId = await generateTestId(testsCollection, managementId)
      // Dates spread over the last 30 days
      const date = getDateString(-30 + (i * 7))
      const time = `${String(Math.floor(Math.random() * 12) + 9).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
      
      const test = {
        testId,
        name: testName,
        date,
        time,
        classId: classData.classId,
        subjectId: subjectData.subjectId,
        coachId: classData.coachId || '',
        coachName: classData.coachName || '',
        managementId,
        createdAt: now,
        updatedAt: now,
      }
      
      await testsCollection.insertOne(test)
      createdTests.push(test)
      console.log(`  ✓ Created test: ${testName} (${testId}) - ${date}`)
    }
    
    console.log(`\n✅ Successfully created ${createdTests.length} tests!`)
    
    // Create marks for each test
    console.log('\nCreating marks for each test...')
    
    for (const test of createdTests) {
      console.log(`\nCreating marks for: ${test.name}`)
      
      // Generate marks for each student
      const studentsMarks = {}
      const maxMarks = 100 // Default max marks
      
      students.forEach(student => {
        // Generate random marks between 0 and maxMarks
        const marks = generateRandomMarks(0, maxMarks)
        studentsMarks[student._id.toString()] = {
          marks,
          maxMarks,
        }
      })
      
      // Delete any existing marks for this test first (in case of re-running)
      await marksCollection.deleteMany({
        testId: test.testId,
        managementId,
      })
      
      // Create marks record (one document per test)
      await marksCollection.insertOne({
        testId: test.testId,
        classId: test.classId,
        subjectId: test.subjectId,
        students: studentsMarks,
        managementId,
        createdAt: now,
        updatedAt: now,
      })
      
      console.log(`  ✓ Created marks for ${students.length} students`)
    }
    
    console.log(`\n✅ Successfully created marks for all ${createdTests.length} tests!`)
    
    // Display summary
    console.log('\n📊 Summary:')
    console.log(`  Class: ${classData.name}`)
    console.log(`  Subject: ${subjectData.name}`)
    console.log(`  Tests created: ${createdTests.length}`)
    console.log(`  Students with marks: ${students.length} per test`)
    console.log(`  Total marks records: ${createdTests.length}`)
    
    console.log('\n📝 Created Tests:')
    createdTests.forEach((test, idx) => {
      console.log(`  ${idx + 1}. ${test.name} - ${test.date} (${test.testId})`)
    })
    
  } catch (error) {
    console.error('Error seeding tests and marks:', error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('\nDatabase connection closed')
    }
  }
}

// Run the script
seedTestsAndMarks()

