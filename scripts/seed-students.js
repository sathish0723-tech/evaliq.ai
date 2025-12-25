/**
 * Script to seed 50 students with Batch-4 across 3 classes
 * Usage: node scripts/seed-students.js
 */

const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://clashseven02_db_user:NThuq1VYGB5jM5rv@cluster0.opegv1r.mongodb.net/student_management?retryWrites=true&w=majority'
const DB_NAME = 'student_management'

// Sample first and last names for generating student data
const firstNames = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma',
  'Robert', 'Olivia', 'William', 'Sophia', 'Richard', 'Isabella', 'Joseph', 'Ava',
  'Thomas', 'Mia', 'Charles', 'Charlotte', 'Daniel', 'Amelia', 'Matthew', 'Harper',
  'Anthony', 'Evelyn', 'Mark', 'Abigail', 'Donald', 'Elizabeth', 'Steven', 'Sofia',
  'Paul', 'Avery', 'Andrew', 'Ella', 'Joshua', 'Madison', 'Kenneth', 'Scarlett',
  'Kevin', 'Victoria', 'Brian', 'Aria', 'George', 'Grace', 'Timothy', 'Chloe',
  'Ronald', 'Penelope', 'Jason', 'Layla', 'Edward', 'Riley', 'Jeffrey', 'Zoey',
  'Ryan', 'Nora', 'Jacob', 'Lily', 'Gary', 'Eleanor', 'Nicholas', 'Hannah',
  'Eric', 'Lillian', 'Jonathan', 'Addison', 'Stephen', 'Aubrey', 'Larry', 'Ellie',
  'Justin', 'Stella', 'Scott', 'Natalie', 'Brandon', 'Zoe', 'Benjamin', 'Leah',
  'Samuel', 'Hazel', 'Frank', 'Violet', 'Gregory', 'Aurora', 'Raymond', 'Savannah',
  'Alexander', 'Audrey', 'Patrick', 'Brooklyn', 'Jack', 'Bella', 'Dennis', 'Claire'
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
  'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards',
  'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers'
]

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
  
  return { name, email, phone }
}

/**
 * Main function to seed students
 */
async function seedStudents() {
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
    const studentsCollection = db.collection('students')
    const classesCollection = db.collection('classes')
    const managementCollection = db.collection('management')
    
    // Get the first management (or you can specify a managementId)
    const management = await managementCollection.findOne({})
    
    if (!management) {
      console.error('No management found in database. Please create a management first.')
      process.exit(1)
    }
    
    const managementId = management.managementId
    console.log(`Using management: ${managementId}`)
    
    // Get 3 classes (or create them if they don't exist)
    let classes = await classesCollection
      .find({ managementId })
      .limit(3)
      .toArray()
    
    if (classes.length < 3) {
      console.log(`Found ${classes.length} classes. Need 3 classes.`)
      console.log('Please create at least 3 classes in the application first.')
      process.exit(1)
    }
    
    console.log(`Found ${classes.length} classes:`)
    classes.forEach((cls, idx) => {
      console.log(`  ${idx + 1}. ${cls.name} (${cls.classId})`)
    })
    
    // Generate 50 students
    const students = []
    const studentsPerClass = Math.floor(50 / classes.length)
    const remainder = 50 % classes.length
    
    console.log(`\nGenerating 50 students with Batch-4...`)
    console.log(`Distributing: ${studentsPerClass} students per class (with ${remainder} extra)`)
    
    let studentIndex = 0
    
    for (let classIdx = 0; classIdx < classes.length; classIdx++) {
      const classId = classes[classIdx].classId
      const count = studentsPerClass + (classIdx < remainder ? 1 : 0)
      
      console.log(`\nGenerating ${count} students for class: ${classes[classIdx].name}`)
      
      for (let i = 0; i < count; i++) {
        const { name, email, phone } = generateStudentData(studentIndex)
        const studentId = await generateStudentId(studentsCollection, managementId)
        
        const now = new Date()
        students.push({
          studentId,
          name,
          email,
          phone,
          photo: '',
          classId,
          batch: 'Batch-4',
          managementId,
          attendanceStatus: 'present',
          createdAt: now,
          updatedAt: now,
        })
        
        studentIndex++
        process.stdout.write(`  ✓ ${name} (${studentId})\r`)
      }
      console.log('')
    }
    
    // Insert students into database
    console.log('\nInserting students into database...')
    const result = await studentsCollection.insertMany(students)
    console.log(`\n✅ Successfully created ${result.insertedCount} students!`)
    
    // Display summary
    console.log('\n📊 Summary:')
    for (let classIdx = 0; classIdx < classes.length; classIdx++) {
      const classId = classes[classIdx].classId
      const count = students.filter(s => s.classId === classId).length
      console.log(`  ${classes[classIdx].name}: ${count} students`)
    }
    console.log(`  Total: 50 students (all Batch-4)`)
    
  } catch (error) {
    console.error('Error seeding students:', error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('\nDatabase connection closed')
    }
  }
}

// Run the script
seedStudents()
