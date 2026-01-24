# Email Setup Guide for Interview Notifications

## 📧 Setting Up Gmail for Sending Emails

Follow these steps to configure Gmail to send interview invitation emails:

### Step 1: Enable 2-Step Verification on Your Gmail Account

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "How you sign in to Google", click **2-Step Verification**
4. Follow the prompts to enable 2-Step Verification

### Step 2: Generate an App Password

1. After enabling 2-Step Verification, go back to **Security**
2. Under "How you sign in to Google", click **App passwords**
   - If you don't see this option, make sure 2-Step Verification is enabled
3. Select **Mail** for the app
4. Select **Other (Custom name)** for the device
5. Enter a name like "Interview System"
6. Click **Generate**
7. **Copy the 16-character password** that appears (e.g., `abcd efgh ijkl mnop`)

### Step 3: Update Your .env.local File

1. Open `/Users/macbookpro/Downloads/open-in-v0 (1)/.env.local`
2. Replace the placeholder values with your actual credentials:

```bash
# EMAIL CONFIGURATION FOR INTERVIEW NOTIFICATIONS
EMAIL_USER=your-actual-email@gmail.com
EMAIL_APP_PASSWORD=abcdefghijklmnop  # Remove spaces from the App Password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Example:**
```bash
EMAIL_USER=john.doe@gmail.com
EMAIL_APP_PASSWORD=abcdefghijklmnop
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Restart Your Development Server

After updating `.env.local`, restart your Next.js server:

1. Stop the current server (Ctrl + C in terminal)
2. Run: `npm run dev`

## 🧪 Testing the Email Functionality

1. Go to http://localhost:3000/interview
2. Click **Schedule Interview**
3. Fill in the form with:
   - **Candidate Name**: Test Candidate
   - **Position**: Test Position
   - **Date**: Future date
   - **Time**: Any time
   - **Email**: YOUR_TEST_EMAIL@gmail.com (use your real email to test)
   - **Interviewer**: Your Name
4. Click **Schedule Interview**
5. Check your email inbox for the interview invitation

## 📧 What the Candidate Will Receive

The candidate will receive a professional HTML email containing:
- Interview details (position, date, time, duration)
- Interviewer name
- **Join Interview** button (links to the Jitsi video meeting)
- Direct meeting link
- Pre-interview checklist
- Contact information

## 🔒 Security Best Practices

1. **Never commit .env.local to Git** - It's already in .gitignore
2. **Use App Passwords** - Never use your actual Gmail password
3. **Rotate App Passwords** - Generate new ones periodically
4. **Limit Access** - Only share credentials with authorized team members

## 🌐 Production Deployment

When deploying to production (e.g., Vercel, Netlify):

1. Add environment variables in your hosting platform:
   - `EMAIL_USER`
   - `EMAIL_APP_PASSWORD`
   - `NEXT_PUBLIC_APP_URL` (set to your production URL)

2. Update the `NEXT_PUBLIC_APP_URL` to your live domain:
   ```bash
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

## 🛠️ Troubleshooting

### Email Not Sending?

1. **Check Console**: Look for error messages in the terminal
2. **Verify Credentials**: Make sure EMAIL_USER and EMAIL_APP_PASSWORD are correct
3. **Check Spam**: Email might be in spam folder
4. **2-Step Verification**: Ensure it's enabled on your Gmail account
5. **App Password**: Make sure you're using an App Password, not your regular password

### Common Errors:

**Error: "Invalid login"**
- Double-check your EMAIL_USER is correct
- Verify you're using an App Password (16 characters, no spaces)
- Ensure 2-Step Verification is enabled

**Error: "self signed certificate"**
- This is usually a network/firewall issue
- Try: `NODE_TLS_REJECT_UNAUTHORIZED=0` (development only!)

**No email received:**
- Check spam/junk folder
- Verify the candidate's email address is correct
- Check your Gmail's "Sent" folder to confirm it was sent

## 📝 Files Modified

1. `/app/api/interview/schedule/route.js` - API endpoint for scheduling
2. `/app/interview/page.js` - Updated to call the API
3. `/.env.local` - Added email configuration
4. `/package.json` - Added nodemailer dependency

## 🚀 Next Steps

Consider adding:
1. Email templates for different scenarios (reschedule, cancellation)
2. Calendar invites (.ics files)
3. SMS notifications using Twilio
4. Interview reminders (24 hours before)
5. Post-interview feedback emails
6. Database storage for interview records

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Check the terminal for API errors
3. Verify all environment variables are set correctly
4. Ensure your internet connection is stable
