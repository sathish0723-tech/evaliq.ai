/**
 * Comprehensive Script to seed Test-batch with complete data structure
 * Creates: 5 sections, 5 coaches, 5 tests with specific subjects, 30 students per section (150 total),
 * 30 days of attendance per student, and marks for all students
 * 
 * Requirements:
 * - Batch: Test-batch
 * - 5 coaches with unique names, emails, and phone numbers
 * - 5 sections (one coach per section)
 * - 30 students per section (150 total) with:
 *   - Student name, email, village name, parent name, student phone, parent phone
 * - 30 days of attendance per student
 * - 5 tests with subjects: Tech, Problem Solving, English, Life Skills, Monthly Assessment
 * - Marks for each subject for every student
 * 
 * Usage: node scripts/seed-test-batch.js [--dry-run]
 * --dry-run: Show what would be created without connecting to database
 */

const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs')
const path = require('path')

// Load environment variables from both .env and .env.local
// Load .env first (lower priority)
if (fs.existsSync(path.join(process.cwd(), '.env'))) {
  require('dotenv').config({ path: '.env' })
}
// Load .env.local (higher priority, will override .env)
if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
  require('dotenv').config({ path: '.env.local', override: true })
}

// Support both MONGODB_URI and MONGO_URL environment variables (same as lib/db/connection.js)
// Also check for common variations
let mongoUri = process.env.MONGODB_URI || 
               process.env.MONGO_URL || 
               process.env.MONGODB_URL ||
               process.env.DATABASE_URL ||
               process.env.DB_URI

// If still not found, try to read directly from .env file (lines 8-9 as user mentioned)
if (!mongoUri) {
  try {
    const envPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const lines = envContent.split('\n')
      // Check lines 8-9 (0-indexed: 7-8)
      for (let i = 7; i <= 8 && i < lines.length; i++) {
        const line = lines[i].trim()
        if (line && !line.startsWith('#')) {
          const match = line.match(/^[^=]+=(.+)$/)
          if (match) {
            mongoUri = match[1].trim().replace(/^["']|["']$/g, '') // Remove quotes
            if (mongoUri) break
          }
        }
      }
    }
  } catch (err) {
    // Ignore errors reading .env file
  }
}

// Also check command line argument
if (!mongoUri && process.argv.includes('--mongo-uri')) {
  const uriIndex = process.argv.indexOf('--mongo-uri')
  if (uriIndex + 1 < process.argv.length) {
    mongoUri = process.argv[uriIndex + 1]
  }
}

if (!mongoUri) {
  console.error('\n❌ MongoDB URI not found!')
  console.error('\nOptions:')
  console.error('  1. Add MONGODB_URI or MONGO_URL to .env or .env.local file')
  console.error('  2. Pass it as command line argument: node scripts/seed-test-batch.js --mongo-uri "your_connection_string"')
  console.error('\nExample:')
  console.error('  node scripts/seed-test-batch.js --mongo-uri "mongodb+srv://user:pass@cluster.mongodb.net/dbname"\n')
  throw new Error('Please provide MongoDB URI')
}

// Ensure the connection string includes the database name (same logic as lib/db/connection.js)
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

const MONGODB_URI = mongoUri

const DB_NAME = 'student_management'

// Check for dry run mode
const isDryRun = process.argv.includes('--dry-run')

// Batch name
const BATCH_NAME = 'Test-batch'

// Section (class) data - 5 sections
const sections = [
  { name: 'Section A', description: 'Advanced Mathematics Section' },
  { name: 'Section B', description: 'Science and Technology Section' },
  { name: 'Section C', description: 'Literature and Arts Section' },
  { name: 'Section D', description: 'Commerce and Business Section' },
  { name: 'Section E', description: 'Computer Science and IT Section' },
]

// Coach data - 5 unique coaches
const coachesData = [
  { name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar.test@school.edu', phone: '+91-9876543201' },
  { name: 'Ms. Priya Sharma', email: 'priya.sharma.test@school.edu', phone: '+91-9876543202' },
  { name: 'Mr. Amit Singh', email: 'amit.singh.test@school.edu', phone: '+91-9876543203' },
  { name: 'Dr. Sunita Verma', email: 'sunita.verma.test@school.edu', phone: '+91-9876543204' },
  { name: 'Mr. Vikram Patel', email: 'vikram.patel.test@school.edu', phone: '+91-9876543205' },
]

// Test subjects - exactly 5 as specified
const testSubjects = [
  'Tech',
  'Problem Solving',
  'English',
  'Life Skills',
  'Monthly Assessment'
]

// Student name data
const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharv', 'Advik', 'Arnav', 'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Pari', 'Anika',
  'Navya', 'Aaradhya', 'Sara', 'Aarya', 'Riya', 'Avni', 'Myra', 'Aashvi', 'Kiara', 'Eva',
  'Zara', 'Amaira', 'Prisha', 'Shanaya', 'Anvi', 'Aarohi', 'Anya', 'Pihu', 'Amaaya', 'Isha',
  'Aadhira', 'Aarushi', 'Meera', 'Aashi', 'Tanya', 'Anvesha', 'Devanshi', 'Ridhi', 'Aastha', 'Palak'
]

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Jain', 'Patel', 'Agarwal', 'Rao', 'Nair',
  'Reddy', 'Chopra', 'Khanna', 'Malhotra', 'Mehta', 'Shah', 'Joshi', 'Kapoor', 'Bansal', 'Saxena',
  'Trivedi', 'Pandey', 'Mishra', 'Chauhan', 'Yadav', 'Garg', 'Srivastava', 'Jha', 'Tiwari', 'Dubey'
]

// Parent name prefixes
const parentPrefixes = ['Mr.', 'Mrs.', 'Ms.', 'Dr.']

// Village names for Indian villages
const villageNames = [
  'Rampur', 'Sitapur', 'Meerut', 'Ghaziabad', 'Noida', 'Faridabad', 'Gurugram', 'Rohtak',
  'Hisar', 'Panipat', 'Sonipat', 'Karnal', 'Ambala', 'Panchkula', 'Chandigarh', 'Shimla',
  'Mandi', 'Solan', 'Nahan', 'Bilaspur', 'Hamirpur', 'Kangra', 'Pathankot', 'Jalandhar',
  'Amritsar', 'Ludhiana', 'Patiala', 'Bathinda', 'Sangrur', 'Ferozepur', 'Moga', 'Barnala',
  'Alwar', 'Bharatpur', 'Dholpur', 'Karauli', 'Sawai Madhopur', 'Tonk', 'Bundi', 'Kota'
]

/**
 * Generate unique class ID
 */
async function generateClassId(classesCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let classId
  let isUnique = false

  while (!isUnique) {
    classId = 'CLS_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')

    const existing = await classesCollection.findOne({
      classId,
      managementId,
    })

    if (!existing) {
      isUnique = true
    }
  }

  return classId
}

/**
 * Generate unique coach ID
 */
async function generateCoachId(coachesCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let coachId
  let isUnique = false

  while (!isUnique) {
    coachId = 'COA_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')

    const existing = await coachesCollection.findOne({
      coachId,
      managementId,
    })

    if (!existing) {
      isUnique = true
    }
  }

  return coachId
}

/**
 * Generate unique subject ID
 */
async function generateSubjectId(subjectsCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let subjectId
  let isUnique = false

  while (!isUnique) {
    subjectId = 'SUB_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')

    const existing = await subjectsCollection.findOne({
      subjectId,
      managementId,
    })

    if (!existing) {
      isUnique = true
    }
  }

  return subjectId
}

/**
 * Generate unique student ID
 */
async function generateStudentId(studentsCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let studentId
  let isUnique = false

  while (!isUnique) {
    studentId = 'STU_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')

    const existing = await studentsCollection.findOne({
      studentId,
      managementId,
    })

    if (!existing) {
      isUnique = true
    }
  }

  return studentId
}

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
 * Generate random phone number
 */
function generatePhoneNumber() {
  const areaCode = Math.floor(Math.random() * 900) + 100
  const exchange = Math.floor(Math.random() * 900) + 100
  const number = Math.floor(Math.random() * 9000) + 1000
  return `+91-${areaCode}${exchange}${number}`
}

/**
 * Generate student data with all required fields
 */
function generateStudentData(index) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  const name = `${firstName} ${lastName}`
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@student.testbatch.edu`
  const studentPhone = generatePhoneNumber()
  const village = villageNames[Math.floor(Math.random() * villageNames.length)]
  
  // Generate parent name
  const parentPrefix = parentPrefixes[Math.floor(Math.random() * parentPrefixes.length)]
  const parentFirstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const parentLastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  const parentName = `${parentPrefix} ${parentFirstName} ${parentLastName}`
  const parentPhone = generatePhoneNumber()

  return { 
    name, 
    email, 
    studentPhone, 
    village, 
    parentName, 
    parentPhone 
  }
}

/**
 * Generate random marks between min and max
 */
function generateRandomMarks(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Generate dates for attendance (past 30 days)
 */
function generateAttendanceDates() {
  const dates = []
  const today = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])
  }

  return dates
}

/**
 * Get day name from date
 */
function getDayName(dateString) {
  const date = new Date(dateString + 'T00:00:00')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[date.getDay()]
}

/**
 * Generate random attendance status
 */
function getRandomStatus() {
  const statuses = ['present', 'absent', 'late']
  const weights = [0.75, 0.15, 0.1] // 75% present, 15% absent, 10% late
  const random = Math.random()

  if (random < weights[0]) return 'present'
  if (random < weights[0] + weights[1]) return 'absent'
  return 'late'
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
 * Get time string
 */
function getTimeString() {
  const hour = String(Math.floor(Math.random() * 8) + 9).padStart(2, '0') // 9 AM to 4 PM
  const minute = String(Math.floor(Math.random() * 60)).padStart(2, '0')
  return `${hour}:${minute}`
}

/**
 * Main function to seed complete Test-batch data
 */
async function seedTestBatch() {
  let client

  try {
    console.log('🚀 Starting comprehensive Test-batch seeding...')
    console.log('📋 Requirements:')
    console.log('   - Batch: Test-batch')
    console.log('   - 5 coaches with unique names, emails, and phone numbers')
    console.log('   - 5 sections (one coach per section)')
    console.log('   - 30 students per section (150 total) with complete details')
    console.log('   - 30 days of attendance per student')
    console.log('   - 5 tests with subjects: Tech, Problem Solving, English, Life Skills, Monthly Assessment')
    console.log('   - Marks for each subject for every student\n')
    
    if (isDryRun) {
      console.log('🔍 Running in DRY RUN mode - no database changes will be made')
      console.log('📋 This will show what data would be created\n')
    } else {
      console.log('Connecting to MongoDB...')
      
      // Use the same connection options as lib/db/connection.js
      const connectionOptions = {
        tls: true,
        tlsAllowInvalidCertificates: false,
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
      }

      // Retry connection up to 5 times with exponential backoff
      let connectionAttempts = 0
      const maxAttempts = 5
      
      while (connectionAttempts < maxAttempts) {
        try {
          console.log(`   Attempt ${connectionAttempts + 1}/${maxAttempts}...`)
          client = new MongoClient(MONGODB_URI, connectionOptions)
          
          // Set a timeout for the connection
          const connectPromise = client.connect()
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
          )
          
          await Promise.race([connectPromise, timeoutPromise])
          
          // Test the connection
          await client.db('admin').command({ ping: 1 })
          console.log('✅ Connected to MongoDB successfully!\n')
          break
        } catch (error) {
          connectionAttempts++
          const errorMsg = error.message || error.toString()
          console.log(`   ⚠️  Attempt ${connectionAttempts}/${maxAttempts} failed: ${errorMsg}`)
          
          if (connectionAttempts >= maxAttempts) {
            console.error('\n❌ Failed to connect to MongoDB after', maxAttempts, 'attempts')
            console.error('\n📋 Troubleshooting steps:')
            console.error('   1. Check if your MongoDB Atlas cluster is running (not paused)')
            console.error('   2. Verify your MONGODB_URI in .env.local is correct')
            console.error('   3. Check your network connection and firewall settings')
            console.error('   4. Ensure your IP is whitelisted in MongoDB Atlas')
            console.error('   5. Try running the script from your local machine with network access\n')
            throw new Error(`MongoDB connection failed: ${errorMsg}`)
          }
          
          // Exponential backoff: wait longer between retries
          const waitTime = Math.min(3000 * Math.pow(2, connectionAttempts - 1), 10000)
          console.log(`   ⏳ Waiting ${waitTime/1000} seconds before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    let db, managementCollection, classesCollection, coachesCollection, subjectsCollection, 
        studentsCollection, testsCollection, marksCollection, attendanceCollection, batchesCollection

    if (!isDryRun) {
      db = client.db(DB_NAME)
      managementCollection = db.collection('management')
      classesCollection = db.collection('classes')
      coachesCollection = db.collection('coaches')
      subjectsCollection = db.collection('subjects')
      studentsCollection = db.collection('students')
      testsCollection = db.collection('tests')
      marksCollection = db.collection('marks')
      attendanceCollection = db.collection('attendance')
      batchesCollection = db.collection('batches')
    }

    // Get the first management
    let management, managementId

    if (isDryRun) {
      // Mock management for dry run
      managementId = 'MGT_DRY_RUN_001'
      console.log(`📋 Using mock management: ${managementId} (DRY RUN)`)
    } else {
      management = await managementCollection.findOne({})

      if (!management) {
        console.error('❌ No management found in database. Please create a management first.')
        process.exit(1)
      }

      managementId = management.managementId
      console.log(`📋 Using management: ${managementId}`)
    }

    console.log(`📚 Using batch: ${BATCH_NAME}\n`)

    const now = new Date()

    // Step 1: Create batch entry
    if (!isDryRun) {
      console.log('📦 Step 0: Creating batch entry...')
      await batchesCollection.updateOne(
        { batchName: BATCH_NAME, managementId },
        {
          $set: {
            batchName: BATCH_NAME,
            managementId,
            createdAt: now,
            updatedAt: now,
          }
        },
        { upsert: true }
      )
      console.log(`✅ Batch "${BATCH_NAME}" created/verified\n`)
    }

    // Step 1: Create coaches
    console.log('👨‍🏫 Step 1: Creating 5 coaches...')
    const createdCoaches = []

    for (let i = 0; i < coachesData.length; i++) {
      const coachData = coachesData[i]
      
      // Check if coach already exists
      let existingCoach = null
      if (!isDryRun) {
        existingCoach = await coachesCollection.findOne({
          email: coachData.email,
          managementId,
        })
      }

      if (existingCoach) {
        console.log(`  ⏭️  Coach already exists: ${coachData.name} (${existingCoach.coachId})`)
        createdCoaches.push(existingCoach)
        continue
      }

      const coachId = isDryRun ? `COA_DRY_RUN_${String(i + 1).padStart(3, '0')}` : await generateCoachId(coachesCollection, managementId)

      const coach = {
        coachId,
        name: coachData.name,
        email: coachData.email,
        phone: coachData.phone,
        photo: '',
        managementId,
        batch: BATCH_NAME,
        createdAt: now,
        updatedAt: now,
      }

      if (!isDryRun) {
        await coachesCollection.insertOne(coach)
      }
      createdCoaches.push(coach)
      console.log(`  ${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Created'} coach: ${coachData.name} (${coachId})`)
      console.log(`     Email: ${coachData.email}, Phone: ${coachData.phone}`)
    }

    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${createdCoaches.length} coaches!\n`)

    // Step 2: Create classes (sections) and assign coaches (one coach per section)
    console.log('🏫 Step 2: Creating 5 sections and assigning coaches (one coach per section)...')
    const createdClasses = []

    for (let i = 0; i < sections.length; i++) {
      const sectionData = sections[i]
      const coach = createdCoaches[i] // One coach per section
      
      // Check if section already exists
      let existingClass = null
      if (!isDryRun) {
        existingClass = await classesCollection.findOne({
          name: sectionData.name,
          managementId,
          batch: BATCH_NAME,
        })
      }

      if (existingClass) {
        console.log(`  ⏭️  Section already exists: ${sectionData.name} (${existingClass.classId})`)
        createdClasses.push(existingClass)
        continue
      }

      const classId = isDryRun ? `CLS_DRY_RUN_${String(i + 1).padStart(3, '0')}` : await generateClassId(classesCollection, managementId)

      const classData = {
        classId,
        name: sectionData.name,
        description: sectionData.description,
        coachId: coach.coachId,
        coachName: coach.name,
        managementId,
        batch: BATCH_NAME,
        createdAt: now,
        updatedAt: now,
      }

      if (!isDryRun) {
        await classesCollection.insertOne(classData)
      }
      createdClasses.push(classData)
      console.log(`  ${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Created'} section: ${sectionData.name} (${classId}) - Coach: ${coach.name}`)
    }

    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${createdClasses.length} sections!\n`)

    // Step 3: Create subjects (5 subjects - one for each test)
    console.log('📖 Step 3: Creating 5 subjects (one for each test)...')
    const createdSubjects = []
    let subjectCounter = 1

    // Create one subject per test for each section
    for (const classData of createdClasses) {
      console.log(`  📚 Creating subjects for ${classData.name}...`)

      for (const subjectName of testSubjects) {
        // Check if subject already exists
        let existingSubject = null
        if (!isDryRun) {
          existingSubject = await subjectsCollection.findOne({
            name: subjectName,
            classId: classData.classId,
            managementId,
            batch: BATCH_NAME,
          })
        }

        if (existingSubject) {
          console.log(`    ⏭️  Subject already exists: ${subjectName} (${existingSubject.subjectId})`)
          createdSubjects.push(existingSubject)
          subjectCounter++
          continue
        }

        const subjectId = isDryRun ? `SUB_DRY_RUN_${String(subjectCounter++).padStart(3, '0')}` : await generateSubjectId(subjectsCollection, managementId)

        const subject = {
          subjectId,
          name: subjectName,
          classId: classData.classId,
          managementId,
          batch: BATCH_NAME,
          createdAt: now,
          updatedAt: now,
        }

        if (!isDryRun) {
          await subjectsCollection.insertOne(subject)
        }
        createdSubjects.push(subject)
        console.log(`    ${isDryRun ? '📋' : '✅'} ${subjectName} (${subjectId})`)
      }
    }

    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${createdSubjects.length} subjects!\n`)

    // Step 4: Create students (30 per section = 150 total)
    console.log('👨‍🎓 Step 4: Creating 30 students per section (150 total)...')
    const createdStudents = []
    let studentIndex = 0

    for (const classData of createdClasses) {
      console.log(`  👥 Creating students for ${classData.name}...`)

      for (let i = 0; i < 30; i++) {
        const { name, email, studentPhone, village, parentName, parentPhone } = generateStudentData(studentIndex)
        
        // Check if student already exists
        let existingStudent = null
        if (!isDryRun) {
          existingStudent = await studentsCollection.findOne({
            email,
            managementId,
          })
        }

        if (existingStudent) {
          // Update existing student to ensure it has all required fields
          if (!existingStudent.village || !existingStudent.parentName || !existingStudent.parentPhone) {
            await studentsCollection.updateOne(
              { _id: existingStudent._id },
              {
                $set: {
                  village: village,
                  parentName: parentName,
                  parentPhone: parentPhone,
                  phone: studentPhone,
                  classId: classData.classId,
                  batch: BATCH_NAME,
                  updatedAt: now,
                }
              }
            )
          }
          createdStudents.push(existingStudent)
          studentIndex++
          if (!isDryRun) {
            process.stdout.write(`    ⏭️  ${name} (existing)\r`)
          }
          continue
        }

        const studentId = isDryRun ? `STU_DRY_RUN_${String(studentIndex + 1).padStart(4, '0')}` : await generateStudentId(studentsCollection, managementId)

        const student = {
          studentId,
          name,
          email,
          phone: studentPhone,
          village,
          parentName,
          parentPhone,
          photo: '',
          classId: classData.classId,
          batch: BATCH_NAME,
          managementId,
          attendanceStatus: 'present',
          createdAt: now,
          updatedAt: now,
        }

        if (!isDryRun) {
          const result = await studentsCollection.insertOne(student)
          student._id = result.insertedId // Store the ObjectId for marks creation
        }
        createdStudents.push(student)
        studentIndex++

        if (isDryRun && i < 3) {
          // Show first 3 students in dry run
          console.log(`    📋 ${name} (${studentId})`)
          console.log(`       Email: ${email}, Phone: ${studentPhone}`)
          console.log(`       Village: ${village}, Parent: ${parentName} (${parentPhone})`)
        } else if (!isDryRun) {
          process.stdout.write(`    ✓ ${name} (${studentId})\r`)
        }
      }
      if (!isDryRun) console.log('')
    }

    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${createdStudents.length} students!\n`)

    // Step 5: Create attendance (30 days per student)
    // Note: Attendance is stored as one document per class per day with nested students object
    console.log('📅 Step 5: Creating 30 days of attendance per student...')
    const attendanceDates = generateAttendanceDates()
    let totalAttendanceRecords = 0
    let skippedAttendanceRecords = 0

    for (const classData of createdClasses) {
      console.log(`  📊 Creating attendance for ${classData.name}...`)

      // Get students for this class
      const classStudents = createdStudents.filter(s => s.classId === classData.classId)

      for (const date of attendanceDates) {
        const dayName = getDayName(date)

        // Generate attendance status for each student
        const studentsData = {}
        classStudents.forEach(student => {
          // Use studentId as key (as per attendance API structure)
          const studentIdKey = isDryRun ? `mock_student_${student.studentId}` : student._id.toString()
          studentsData[studentIdKey] = getRandomStatus()
        })

        // Check if attendance record already exists
        let existingAttendance = null
        if (!isDryRun) {
          existingAttendance = await attendanceCollection.findOne({
            classId: classData.classId,
            date: date,
            managementId: managementId,
          })
        }

        if (existingAttendance) {
          skippedAttendanceRecords++
          continue
        }

        // Insert attendance record (one document per class per day)
        if (!isDryRun) {
          await attendanceCollection.updateOne(
            {
              classId: classData.classId,
              date: date,
              managementId: managementId,
            },
            {
              $set: {
                classId: classData.classId,
                coachId: classData.coachId,
                date: date,
                day: dayName,
                students: studentsData,
                managementId: managementId,
                batch: BATCH_NAME,
                updatedAt: now,
              },
              $setOnInsert: {
                createdAt: now,
              },
            },
            { upsert: true }
          )
        }

        totalAttendanceRecords++
        if (isDryRun) {
          console.log(`    ${isDryRun ? '📋' : '✓'} ${date} (${dayName}) - ${classStudents.length} students`)
        } else {
          process.stdout.write(`    ✓ ${date} (${dayName}) - ${classStudents.length} students\r`)
        }
      }
      if (!isDryRun) console.log('')
    }

    if (skippedAttendanceRecords > 0) {
      console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${totalAttendanceRecords} attendance records, skipped ${skippedAttendanceRecords} existing records!\n`)
    } else {
      console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${totalAttendanceRecords} attendance records (${attendanceDates.length} days × ${createdClasses.length} sections)!\n`)
    }

    // Step 6: Create tests (5 tests - one for each subject)
    console.log('📝 Step 6: Creating 5 tests (one for each subject)...')
    const createdTests = []
    let testCounter = 1

    // Create one test per subject for each section
    for (const classData of createdClasses) {
      const classSubjects = createdSubjects.filter(s => s.classId === classData.classId)
      const classStudents = createdStudents.filter(s => s.classId === classData.classId)

      console.log(`  📋 Creating tests for ${classData.name}...`)

      for (let testIndex = 0; testIndex < testSubjects.length; testIndex++) {
        const subjectName = testSubjects[testIndex]
        const subject = classSubjects.find(s => s.name === subjectName)
        const testId = isDryRun ? `TEST_DRY_RUN_${String(testCounter++).padStart(4, '0')}` : await generateTestId(testsCollection, managementId)
        const testDate = getDateString(-30 + (testIndex * 7)) // Spread over 30 days
        const testTime = getTimeString()

        const test = {
          testId,
          name: subjectName,
          date: testDate,
          time: testTime,
          classId: classData.classId,
          subjectId: subject.subjectId,
          coachId: classData.coachId,
          coachName: classData.coachName,
          managementId,
          batch: BATCH_NAME,
          createdAt: now,
          updatedAt: now,
        }

        if (!isDryRun) {
          await testsCollection.insertOne(test)
        }
        createdTests.push(test)
        console.log(`    ${isDryRun ? '📋' : '✅'} ${subjectName} test (${testId}) - Date: ${testDate}`)

        // Step 7: Create marks for this test (nested structure: one document per test)
        const maxMarks = 100
        const studentsMarks = {}

        // Build nested students object with ObjectId strings as keys
        for (const student of classStudents) {
          const marks = generateRandomMarks(60, 95) // Marks between 60-95
          
          if (isDryRun) {
            // Dry run: use mock ObjectId
            studentsMarks[`mock_student_${student.studentId}`] = {
              marks,
              maxMarks,
            }
          } else {
            // Real run: use actual ObjectId from inserted student
            if (student._id) {
              studentsMarks[student._id.toString()] = {
                marks,
                maxMarks,
              }
            }
          }
        }

        // Create or update marks document (one per test with nested students object)
        if (!isDryRun && Object.keys(studentsMarks).length > 0) {
          // Check if marks already exist for this test
          const existingMarks = await marksCollection.findOne({
            testId,
            managementId,
          })

          if (existingMarks) {
            // Update existing marks
            await marksCollection.updateOne(
              { testId, managementId },
              {
                $set: {
                  students: studentsMarks,
                  updatedAt: now,
                }
              }
            )
          } else {
            // Insert new marks
            await marksCollection.insertOne({
              testId,
              classId: classData.classId,
              subjectId: subject.subjectId,
              students: studentsMarks,
              managementId,
              batch: BATCH_NAME,
              createdAt: now,
              updatedAt: now,
            })
          }
        }
      }
    }

    const totalMarksDocuments = createdTests.length // One marks document per test
    const totalStudentMarksEntries = createdStudents.length * createdTests.length // Total student-mark entries
    
    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${createdTests.length} tests!`)
    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${totalMarksDocuments} marks documents (containing ${totalStudentMarksEntries} student-mark entries)!\n`)

    // Summary
    console.log('='.repeat(60))
    console.log('📊 SEEDING SUMMARY')
    console.log('='.repeat(60))
    console.log(`Batch: ${BATCH_NAME}`)
    console.log(`Coaches: ${createdCoaches.length}`)
    console.log(`Sections: ${createdClasses.length}`)
    console.log(`Subjects: ${createdSubjects.length} (${testSubjects.length} per section)`)
    console.log(`Students: ${createdStudents.length} (30 per section)`)
    console.log(`Attendance Records: ${totalAttendanceRecords} (${attendanceDates.length} days × ${createdClasses.length} sections)`)
    console.log(`Tests: ${createdTests.length} (${testSubjects.length} per section)`)
    console.log(`Marks Documents: ${createdTests.length} (one per test)`)
    console.log(`Student-Mark Entries: ${createdStudents.length * createdTests.length} (all students × all tests)`)
    console.log('='.repeat(60))

    if (!isDryRun) {
      // Update batch student count
      await batchesCollection.updateOne(
        { batchName: BATCH_NAME, managementId },
        {
          $set: {
            studentCount: createdStudents.length,
            updatedAt: new Date(),
          }
        }
      )
      console.log(`\n✅ Updated batch student count to ${createdStudents.length}`)
    }

    console.log('\n🎉 Test-batch seeding completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Verify data via existing APIs')
    console.log('   2. Test the web application to confirm all data displays correctly')
    console.log('   3. Check students, attendance, tests, marks, and coaches in the UI\n')

  } catch (error) {
    console.error('❌ Error seeding Test-batch:', error)
    throw error
  } finally {
    if (client && !isDryRun) {
      await client.close()
      console.log('✅ MongoDB connection closed')
    }
  }
}

// Run the script
seedTestBatch()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

