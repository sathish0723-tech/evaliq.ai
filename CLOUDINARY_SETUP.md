# Cloudinary Setup Guide

## Environment Variables

Add these to your `.env.local` file:

```env
# Cloudinary Configuration
CLOUDINARY_API_KEY=698225856566394
CLOUDINARY_API_SECRET=Eu8wFm2_qMYGg4dcEr0I7mqspl4
CLOUDINARY_CLOUD_NAME=difauucm4

# Or use the full URL format:
CLOUDINARY_URL=cloudinary://698225856566394:Eu8wFm2_qMYGg4dcEr0I7mqspl4@difauucm4
```

**Note:** The API secret is already configured as a fallback in the code, but it's recommended to add it to `.env.local` for security.

## How It Works

1. **Image Upload Flow:**
   - User selects an image file in the setup form
   - Frontend uploads the image to `/api/upload`
   - Cloudinary processes and stores the image
   - Cloudinary returns a secure URL
   - The URL is stored in the database

2. **API Endpoints:**
   - `POST /api/upload` - Uploads image to Cloudinary
   - Returns: `{ success: true, url: "...", public_id: "..." }`

3. **Storage:**
   - Images are stored in Cloudinary folder: `student-management/logos`
   - Images are automatically optimized (max 800x800, auto quality/format)
   - Secure URLs are stored in MongoDB

## Features

- ✅ Automatic image optimization
- ✅ Secure URL generation
- ✅ File type validation
- ✅ File size validation (max 5MB)
- ✅ Organized folder structure in Cloudinary

## Getting Your API Secret

1. Go to https://cloudinary.com/console
2. Sign in to your account
3. Go to Settings → Security
4. Copy your API Secret
5. Add it to `.env.local` as `CLOUDINARY_API_SECRET`

