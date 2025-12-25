# Vercel Environment Variables Setup Guide

## 🔴 Critical: MongoDB Connection in Production

Your app requires `MONGODB_URI` to be set in Vercel. Without it, all API routes will fail with "Unauthorized" errors.

---

## ✅ Step-by-Step Setup

### 1. Get Your MongoDB Connection String

From your local `.env.local` file, copy your `MONGODB_URI`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
```

**⚠️ Important:**
- URL encode special characters in password:
  - `@` → `%40`
  - `!` → `%21`
  - `#` → `%23`
  - `$` → `%24`
  - `%` → `%25`
  - `&` → `%26`
  - `*` → `%2A`
  - `+` → `%2B`
  - `=` → `%3D`
  - `?` → `%3F`

### 2. Add Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **evaliq.ai**
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://username:encoded_password@cluster.mongodb.net/dbname` | Production, Preview, Development |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID | Production, Preview, Development |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret | Production, Preview, Development |

### 3. MongoDB Atlas Network Access

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to **Network Access**
3. Click **Add IP Address**
4. For development/testing, add: `0.0.0.0/0` (allows all IPs)
5. For production, add Vercel's IP ranges (see below)

**Vercel IP Ranges:**
```
76.76.21.0/24
76.223.126.0/24
```

Or use `0.0.0.0/0` for simplicity (less secure but works for all deployments).

### 4. MongoDB User Permissions

1. Go to **Database Access** in MongoDB Atlas
2. Verify your user has:
   - **Read and write to any database** (recommended)
   - Or at least access to your specific database

### 5. Redeploy After Adding Variables

**⚠️ CRITICAL:** Environment variables only apply after redeployment!

1. In Vercel Dashboard → **Deployments**
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Or trigger a new deployment by pushing to GitHub

---

## 🔍 Troubleshooting

### Error: `{"error":"Unauthorized"}`

**Possible causes:**
1. ❌ `MONGODB_URI` not set in Vercel
2. ❌ MongoDB connection failing (check Vercel logs)
3. ❌ IP not whitelisted in MongoDB Atlas
4. ❌ User doesn't have proper permissions
5. ❌ Password not URL-encoded

### Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → **Logs**
2. Look for MongoDB connection errors
3. Check for: `MongoDB connection error` or `MONGODB_URI not defined`

### Test MongoDB Connection

Add this temporary debug endpoint to test:

```js
// app/api/test-db/route.js
import clientPromise from '@/lib/db/connection'

export async function GET() {
  try {
    const client = await clientPromise
    await client.db().admin().ping()
    return Response.json({ success: true, message: 'MongoDB connected' })
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message,
      hasEnv: !!process.env.MONGODB_URI 
    }, { status: 500 })
  }
}
```

Visit: `https://yourdomain.com/api/test-db`

---

## ✅ Verification Checklist

- [ ] `MONGODB_URI` added in Vercel (all environments)
- [ ] Password is URL-encoded
- [ ] MongoDB Atlas IP whitelist configured
- [ ] MongoDB user has read/write permissions
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` added (if using OAuth)
- [ ] `GOOGLE_CLIENT_SECRET` added (if using OAuth)
- [ ] Project redeployed after adding variables
- [ ] Tested connection with `/api/test-db` endpoint

---

## 📝 Example Environment Variables

```env
# Production
MONGODB_URI=mongodb+srv://myuser:MyP%40ssw0rd%21@cluster0.xxxxx.mongodb.net/student_management?retryWrites=true&w=majority
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## 🚨 Common Mistakes

1. **Forgetting to redeploy** - Variables don't apply until redeploy
2. **Not URL-encoding password** - Special characters break connection
3. **Wrong environment** - Make sure variables are set for "Production"
4. **IP not whitelisted** - MongoDB blocks unknown IPs
5. **Copying with quotes** - Don't include quotes in Vercel UI

---

## 📞 Need Help?

If still getting errors:
1. Check Vercel function logs
2. Verify MongoDB Atlas cluster is running
3. Test connection string in MongoDB Compass
4. Check network access settings

