# Vercel Deployment Guide for ChatApp

## Overview
This guide covers deploying your ChatApp with file sharing capabilities to Vercel for the frontend and a separate service for the backend.

## Architecture
- **Frontend (Next.js)**: Deploy to Vercel
- **Backend (FastAPI)**: Deploy to Railway, Render, or Heroku
- **Database**: MongoDB Atlas (cloud)
- **File Storage**: Vercel Blob Storage or AWS S3

## Step 1: Prepare Backend for Deployment

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your repository

### 1.2 Configure Backend for Railway
Create `backend/railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 1.3 Update Backend Dependencies
Update `backend/requirements.txt`:
```
fastapi
uvicorn[standard]
pymongo
motor
pydantic[email]
python-dotenv
python-jose[cryptography]
Werkzeug
websockets
python-multipart
Pillow
boto3
```

### 1.4 Add Environment Variables
Create `backend/.env.example`:
```
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
SESSION_SECRET=your-session-secret-here
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=your-bucket-name
```

## Step 2: Deploy Backend to Railway

### 2.1 Deploy Backend
1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Set root directory to `backend`
5. Add environment variables
6. Deploy

### 2.2 Get Backend URL
After deployment, Railway will provide a URL like:
```
https://your-app-name.railway.app
```

## Step 3: Configure Frontend for Vercel

### 3.1 Update API Configuration
Update `frontend/utils/api.ts`:
```typescript
const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL || 'https://your-app-name.railway.app'
  : 'http://localhost:8000';

export default axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 3.2 Update WebSocket Configuration
Update `frontend/hooks/useWebSocket.ts`:
```typescript
const WS_URL = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_WS_URL || 'wss://your-app-name.railway.app'
  : 'ws://localhost:8000';

export function useWebSocket({ url, ...options }: UseWebSocketOptions) {
  const wsUrl = url.startsWith('ws') ? url : `${WS_URL}${url}`;
  // ... rest of the code
}
```

### 3.3 Create Vercel Configuration
Create `vercel.json` in project root:
```json
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://your-app-name.railway.app",
    "NEXT_PUBLIC_WS_URL": "wss://your-app-name.railway.app"
  }
}
```

## Step 4: Deploy to Vercel

### 4.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 4.2 Deploy Frontend
```bash
cd frontend
vercel
```

### 4.3 Configure Environment Variables
In Vercel dashboard:
1. Go to your project settings
2. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: Your Railway backend URL
   - `NEXT_PUBLIC_WS_URL`: Your Railway WebSocket URL

## Step 5: Set Up File Storage

### 5.1 Option A: Vercel Blob Storage
```bash
npm install @vercel/blob
```

Update `backend/app/services/file_service.py`:
```python
from vercel_blob import put
import os

async def save_file_to_vercel(file: UploadFile, file_type: str):
    # Upload to Vercel Blob
    blob = await put(file.filename, file.file, {
        "access": "public",
    })
    
    return {
        "file_id": blob.url,
        "file_url": blob.url,
        "filename": file.filename,
        "file_type": file_type,
        "size": file.size
    }
```

### 5.2 Option B: AWS S3
Update `backend/app/services/file_service.py`:
```python
import boto3
from botocore.exceptions import ClientError

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)

async def save_file_to_s3(file: UploadFile, file_type: str):
    bucket_name = os.getenv('AWS_S3_BUCKET')
    file_key = f"uploads/{file_type}/{file.filename}"
    
    try:
        s3_client.upload_fileobj(file.file, bucket_name, file_key)
        file_url = f"https://{bucket_name}.s3.amazonaws.com/{file_key}"
        
        return {
            "file_id": file_key,
            "file_url": file_url,
            "filename": file.filename,
            "file_type": file_type,
            "size": file.size
        }
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {e}")
```

## Step 6: Database Setup

### 6.1 MongoDB Atlas
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Add to Railway environment variables

### 6.2 Update Database Configuration
Update `backend/app/config.py`:
```python
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.chatapp
```

## Step 7: Final Configuration

### 7.1 Update CORS Settings
Update `backend/app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-app.vercel.app",  # Your Vercel domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 7.2 Test Deployment
1. **Frontend**: Visit your Vercel URL
2. **Backend**: Test API endpoints
3. **File Upload**: Test file sharing
4. **WebSocket**: Test real-time messaging

## Alternative: Deploy Everything to Vercel

### Option 2: Vercel with Serverless Functions

Create `api/upload.js`:
```javascript
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const blob = await put(req.body.filename, req.body.file, {
      access: 'public',
    });

    res.status(200).json({ url: blob.url });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
}
```

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Update CORS settings in backend
2. **WebSocket Issues**: Ensure WebSocket URL is correct
3. **File Upload Fails**: Check file storage configuration
4. **Database Connection**: Verify MongoDB connection string

### Environment Variables Checklist:
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_WS_URL`
- [ ] `MONGODB_URL`
- [ ] `SECRET_KEY`
- [ ] `AWS_ACCESS_KEY_ID` (if using S3)
- [ ] `AWS_SECRET_ACCESS_KEY` (if using S3)
- [ ] `AWS_S3_BUCKET` (if using S3)

## Cost Considerations:
- **Vercel**: Free tier available
- **Railway**: $5/month for hobby plan
- **MongoDB Atlas**: Free tier available
- **AWS S3**: Pay per use (very cheap)

## Security Notes:
1. Use environment variables for secrets
2. Enable HTTPS for all communications
3. Validate file uploads server-side
4. Implement proper authentication
5. Use CORS properly in production

Your ChatApp with file sharing will be live and accessible from anywhere!
