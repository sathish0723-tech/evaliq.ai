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

### Step 2: Configure Authorized JavaScript Origins

In the **Authorized JavaScript origins** section, add these EXACT URLs (NO PATH, just origin):

#### For Development:
```
http://localhost:3000
```

#### For Production:
```
https://evaliq-ai.vercel.app
```

⚠️ **Important:** JavaScript origins must NOT include a path - only `scheme://host:port`

### Step 3: Add Authorized Redirect URIs

In the **Authorized redirect URIs** section, add these EXACT URLs (full path):

#### For Development:
```
http://localhost:3000/api/auth/callback
```

#### For Production:
```
https://evaliq-ai.vercel.app/api/auth/callback
```

⚠️ **Important:** 
- Make sure there's NO whitespace (no spaces before or after)
- Copy-paste the URL exactly as shown above
- The redirect URI should include the full path `/api/auth/callback`

### Step 4: Important Notes

⚠️ **Must match exactly:**
- ✅ Same domain (localhost vs yourdomain.com)
- ✅ Same port (3000 for dev)
- ✅ Same protocol (http for localhost, https for production)
- ✅ Same path (`/api/auth/callback`)
- ✅ No trailing slashes
- ✅ No query parameters

### Step 5: Save and Test

1. Click **Save**
2. Wait 1-2 minutes for changes to propagate
3. Test the OAuth flow in your app

## Environment Variables Setup

### Required Environment Variables

Create a `.env.local` file in your project root with:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=812161662161-1dfoaaa4qa9lc8489hr23s5esv7cgook.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
NEXT_PUBLIC_GOOGLE_CLIENT_ID=812161662161-1dfoaaa4qa9lc8489hr23s5esv7cgook.apps.googleusercontent.com
```

### How to Get Your Client Secret

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select project: **able-source-477017-n9**
3. Find your OAuth 2.0 Client ID: `812161662161-1dfoaaa4qa9lc8489hr23s5esv7cgook`
4. Click on the client ID to view details
5. The **Client secret** will be shown (you may need to click "Show" to reveal it)
6. Copy the client secret and add it to `.env.local` as `GOOGLE_CLIENT_SECRET`

⚠️ **Important:** 
- If you don't see the client secret, it may have been deleted. You'll need to create a new one or reset it.
- The client secret starts with `GOCSPX-`
- Never commit `.env.local` to git (it should be in `.gitignore`)

## Common Issues

### Issue: "OAuth error: Unauthorized"

**Cause:** The client secret is incorrect, missing, or doesn't match the client ID.

**Solution:**
1. Verify your `GOOGLE_CLIENT_SECRET` environment variable is set correctly
2. Get the client secret from Google Cloud Console (see above)
3. Make sure the client ID and secret are from the same OAuth client
4. If the secret was regenerated, update your `.env.local` file
5. Restart your development server after updating environment variables

### Issue: "redirect_uri_mismatch" Error (Error 400)

**This is the most common error!** It means the redirect URI in your request doesn't match what's in Google Cloud Console.

**Step-by-Step Fix:**

1. **Check what redirect URI your app is sending:**
   - Open your browser's Developer Console (F12)
   - Look for the log message: `🔗 OAuth Configuration`
   - Note the exact `Redirect URI` value (e.g., `http://localhost:3000/api/auth/callback`)

2. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Select project: **able-source-477017-n9**
   - Click on OAuth client: **812161662161-1dfoaaa4qa9lc8489hr23s5esv7cgook**
   - Click **Edit** (pencil icon)

3. **Add the EXACT redirect URI:**
   - Scroll to **Authorized redirect URIs**
   - Click **ADD URI**
   - Paste the EXACT redirect URI from step 1 (e.g., `http://localhost:3000/api/auth/callback`)
   - ⚠️ **CRITICAL:** It must match EXACTLY:
     - Same protocol (`http://` for localhost, `https://` for production)
     - Same domain (localhost vs your domain)
     - Same port (3000 or whatever port you're using)
     - Same path (`/api/auth/callback`)
     - NO trailing slash
     - NO extra spaces

4. **Also add JavaScript origin (if not already added):**
   - Scroll to **Authorized JavaScript origins**
   - Click **ADD URI**
   - Add: `http://localhost:3000` (NO path, just origin)
   - For production: `https://evaliq-ai.vercel.app`

5. **Save and wait:**
   - Click **SAVE**
   - Wait 1-2 minutes for changes to propagate
   - Try OAuth login again

**Common Mistakes:**
- ❌ Adding `http://localhost:3000` to redirect URIs (should be `http://localhost:3000/api/auth/callback`)
- ❌ Adding `http://localhost:3000/api/auth/callback` to JavaScript origins (should be `http://localhost:3000`)
- ❌ Using `https://` for localhost (should be `http://`)
- ❌ Adding trailing slash: `http://localhost:3000/api/auth/callback/` (should NOT have trailing slash)
- ❌ Extra spaces before or after the URI

### Issue: Port Mismatch

**Solution:**
- If your app runs on a different port (e.g., 3001, 5173), add that port to the redirect URI
- Example: `http://localhost:3001/api/auth/callback`

### Issue: Production Domain

**Solution:**
- Your production domain is: `https://evaliq-ai.vercel.app`
- Make sure both JavaScript origin and redirect URI are added:
  - JavaScript origin: `https://evaliq-ai.vercel.app`
  - Redirect URI: `https://evaliq-ai.vercel.app/api/auth/callback`
- **Also set environment variables in Vercel:**
  - Go to your Vercel project settings → Environment Variables
  - Add: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  - Redeploy after adding variables

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

