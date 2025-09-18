#!/bin/bash

echo "🚀 Deploying ChatApp to Vercel + Railway"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

echo "📦 Deploying Backend to Railway..."
cd backend
railway login
railway link
railway up
echo "✅ Backend deployed to Railway"

echo "🌐 Deploying Frontend to Vercel..."
cd ../frontend
vercel --prod
echo "✅ Frontend deployed to Vercel"

echo "🎉 Deployment complete!"
echo "📝 Don't forget to:"
echo "   1. Update environment variables in Vercel dashboard"
echo "   2. Update CORS settings in backend"
echo "   3. Set up MongoDB Atlas"
echo "   4. Configure file storage (S3 or Vercel Blob)"
