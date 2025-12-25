# Test-batch Comprehensive Seeding Script

## Overview

This script creates a complete data structure for **Test-batch** with all required entities and relationships.

## What It Creates

### 1. **5 Coaches**
- Unique names, emails, and phone numbers
- Each coach is assigned to one section (1:1 relationship)

### 2. **5 Sections (Classes)**
- Section A, B, C, D, E
- One coach per section

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
- Stored as one document per class per day with nested students object
- Random attendance status (present/absent/late)

### 7. **Marks**
- One marks document per test
- Marks for all students in each test
- Marks range: 60-95 (out of 100)
- Stored as nested structure with ObjectId strings as keys

## Usage

### Dry Run (Preview Only)
```bash
node scripts/seed-test-batch.js --dry-run
```

This will show what would be created without making any database changes.

### Actual Seeding
```bash
node scripts/seed-test-batch.js
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
  email: "student.email@student.testbatch.edu",
  phone: "+91-XXXXXXXXXX",
  village: "Village Name",
  parentName: "Mr./Mrs./Ms./Dr. Parent Name",
  parentPhone: "+91-XXXXXXXXXX",
  classId: "CLS_XXXXXXXX",
  batch: "Test-batch",
  // ... other fields
}
```

### Attendance Schema (One document per class per day)
```javascript
{
  classId: "CLS_XXXXXXXX",
  coachId: "COA_XXXXXXXX",
  date: "2024-01-15",
  day: "Monday",
  students: {
    "student_object_id_string": "present", // or "absent" or "late"
    // ... more students
  },
  batch: "Test-batch",
  managementId: "...",
  // ... other fields
}
```

### Marks Schema (Nested Structure - One document per test)
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
  batch: "Test-batch",
  // ... other fields
}
```

## Verification

After running the script, verify the data:

### 1. Via Web Application:
   - Navigate to Settings → Batch Management
   - Select "Test-batch"
   - Check students, coaches, attendance, tests, and marks

### 2. Via APIs:
   ```bash
   # Get students
   GET /api/students?batch=Test-batch
   
   # Get coaches
   GET /api/coaches?batch=Test-batch
   
   # Get classes
   GET /api/classes?batch=Test-batch
   
   # Get tests
   GET /api/tests?batch=Test-batch
   
   # Get marks
   GET /api/marks?batch=Test-batch
   
   # Get attendance
   GET /api/attendance?batch=Test-batch
   ```

## Expected Output

The script will output:
- ✅ 5 coaches created
- ✅ 5 sections created
- ✅ 25 subjects created (5 per section)
- ✅ 150 students created (30 per section)
- ✅ 150 attendance records created (30 days × 5 sections = one document per class per day)
- ✅ 25 tests created (5 per section)
- ✅ 25 marks documents created (one per test)
- ✅ 3,750 student-mark entries (150 students × 25 tests)

## Notes

- The script automatically creates/updates the batch entry in the `batches` collection
- All data is linked to the first management record found in the database
- Student emails follow the pattern: `firstname.lastname{index}@student.testbatch.edu`
- Phone numbers are generated in Indian format: `+91-XXXXXXXXXX`
- Village names are randomly selected from a predefined list
- Parent names include prefixes (Mr., Mrs., Ms., Dr.)
- Attendance is stored as one document per class per day (not per student per day)
- Marks use ObjectId strings as keys in the nested students object

## Troubleshooting

### Error: "No management found in database"
- Solution: Create a management record first (via the web application or directly in MongoDB)

### Error: "MongoDB connection failed"
- Solution: Check your `.env.local` file and ensure `MONGODB_URI` is correct
- Verify network connectivity to MongoDB
- Check if MongoDB Atlas cluster is running (not paused)
- Ensure your IP is whitelisted in MongoDB Atlas

### Error: "Duplicate key error"
- Solution: The script uses unique ID generation, but if you've run it before, you may need to clean up existing Test-batch data first

### Error: "Coach already exists" or "Section already exists"
- Solution: The script will skip existing records and continue. If you want to start fresh, clean up existing data first.

## Cleanup (if needed)

To remove all Test-batch data:

```javascript
// In MongoDB shell or via script
db.students.deleteMany({ batch: "Test-batch" })
db.coaches.deleteMany({ batch: "Test-batch" })
db.classes.deleteMany({ batch: "Test-batch" })
db.subjects.deleteMany({ batch: "Test-batch" })
db.tests.deleteMany({ batch: "Test-batch" })
db.marks.deleteMany({ batch: "Test-batch" })
db.attendance.deleteMany({ batch: "Test-batch" })
db.batches.deleteOne({ batchName: "Test-batch" })
```

## Testing Checklist

After seeding, verify:

- [ ] All 5 coaches are visible in the coaches page
- [ ] All 5 sections are visible in the classes page
- [ ] All 150 students are visible in the students page (30 per section)
- [ ] Student details include: name, email, phone, village, parent name, parent phone
- [ ] Attendance records show 30 days of data
- [ ] All 5 tests are visible for each section
- [ ] Marks are assigned for all students in all tests
- [ ] Data is correctly filtered by batch "Test-batch"
- [ ] All relationships are correct (coach → section, student → section, test → subject → section)




