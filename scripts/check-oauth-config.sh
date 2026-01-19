#!/bin/bash

# Quick script to verify NextAuth/OAuth environment configuration
# Run this to check if all required env vars are set

echo "🔍 Checking NextAuth Environment Configuration..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

echo "📋 Local Environment Variables (.env):"
echo "-------------------------------------"

# Check NEXTAUTH_URL
if grep -q "NEXTAUTH_URL=" .env; then
    NEXTAUTH_URL=$(grep "NEXTAUTH_URL=" .env | cut -d '=' -f2)
    echo "✅ NEXTAUTH_URL: $NEXTAUTH_URL"
    if [[ "$NEXTAUTH_URL" != "http://localhost:3000" ]]; then
        echo "   ⚠️  WARNING: Local should be http://localhost:3000"
    fi
else
    echo "❌ NEXTAUTH_URL: NOT SET"
fi

# Check NEXTAUTH_SECRET
if grep -q "NEXTAUTH_SECRET=" .env; then
    echo "✅ NEXTAUTH_SECRET: [SET]"
else
    echo "❌ NEXTAUTH_SECRET: NOT SET"
fi

# Check GOOGLE_CLIENT_ID
if grep -q "GOOGLE_CLIENT_ID=" .env; then
    CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" .env | cut -d '=' -f2 | xargs)
    echo "✅ GOOGLE_CLIENT_ID: ${CLIENT_ID:0:20}..."
else
    echo "❌ GOOGLE_CLIENT_ID: NOT SET"
fi

# Check GOOGLE_CLIENT_SECRET
if grep -q "GOOGLE_CLIENT_SECRET=" .env; then
    SECRET=$(grep "GOOGLE_CLIENT_SECRET=" .env | cut -d '=' -f2)
    if [[ "$SECRET" == GOCSPX-* ]]; then
        echo "✅ GOOGLE_CLIENT_SECRET: GOCSPX-... [VALID FORMAT]"
    else
        echo "⚠️  GOOGLE_CLIENT_SECRET: [SET] but doesn't start with GOCSPX-"
    fi
else
    echo "❌ GOOGLE_CLIENT_SECRET: NOT SET"
fi

# Check MONGODB_URI
if grep -q "MONGODB_URI=" .env; then
    echo "✅ MONGODB_URI: [SET]"
else
    echo "❌ MONGODB_URI: NOT SET"
fi

echo ""
echo "📝 Production Environment (Vercel):"
echo "-------------------------------------"
echo "⚠️  Remember to set these in Vercel Dashboard:"
echo ""
echo "   NEXTAUTH_URL=https://app.evaliq.xyz"
echo "   NEXTAUTH_SECRET=[same as local]"
echo "   GOOGLE_CLIENT_ID=[same as local]"
echo "   GOOGLE_CLIENT_SECRET=[NEW secret after revoke]"
echo "   MONGODB_URI=[same as local]"
echo ""
echo "🔗 Vercel Dashboard:"
echo "   https://vercel.com/dashboard → Your Project → Settings → Environment Variables"
echo ""
echo "🔗 Google Cloud Console:"
echo "   https://console.cloud.google.com/apis/credentials"
echo "   Authorized redirect URIs:"
echo "     - https://app.evaliq.xyz/api/auth/callback/google"
echo "     - http://localhost:3000/api/auth/callback/google"
echo ""
