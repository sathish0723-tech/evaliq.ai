# Batch-7 Comprehensive Seeding Script

## Overview

This script creates a complete data structure for **Batch-7** with all required entities and relationships.

## What It Creates

### 1. **5 Coaches**
- Unique names, emails, and phone numbers
- Each coach is assigned to one section

### 2. **5 Sections (Classes)**
- Section A, B, C, D, E
- One coach per section (1:1 relationship)

### 3. **150 Students (30 per section)**
Each student includes:
- Student name
- Student email
- Student phone number
- Village name
- Parent name
- Parent phone number

### 4. **5 Subjects per Section (25 total)**
- Tech
- Problem Solving
- English
- Life Skills
- Monthly Assessment

### 5. **5 Tests per Section (25 total)**
- One test per subject
- Each test is linked to a section, subject, and coach

### 6. **30 Days of Attendance**
- Attendance records for every student
- 30 days of attendance data per student
- Random attendance status (present/absent/late)

### 7. **Marks**
- One marks document per test
- Marks for all students in each test
- Marks range: 60-95 (out of 100)

## Usage

### Dry Run (Preview Only)
```bash
node scripts/seed-batch-7-comprehensive.js --dry-run
```

This will show what would be created without making any database changes.

### Actual Seeding
```bash
node scripts/seed-batch-7-comprehensive.js
```

This will create all the data in the database.

## Prerequisites

1. **MongoDB Connection**: Ensure your `.env.local` file has the correct `MONGODB_URI`
2. **Management Record**: At least one management record must exist in the database
3. **Database Access**: The script needs write access to the MongoDB database

## Data Structure

### Students Schema
```javascript
{
  studentId: "STU_XXXXXXXX",
  name: "Student Name",
  email: "student.email@student.batch7.edu",
  phone: "+91-XXXXXXXXXX",
  village: "Village Name",
  parentName: "Mr./Mrs./Ms./Dr. Parent Name",
  parentPhone: "+91-XXXXXXXXXX",
  classId: "CLS_XXXXXXXX",
  batch: "Batch-7",
  // ... other fields
}
```

### Marks Schema (Nested Structure)
```javascript
{
  testId: "TEST_XXXXXXXX",
  classId: "CLS_XXXXXXXX",
  subjectId: "SUB_XXXXXXXX",
  students: {
    "student_object_id_string": {
      marks: 75,
      maxMarks: 100
    },
    // ... more students
  },
  batch: "Batch-7",
  // ... other fields
}
```

## Verification

After running the script, verify the data:

1. **Via Web Application**:
   - Navigate to Settings → Batch Management
   - Select "Batch-7"
   - Check students, coaches, attendance, tests, and marks

2. **Via APIs**:
   ```bash
   # Get students
   GET /api/students?batch=Batch-7
   
   # Get coaches
   GET /api/coaches?batch=Batch-7
   
   # Get classes
   GET /api/classes?batch=Batch-7
   
   # Get tests
   GET /api/tests?batch=Batch-7
   
   # Get marks
   GET /api/marks?batch=Batch-7
   ```

## Expected Output

The script will output:
- ✅ 5 coaches created
- ✅ 5 sections created
- ✅ 25 subjects created (5 per section)
- ✅ 150 students created (30 per section)
- ✅ 4,500 attendance records created (30 days × 150 students)
- ✅ 25 tests created (5 per section)
- ✅ 25 marks documents created (one per test)
- ✅ 3,750 student-mark entries (150 students × 25 tests)

## Notes

- The script automatically creates/updates the batch entry in the `batches` collection
- All data is linked to the first management record found in the database
- Student emails follow the pattern: `firstname.lastname{index}@student.batch7.edu`
- Phone numbers are generated in Indian format: `+91-XXXXXXXXXX`
- Village names are randomly selected from a predefined list
- Parent names include prefixes (Mr., Mrs., Ms., Dr.)

## Troubleshooting

### Error: "No management found in database"
- Solution: Create a management record first (via the web application or directly in MongoDB)

### Error: "MongoDB connection failed"
- Solution: Check your `.env.local` file and ensure `MONGODB_URI` is correct
- Verify network connectivity to MongoDB

### Error: "Duplicate key error"
- Solution: The script uses unique ID generation, but if you've run it before, you may need to clean up existing Batch-7 data first

## Cleanup (if needed)

To remove all Batch-7 data:

```javascript
// In MongoDB shell or via script
db.students.deleteMany({ batch: "Batch-7" })
db.coaches.deleteMany({ batch: "Batch-7" })
db.classes.deleteMany({ batch: "Batch-7" })
db.subjects.deleteMany({ batch: "Batch-7" })
db.tests.deleteMany({ batch: "Batch-7" })
db.marks.deleteMany({ batch: "Batch-7" })
db.attendance.deleteMany({ batch: "Batch-7" })
db.batches.deleteOne({ batchName: "Batch-7" })
```

