/**
 * Script to add batch field to all collections (except management)
 * Sets default batch to "Batch-4" for all documents without a batch
 * Collections updated: students, classes, coaches, subjects, tests, marks, attendance
 * Usage: node scripts/add-batch-to-collections.js
 */

const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://clashseven02_db_user:NThuq1VYGB5jM5rv@cluster0.opegv1r.mongodb.net/student_management?retryWrites=true&w=majority'

const DB_NAME = 'student_management'
const DEFAULT_BATCH = 'Batch-4'

// Collections to update (excluding management, users, batches)
const COLLECTIONS_TO_UPDATE = [
  'students',
  'classes',
  'coaches',
  'subjects',
  'tests',
  'marks',
  'attendance'
]

async function addBatchToCollections() {
  let client
  
  try {
    console.log('Connecting to MongoDB...')
    client = await MongoClient.connect(MONGODB_URI)
    const db = client.db(DB_NAME)
    
    console.log('\n=== Adding Batch Field to Collections ===\n')
    console.log(`Default batch: "${DEFAULT_BATCH}"`)
    console.log(`Collections to update: ${COLLECTIONS_TO_UPDATE.join(', ')}\n`)
    
    // Get all unique management IDs from students
    const studentsCollection = db.collection('students')
    const managementIds = await studentsCollection.distinct('managementId')
    console.log(`Found ${managementIds.length} management(s)\n`)
    
    for (const managementId of managementIds) {
      console.log(`--- Processing Management: ${managementId} ---\n`)
      
      for (const collectionName of COLLECTIONS_TO_UPDATE) {
        const collection = db.collection(collectionName)
        
        // Check if collection exists and has documents
        const count = await collection.countDocuments({ managementId: managementId })
        
        if (count === 0) {
          console.log(`  ${collectionName}: No documents found, skipping`)
          continue
        }
        
        // Find documents without batch field or with empty batch
        const documentsWithoutBatch = await collection.countDocuments({
          managementId: managementId,
          $or: [
            { batch: { $exists: false } },
            { batch: '' },
            { batch: null }
          ]
        })
        
        if (documentsWithoutBatch === 0) {
          console.log(`  ${collectionName}: All ${count} document(s) already have batch field`)
        } else {
          // Update all documents without batch to have DEFAULT_BATCH
          const result = await collection.updateMany(
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
          
          console.log(`  ${collectionName}: Updated ${result.modifiedCount} of ${count} document(s) with batch: "${DEFAULT_BATCH}"`)
          
          // Verify the update
          const withBatch = await collection.countDocuments({
            managementId: managementId,
            batch: DEFAULT_BATCH
          })
          
          console.log(`    ✓ Total documents with batch "${DEFAULT_BATCH}": ${withBatch}`)
        }
        
        // Show batch distribution for this collection
        const batchDistribution = await collection.aggregate([
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
        
        if (batchDistribution.length > 0) {
          console.log(`    Batch distribution:`)
          batchDistribution.forEach(b => {
            console.log(`      - ${b._id}: ${b.count} document(s)`)
          })
        }
        console.log('')
      }
    }
    
    console.log('=== Batch Field Addition Complete ===\n')
    
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
addBatchToCollections()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })











