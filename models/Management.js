/**
 * Management Model Schema
 * 
 * @typedef {Object} Management
 * @property {string} _id - MongoDB ObjectId
 * @property {string} managementId - Unique management identifier
 * @property {string} name - Management/organization name
 * @property {string} emailDomain - Email domain (e.g., 'company.com')
 * @property {string} adminId - Reference to admin user ObjectId
 * @property {number} numCoaches - Number of coaches
 * @property {number} numStudents - Number of students
 * @property {string} logo - Logo (base64 or file path/URL)
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

export const ManagementSchema = {
  managementId: String,
  name: String,
  emailDomain: String,
  adminId: String, // MongoDB ObjectId as string
  numCoaches: Number,
  numStudents: Number,
  logo: String,
  createdAt: Date,
  updatedAt: Date,
}

