/**
 * Script to add batch field to all students that don't have it
 * Sets default batch to "Batch-4" for all students without a batch
 * Usage: 
 *   node scripts/add-batch-field.js          # Only update students without batch
 *   node scripts/add-batch-field.js --force  # Force update ALL students to Batch-4
 */

const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://clashseven02_db_user:NThuq1VYGB5jM5rv@cluster0.opegv1r.mongodb.net/student_management?retryWrites=true&w=majority'

const DB_NAME = 'student_management'
const DEFAULT_BATCH = 'Batch-4'

// Check for --force flag
const FORCE_UPDATE = process.argv.includes('--force')

async function addBatchField() {
  let client
  
  try {
    console.log('Connecting to MongoDB...')
    client = await MongoClient.connect(MONGODB_URI)
    const db = client.db(DB_NAME)
    
    const studentsCollection = db.collection('students')
    
    console.log('\n=== Adding Batch Field to Students ===\n')
    
    // Get all unique management IDs
    const managementIds = await studentsCollection.distinct('managementId')
    console.log(`Found ${managementIds.length} management(s)`)
    
    for (const managementId of managementIds) {
      console.log(`\n--- Processing Management: ${managementId} ---`)
      
      if (FORCE_UPDATE) {
        console.log(`⚠ FORCE MODE: Will update ALL students to "${DEFAULT_BATCH}"`)
        
        // Count total students
        const totalStudents = await studentsCollection.countDocuments({
          managementId: managementId
        })
        
        console.log(`Found ${totalStudents} total student(s)`)
        
        // Force update ALL students to DEFAULT_BATCH
        const result = await studentsCollection.updateMany(
          {
            managementId: managementId
          },
          {
            $set: {
              batch: DEFAULT_BATCH,
              updatedAt: new Date(),
            }
          }
        )
        
        console.log(`  ✓ Updated ${result.modifiedCount} student(s) to batch: "${DEFAULT_BATCH}"`)
      } else {
        // Find students without batch field or with empty batch
        const studentsWithoutBatch = await studentsCollection.find({
          managementId: managementId,
          $or: [
            { batch: { $exists: false } },
            { batch: '' },
            { batch: null }
          ]
        }).toArray()
        
        console.log(`Found ${studentsWithoutBatch.length} student(s) without batch field`)
        
        if (studentsWithoutBatch.length === 0) {
          console.log('  ✓ All students already have batch field')
          continue
        }
        
        // Update all students without batch to have DEFAULT_BATCH
        const result = await studentsCollection.updateMany(
          {
            managementId: managementId,
            $or: [
              { batch: { $exists: false } },
              { batch: '' },
              { batch: null }
            ]
          },
          {
            $set: {
              batch: DEFAULT_BATCH,
              updatedAt: new Date(),
            }
          }
        )
        
        console.log(`  ✓ Updated ${result.modifiedCount} student(s) with batch: "${DEFAULT_BATCH}"`)
      }
      
      // Verify the update
      const studentsWithBatch = await studentsCollection.countDocuments({
        managementId: managementId,
        batch: DEFAULT_BATCH
      })
      
      console.log(`  ✓ Total students with batch "${DEFAULT_BATCH}": ${studentsWithBatch}`)
      
      // Show batch distribution
      const batchDistribution = await studentsCollection.aggregate([
        {
          $match: {
            managementId: managementId,
            batch: { $exists: true, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$batch',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]).toArray()
      
      console.log(`\n  Batch distribution:`)
      batchDistribution.forEach(b => {
        console.log(`    - ${b._id}: ${b.count} student(s)`)
      })
    }
    
    console.log('\n=== Batch Field Addition Complete ===\n')
    
  } catch (error) {
    console.error('Error adding batch field:', error)
    throw error
  } finally {
    if (client) {
      await client.close()
      console.log('MongoDB connection closed')
    }
  }
}

// Run the script
addBatchField()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

