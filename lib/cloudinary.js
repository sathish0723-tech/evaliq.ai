import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
// Support both CLOUDINARY_URL and individual environment variables
const apiSecret = process.env.CLOUDINARY_API_SECRET || 'Eu8wFm2_qMYGg4dcEr0I7mqspl4'

if (process.env.CLOUDINARY_URL) {
  // Cloudinary SDK can parse the CLOUDINARY_URL directly
  // But we need to ensure it's properly formatted
  const cloudinaryUrl = process.env.CLOUDINARY_URL
  if (cloudinaryUrl.startsWith('cloudinary://')) {
    cloudinary.config(cloudinaryUrl)
  } else {
    // Fallback to individual config
    cloudinary.config({
      cloud_name: 'difauucm4',
      api_key: '698225856566394',
      api_secret: apiSecret,
    })
  }
} else {
  // Use individual environment variables or defaults
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'difauucm4',
    api_key: process.env.CLOUDINARY_API_KEY || '698225856566394',
    api_secret: apiSecret,
  })
}

// Verify configuration
const config = cloudinary.config()
if (!config.api_secret) {
  console.warn('Cloudinary API secret not configured. Using fallback secret.')
  cloudinary.config({
    ...config,
    api_secret: apiSecret,
  })
}

/**
 * Upload image to Cloudinary
 * @param {Buffer|string} file - File buffer or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with secure_url
 */
export async function uploadToCloudinary(file, options = {}) {
  try {
    const uploadOptions = {
      folder: 'student-management/logos',
      resource_type: 'image',
      ...options,
    }

    // If file is base64 string, use upload method
    if (typeof file === 'string' && file.startsWith('data:')) {
      const result = await cloudinary.uploader.upload(file, uploadOptions)
      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      }
    }

    // If file is buffer, use upload_stream
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      uploadStream.end(file)
    })

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error(`Failed to upload image: ${error.message}`)
  }
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return {
      success: result.result === 'ok',
      result,
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    throw new Error(`Failed to delete image: ${error.message}`)
  }
}

export default cloudinary

