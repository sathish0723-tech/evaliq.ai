/**
 * Comprehensive Script to seed Batch-6 with complete data structure
 * Creates: 5 sections, 5 coaches, 5 subjects per section, 30 students per section,
 * 5 tests per subject with marks, and 30 days of attendance
 * Usage: node scripts/seed-batch-6-complete.js [--dry-run]
 * --dry-run: Show what would be created without connecting to database
 */

const { MongoClient, ObjectId } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://clashseven02_db_user:NThuq1VYGB5jM5rv@cluster0.opegv1r.mongodb.net/student_management?retryWrites=true&w=majority'
const DB_NAME = 'student_management'

// Check for dry run mode
const isDryRun = process.argv.includes('--dry-run')

// Batch name
const BATCH_NAME = 'Batch-6'

// Section (class) data
const sections = [
  { name: 'Section A', description: 'Advanced Mathematics Section' },
  { name: 'Section B', description: 'Science and Technology Section' },
  { name: 'Section C', description: 'Literature and Arts Section' },
  { name: 'Section D', description: 'Commerce and Business Section' },
  { name: 'Section E', description: 'Computer Science and IT Section' },
]

// Coach data
const coachesData = [
  { name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@school.edu', phone: '+91-9876543210' },
  { name: 'Ms. Priya Sharma', email: 'priya.sharma@school.edu', phone: '+91-9876543211' },
  { name: 'Mr. Amit Singh', email: 'amit.singh@school.edu', phone: '+91-9876543212' },
  { name: 'Dr. Sunita Verma', email: 'sunita.verma@school.edu', phone: '+91-9876543213' },
  { name: 'Mr. Vikram Patel', email: 'vikram.patel@school.edu', phone: '+91-9876543214' },
]

// Subject names
const subjectNames = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English Literature',
  'History',
  'Geography',
  'Computer Science',
  'Economics',
  'Business Studies',
  'Accountancy',
  'Physical Education',
  'Art & Craft',
  'Music',
  'Moral Science',
  'Hindi',
  'Sanskrit',
  'French',
  'Psychology',
  'Sociology',
]

// Test names
const testNames = [
  'Monthly Assessment',
  'Problem Solving Test',
  'Unit Test - 1',
  'Mid-term Examination',
  'Final Assessment'
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

// Village names for Indian villages
const villageNames = [
  'Rampur', 'Sitapur', 'Meerut', 'Ghaziabad', 'Noida', 'Faridabad', 'Gurugram', 'Rohtak',
  'Hisar', 'Panipat', 'Sonipat', 'Karnal', 'Ambala', 'Panchkula', 'Chandigarh', 'Shimla',
  'Mandi', 'Solan', 'Nahan', 'Bilaspur', 'Hamirpur', 'Kangra', 'Pathankot', 'Jalandhar',
  'Amritsar', 'Ludhiana', 'Patiala', 'Bathinda', 'Sangrur', 'Ferozepur', 'Moga', 'Barnala'
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
  return `${areaCode}${exchange}${number}`
}

/**
 * Generate student data
 */
function generateStudentData(index) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  const name = `${firstName} ${lastName}`
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@student.academy.edu`
  const phone = generatePhoneNumber()
  const village = villageNames[Math.floor(Math.random() * villageNames.length)]

  return { name, email, phone, village }
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
 * Main function to seed complete Batch-6 data
 */
async function seedBatch6Complete() {
  let client

  try {
    console.log('🚀 Starting comprehensive Batch-6 seeding...')
    if (isDryRun) {
      console.log('🔍 Running in DRY RUN mode - no database changes will be made')
      console.log('📋 This will show what data would be created')
    } else {
      console.log('Connecting to MongoDB...')
      client = new MongoClient(MONGODB_URI, {
        tls: true,
        retryWrites: true,
      })

      await client.connect()
      console.log('✅ Connected to MongoDB')
    }

    let db, managementCollection, classesCollection, coachesCollection, subjectsCollection, studentsCollection, testsCollection, marksCollection, attendanceCollection

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

    console.log(`📚 Using batch: ${BATCH_NAME}`)

    const now = new Date()

    // Step 1: Create coaches
    console.log('\n👨‍🏫 Step 1: Creating 5 coaches...')
    const createdCoaches = []

    for (let i = 0; i < coachesData.length; i++) {
      const coachData = coachesData[i]
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
    }

    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${createdCoaches.length} coaches!`)

    // Step 2: Create classes (sections) and assign coaches
    console.log('\n🏫 Step 2: Creating 4 sections and assigning coaches...')
    const createdClasses = []

    for (let i = 0; i < sections.length; i++) {
      const sectionData = sections[i]
      const coach = createdCoaches[i % createdCoaches.length] // Assign coaches in round-robin (some coaches may handle multiple sections)
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

    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${createdClasses.length} sections!`)

    // Step 3: Create subjects (5 per section)
    console.log('\n📖 Step 3: Creating 5 subjects per section...')
    const createdSubjects = []
    let subjectCounter = 1

    for (const classData of createdClasses) {
      console.log(`  📚 Creating subjects for ${classData.name}...`)

      // Select 5 random subjects for this class
      const shuffledSubjects = [...subjectNames].sort(() => Math.random() - 0.5)
      const classSubjects = shuffledSubjects.slice(0, 5)

      for (const subjectName of classSubjects) {
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

    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${createdSubjects.length} subjects!`)

    // Step 4: Create students (30 per section)
    console.log('\n👨‍🎓 Step 4: Creating 30 students per section...')
    const createdStudents = []
    let studentIndex = 0

    for (const classData of createdClasses) {
      console.log(`  👥 Creating students for ${classData.name}...`)

      for (let i = 0; i < 30; i++) {
        const { name, email, phone, village } = generateStudentData(studentIndex)
        const studentId = isDryRun ? `STU_DRY_RUN_${String(studentIndex + 1).padStart(4, '0')}` : await generateStudentId(studentsCollection, managementId)

        const student = {
          studentId,
          name,
          email,
          phone,
          village,
          photo: '',
          classId: classData.classId,
          batch: BATCH_NAME,
          managementId,
          attendanceStatus: 'present',
          createdAt: now,
          updatedAt: now,
        }

        if (!isDryRun) {
          await studentsCollection.insertOne(student)
        }
        createdStudents.push(student)
        studentIndex++

        if (isDryRun) {
          console.log(`    ${isDryRun ? '📋' : '✓'} ${name} (${studentId})`)
        } else {
          process.stdout.write(`    ✓ ${name} (${studentId})\r`)
        }
      }
      if (!isDryRun) console.log('')
    }

    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${createdStudents.length} students!`)

    // Step 5: Create tests and marks (5 tests per subject)
    console.log('\n📝 Step 5: Creating tests and marks...')
    let totalTests = 0
    let totalMarksRecords = 0
    let testCounter = 1

    for (const subject of createdSubjects) {
      console.log(`  📋 Creating tests for ${subject.name} in ${createdClasses.find(c => c.classId === subject.classId).name}...`)

      // Get students for this class
      const classStudents = createdStudents.filter(s => s.classId === subject.classId)

      // Create 5 tests for this subject
      for (let testIndex = 0; testIndex < 5; testIndex++) {
        const testName = testNames[testIndex]
        const testId = isDryRun ? `TEST_DRY_RUN_${String(testCounter++).padStart(4, '0')}` : await generateTestId(testsCollection, managementId)
        const testDate = getDateString(-30 + (testIndex * 7)) // Spread over 30 days
        const testTime = getTimeString()

        const test = {
          testId,
          name: testName,
          date: testDate,
          time: testTime,
          classId: subject.classId,
          subjectId: subject.subjectId,
          coachId: createdClasses.find(c => c.classId === subject.classId).coachId,
          coachName: createdClasses.find(c => c.classId === subject.classId).coachName,
          managementId,
          batch: BATCH_NAME,
          createdAt: now,
          updatedAt: now,
        }

        if (!isDryRun) {
          await testsCollection.insertOne(test)
        }

        // Create marks for this test
        const studentsMarks = {}
        const maxMarks = 100

        classStudents.forEach(student => {
          const marks = generateRandomMarks(0, maxMarks)
          studentsMarks[isDryRun ? `mock_student_${student.studentId}` : student._id.toString()] = {
            marks,
            maxMarks,
          }
        })

        // Insert marks record
        if (!isDryRun) {
          await marksCollection.insertOne({
            testId: test.testId,
            classId: test.classId,
            subjectId: test.subjectId,
            students: studentsMarks,
            managementId,
            batch: BATCH_NAME,
            createdAt: now,
            updatedAt: now,
          })
        }

        totalTests++
        totalMarksRecords++
        console.log(`    ${isDryRun ? '📋' : '✅'} ${testName} - ${testDate} (${testId}) - ${classStudents.length} students`)
      }
    }

    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${totalTests} tests and ${totalMarksRecords} marks records!`)

    // Step 6: Create attendance (30 days per section)
    console.log('\n📅 Step 6: Creating 30 days of attendance per section...')
    const attendanceDates = generateAttendanceDates()
    let totalAttendanceRecords = 0

    for (const classData of createdClasses) {
      console.log(`  📊 Creating attendance for ${classData.name}...`)

      // Get students for this class
      const classStudents = createdStudents.filter(s => s.classId === classData.classId)

      for (const date of attendanceDates) {
        const dayName = getDayName(date)

        // Generate attendance status for each student
        const studentsData = {}
        classStudents.forEach(student => {
          studentsData[isDryRun ? `mock_student_${student.studentId}` : student._id.toString()] = getRandomStatus()
        })

        // Insert attendance record
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
                managementId: managementId,
                batch: BATCH_NAME,
                students: studentsData,
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

    console.log(`${isDryRun ? '📋' : '✅'} ${isDryRun ? 'Would create' : 'Successfully created'} ${totalAttendanceRecords} attendance records!`)

    // Final Summary
    console.log(`\n${isDryRun ? '📋 DRY RUN COMPLETE' : '🎉 SEEDING COMPLETE'}! Here's your Batch-6 summary:`)
    console.log('=' .repeat(60))
    console.log(`📋 Batch: ${BATCH_NAME}`)
    console.log(`🏫 Sections: ${createdClasses.length}`)
    console.log(`👨‍🏫 Coaches: ${createdCoaches.length}`)
    console.log(`📖 Subjects: ${createdSubjects.length} (${createdSubjects.length / createdClasses.length} per section)`)
    console.log(`👨‍🎓 Students: ${createdStudents.length} (${createdStudents.length / createdClasses.length} per section)`)
    console.log(`📝 Tests: ${totalTests} (${totalTests / createdSubjects.length} per subject)`)
    console.log(`📊 Marks Records: ${totalMarksRecords}`)
    console.log(`📅 Attendance Records: ${totalAttendanceRecords} (${attendanceDates.length} days × ${createdClasses.length} sections)`)
    console.log('=' .repeat(60))

    if (isDryRun) {
      console.log('\n🔍 This was a DRY RUN - no data was actually created in the database.')
      console.log('💡 To actually create the data, run the script without --dry-run flag.')
      console.log('⚠️  Make sure MongoDB connection is working before running without --dry-run.')
    }

    // Section-wise breakdown
    console.log('\n📊 Section-wise breakdown:')
    createdClasses.forEach((classData, index) => {
      const sectionStudents = createdStudents.filter(s => s.classId === classData.classId)
      const sectionSubjects = createdSubjects.filter(s => s.classId === classData.classId)
      const sectionCoach = createdCoaches.find(c => c.coachId === classData.coachId)

      console.log(`\n🏫 ${classData.name}:`)
      console.log(`  👨‍🏫 Coach: ${sectionCoach.name}`)
      console.log(`  👨‍🎓 Students: ${sectionStudents.length}`)
      console.log(`  📖 Subjects: ${sectionSubjects.map(s => s.name).join(', ')}`)
      console.log(`  📝 Tests: ${sectionSubjects.length * 5}`)
      console.log(`  📅 Attendance Days: ${attendanceDates.length}`)
    })

  } catch (error) {
    console.error(`❌ Error ${isDryRun ? 'in dry run' : 'seeding Batch-6 data'}:`, error)
    process.exit(1)
  } finally {
    if (client && !isDryRun) {
      await client.close()
      console.log('\n🔌 Database connection closed')
    }
  }
}

// Run the script
seedBatch6Complete()
