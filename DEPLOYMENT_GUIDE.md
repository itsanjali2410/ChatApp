# ChatApp Deployment Guide

This guide will help you deploy the ChatApp for external testing with document and image sharing capabilities.

## Features Added

✅ **File Upload Support**
- Images (JPEG, PNG, GIF, WebP) - max 5MB
- Documents (PDF, DOC, DOCX, TXT, XLS, XLSX) - max 10MB
- Automatic thumbnail generation for images
- Drag & drop file upload interface

✅ **Real-time Messaging**
- WebSocket connections for instant messaging
- Typing indicators
- Message status updates

✅ **Multi-device Testing**
- Cross-device chat functionality
- File sharing between devices
- Real-time synchronization

## Quick Start (Local Testing)

### 1. Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Start the Servers

**Backend (Terminal 1):**
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```

### 3. Access the Application

- **Local:** http://localhost:3000
- **Network:** http://YOUR_IP_ADDRESS:3000

## External Testing Setup

### Option 1: Local Network Testing

1. **Find your computer's IP address:**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. **Configure firewall:**
   - Allow Python (port 8000) through Windows Firewall
   - Allow Node.js (port 3000) through Windows Firewall

3. **Access from other devices:**
   - Connect devices to the same WiFi network
   - Open `http://YOUR_IP:3000` on other devices

### Option 2: Cloud Deployment (Recommended for External Testing)

#### Using Heroku (Free Tier)

1. **Prepare for Heroku:**
   ```bash
   # Create Procfile in backend/
   echo "web: uvicorn app.main:app --host 0.0.0.0 --port \$PORT" > backend/Procfile
   
   # Create runtime.txt
   echo "python-3.11.0" > backend/runtime.txt
   ```

2. **Deploy Backend:**
   ```bash
   cd backend
   heroku create your-chatapp-backend
   git add .
   git commit -m "Deploy backend"
   git push heroku main
   ```

3. **Deploy Frontend:**
   ```bash
   cd frontend
   # Update API URL in utils/api.ts to your Heroku URL
   npm run build
   # Deploy to Vercel, Netlify, or similar
   ```

#### Using Railway (Alternative)

1. **Backend:**
   - Connect GitHub repository
   - Set root directory to `backend`
   - Deploy automatically

2. **Frontend:**
   - Connect GitHub repository
   - Set root directory to `frontend`
   - Deploy automatically

### Option 3: Using ngrok (Quick External Access)

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Expose your local server:**
   ```bash
   # Expose frontend
   ngrok http 3000
   
   # In another terminal, expose backend
   ngrok http 8000
   ```

3. **Update API configuration:**
   - Update `frontend/utils/api.ts` with ngrok backend URL
   - Share ngrok frontend URL with testers

## Testing Checklist

### Basic Functionality
- [ ] User registration and login
- [ ] Creating and joining chats
- [ ] Sending text messages
- [ ] Real-time message delivery
- [ ] Typing indicators

### File Sharing
- [ ] Upload images (JPEG, PNG, GIF, WebP)
- [ ] Upload documents (PDF, DOC, DOCX, TXT, XLS, XLSX)
- [ ] View image thumbnails
- [ ] Download documents
- [ ] File size validation (5MB images, 10MB documents)

### Multi-device Testing
- [ ] Chat between two different devices
- [ ] File sharing between devices
- [ ] Real-time synchronization
- [ ] WebSocket connections work across devices

## Configuration for External Access

### Backend Configuration

1. **Update CORS settings in `backend/app/main.py`:**
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # Change to specific domains in production
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. **Environment variables:**
   ```bash
   # Create .env file in backend/
   SECRET_KEY=your-secret-key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   SESSION_SECRET=your-session-secret
   ```

### Frontend Configuration

1. **Update API URL in `frontend/utils/api.ts`:**
   ```typescript
   const API_URL = process.env.NODE_ENV === 'production' 
     ? 'https://your-backend-url.com' 
     : 'http://localhost:8000';
   ```

## Security Considerations

1. **File Upload Security:**
   - File type validation
   - File size limits
   - Virus scanning (recommended for production)

2. **Authentication:**
   - JWT token expiration
   - Secure cookie settings
   - HTTPS in production

3. **CORS Configuration:**
   - Restrict origins in production
   - Validate file uploads server-side

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed:**
   - Check firewall settings
   - Ensure WebSocket is enabled
   - Verify CORS configuration

2. **File Upload Fails:**
   - Check file size limits
   - Verify file type is supported
   - Check server logs for errors

3. **Cross-device Access Issues:**
   - Ensure devices are on same network
   - Check IP address configuration
   - Verify firewall settings

### Debug Mode

Enable debug logging:
```bash
# Backend
export DEBUG=1
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
npm run dev -- --debug
```

## Production Deployment

For production deployment, consider:

1. **Database:** Use MongoDB Atlas or similar cloud database
2. **File Storage:** Use AWS S3, Google Cloud Storage, or similar
3. **CDN:** Use CloudFlare or similar for static file delivery
4. **Monitoring:** Add logging and monitoring services
5. **Security:** Implement proper authentication and authorization
6. **SSL:** Use HTTPS for all communications

## Support

If you encounter issues:
1. Check the console logs in browser developer tools
2. Check server logs in terminal
3. Verify network connectivity
4. Ensure all dependencies are installed correctly
