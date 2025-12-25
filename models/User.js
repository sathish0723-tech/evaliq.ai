/**
 * User Model Schema
 * 
 * @typedef {Object} User
 * @property {string} _id - MongoDB ObjectId
 * @property {string} googleId - Google OAuth ID
 * @property {string} email - User email (unique)
 * @property {string} name - User full name
 * @property {string} picture - Profile picture URL
 * @property {string} managementId - Reference to management
 * @property {'admin'|'coach'|'student'} role - User role (admin: full access, coach: teaching access, student: limited access)
 * @property {string} emailDomain - Extracted email domain
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

export const UserSchema = {
  googleId: String,
  email: String,
  name: String,
  picture: String,
  managementId: String,
  role: String, // 'admin' | 'coach' | 'student'
  emailDomain: String,
  createdAt: Date,
  updatedAt: Date,
}


