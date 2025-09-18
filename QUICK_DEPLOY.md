# Quick Vercel Deployment Guide

## 🚀 Deploy Your ChatApp in 5 Minutes

### Prerequisites
- GitHub account
- Vercel account (free)
- Railway account (free)

### Step 1: Deploy Backend to Railway

1. **Go to [railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Create new project** → "Deploy from GitHub repo"
4. **Select your repository**
5. **Set root directory to `backend`**
6. **Add environment variables:**
   ```
   SECRET_KEY=your-secret-key-here
   MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
   ```
7. **Deploy!** (Railway will give you a URL like `https://your-app.railway.app`)

### Step 2: Deploy Frontend to Vercel

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up with GitHub**
3. **Import your repository**
4. **Set root directory to `frontend`**
5. **Add environment variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-app.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-app.railway.app
   ```
6. **Deploy!** (Vercel will give you a URL like `https://your-app.vercel.app`)

### Step 3: Update Configuration

1. **Update `vercel.json`** with your Railway backend URL
2. **Update CORS settings** in your backend to allow your Vercel domain
3. **Test your deployment!**

## 🔧 Manual Deployment

### Backend (Railway)
```bash
cd backend
railway login
railway link
railway up
```

### Frontend (Vercel)
```bash
cd frontend
vercel
vercel --prod
```

## 📱 Test Your Deployment

1. **Visit your Vercel URL**
2. **Create two user accounts**
3. **Start a chat between them**
4. **Test file uploads**
5. **Test real-time messaging**

## 🎉 You're Live!

Your ChatApp with file sharing is now accessible from anywhere in the world!

### Features Available:
- ✅ Real-time messaging
- ✅ File uploads (images & documents)
- ✅ Cross-device chat
- ✅ User authentication
- ✅ Organization management

### Next Steps:
- Set up MongoDB Atlas for production database
- Configure file storage (AWS S3 or Vercel Blob)
- Add custom domain
- Implement additional security measures
