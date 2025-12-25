# Google OAuth Setup Guide

## Current Redirect URI Configuration

Your app is configured to use the following redirect URI:

**Development (localhost):**
```
http://localhost:3000/api/auth/callback
```

**Production (when deployed):**
```
https://yourdomain.com/api/auth/callback
```

## Step-by-Step Setup Instructions

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select your project: **able-source-477017-n9**
3. Navigate to: **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID: `812161662161-1dfoaaa4qa9lc8489hr23s5esv7cgook.apps.googleusercontent.com`
5. Click **Edit** (pencil icon)

### Step 2: Add Authorized Redirect URIs

In the **Authorized redirect URIs** section, add these EXACT URLs:

#### For Development:
```
http://localhost:3000/api/auth/callback
```

#### For Production (replace with your actual domain):
```
https://yourdomain.com/api/auth/callback
```

### Step 3: Important Notes

⚠️ **Must match exactly:**
- ✅ Same domain (localhost vs yourdomain.com)
- ✅ Same port (3000 for dev)
- ✅ Same protocol (http for localhost, https for production)
- ✅ Same path (`/api/auth/callback`)
- ✅ No trailing slashes
- ✅ No query parameters

### Step 4: Save and Test

1. Click **Save**
2. Wait 1-2 minutes for changes to propagate
3. Test the OAuth flow in your app

## Common Issues

### Issue: "redirect_uri_mismatch" Error

**Solution:** 
- Double-check the redirect URI in Google Console matches EXACTLY what your app sends
- Check the browser console/network tab to see the exact redirect_uri being sent
- Make sure you're using `http://` for localhost (not `https://`)

### Issue: Port Mismatch

**Solution:**
- If your app runs on a different port (e.g., 3001, 5173), add that port to the redirect URI
- Example: `http://localhost:3001/api/auth/callback`

### Issue: Production Domain

**Solution:**
- When deploying, add your production domain to Google Console
- Example: `https://your-app.vercel.app/api/auth/callback`

## Current Configuration

- **Client ID:** `812161662161-1dfoaaa4qa9lc8489hr23s5esv7cgook.apps.googleusercontent.com`
- **Project ID:** `able-source-477017-n9`
- **Callback Route:** `/api/auth/callback`

## Testing

After adding the redirect URI:

1. Start your dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/onboarding`
3. Click "Continue with Google"
4. You should be redirected to Google's consent screen
5. After consent, you'll be redirected back to `/api/auth/callback`
6. Then redirected to `/dashboard`

