/**
 * Script to seed one week of attendance data for three classes
 * Usage: node scripts/seed-attendance.js
 */

const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://clashseven02_db_user:NThuq1VYGB5jM5rv@cluster0.opegv1r.mongodb.net/student_management?retryWrites=true&w=majority'
const DB_NAME = 'student_management'

// Get Indian timezone date
function getIndianDate() {
  const now = new Date()
  const indianDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  return indianDate.toISOString().split('T')[0]
}

// Get day name from date
function getDayName(dateString) {
  const date = new Date(dateString + 'T00:00:00')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[date.getDay()]
}

// Generate random attendance status
function getRandomStatus() {
  const statuses = ['present', 'absent', 'late']
  const weights = [0.7, 0.2, 0.1] // 70% present, 20% absent, 10% late
  const random = Math.random()
  
  if (random < weights[0]) return 'present'
  if (random < weights[0] + weights[1]) return 'absent'
  return 'late'
}

// Generate dates for the past week
function generateWeekDates() {
  const dates = []
  const today = new Date()
  const indianToday = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(indianToday)
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])
  }
  
  return dates
}

/**
 * Main function to seed attendance
 */
async function seedAttendance() {
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
    const attendanceCollection = db.collection('attendance')
    const classesCollection = db.collection('classes')
    const studentsCollection = db.collection('students')
    const managementCollection = db.collection('management')
    
    // Get the first management
    const management = await managementCollection.findOne({})
    
    if (!management) {
      console.error('No management found in database. Please create a management first.')
      process.exit(1)
    }
    
    const managementId = management.managementId
    console.log(`Using management: ${managementId}`)
    
    // Get 3 classes
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
    
    // Generate dates for the past week
    const weekDates = generateWeekDates()
    console.log(`\nGenerating attendance for ${weekDates.length} days:`)
    weekDates.forEach(date => {
      console.log(`  - ${date} (${getDayName(date)})`)
    })
    
    const now = new Date()
    let totalRecords = 0
    
    // Process each class
    for (const classData of classes) {
      const classId = classData.classId
      const coachId = classData.coachId || ''
      
      console.log(`\nProcessing class: ${classData.name}`)
      
      // Get all students for this class
      const students = await studentsCollection.find({
        classId: classId,
        managementId: managementId,
      }).toArray()
      
      if (students.length === 0) {
        console.log(`  ⚠️  No students found for this class. Skipping...`)
        continue
      }
      
      console.log(`  Found ${students.length} students`)
      
      // Generate attendance for each day
      for (const date of weekDates) {
        const dayName = getDayName(date)
        
        // Generate attendance status for each student
        const studentsData = {}
        students.forEach(student => {
          studentsData[student._id.toString()] = getRandomStatus()
        })
        
        // Upsert attendance record
        await attendanceCollection.updateOne(
          {
            classId: classId,
            date: date,
            managementId: managementId,
          },
          {
            $set: {
              classId: classId,
              coachId: coachId,
              date: date,
              day: dayName,
              managementId: managementId,
              students: studentsData,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          { upsert: true }
        )
        
        totalRecords++
        process.stdout.write(`  ✓ ${date} (${dayName}) - ${students.length} students\r`)
      }
      console.log('')
    }
    
    console.log(`\n✅ Successfully created ${totalRecords} attendance records!`)
    
    // Display summary
    console.log('\n📊 Summary:')
    for (const classData of classes) {
      const classId = classData.classId
      const students = await studentsCollection.find({
        classId: classId,
        managementId: managementId,
      }).toArray()
      
      console.log(`  ${classData.name}:`)
      console.log(`    - ${students.length} students`)
      console.log(`    - ${weekDates.length} days of attendance`)
      console.log(`    - ${students.length * weekDates.length} total records`)
    }
    
  } catch (error) {
    console.error('Error seeding attendance:', error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('\nDatabase connection closed')
    }
  }
}

// Run the script
seedAttendance()

