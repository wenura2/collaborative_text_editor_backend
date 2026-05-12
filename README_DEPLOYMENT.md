# Backend Deployment - Quick Reference

## ✅ What Was Done

Your Node.js + Express backend is now **production-ready** for Render deployment with:

- ✅ Environment variable validation and management
- ✅ Production-grade CORS configuration
- ✅ Secure Socket.IO setup
- ✅ MongoDB connection resilience
- ✅ Graceful shutdown handling
- ✅ Security hardening (removed hardcoded credentials)
- ✅ Enhanced logging and monitoring
- ✅ Health check endpoint for monitoring

## 🚀 Deploy to Render in 5 Minutes

### Step 1: Prepare Environment Variables

```bash
# Generate JWT secrets
node -e "console.log('ACCESS_TOKEN:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('REFRESH_TOKEN:', require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Create Render Web Service

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Set these values:
   - **Name**: `collaborative-text-editor-backend`
   - **Region**: Choose closest to you
   - **Build**: `npm install`
   - **Start**: `npm start`

### Step 3: Add Environment Variables

In Render dashboard → Environment:

```
NODE_ENV=production
FRONTEND_URL=https://your-frontend.netlify.app
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
ACCESS_TOKEN_SECRET_KEY=<your-generated-token>
REFRESH_TOKEN_SECRET_KEY=<your-generated-token>
```

### Step 4: Deploy

Click "Create Web Service" and Render deploys automatically.

### Step 5: Verify

```bash
curl https://your-app.onrender.com/_health
```

Should return:
```json
{
  "status": "ok",
  "environment": "production",
  "mongodb": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `RENDER_DEPLOYMENT.md` | **START HERE** - Complete step-by-step guide |
| `DEPLOYMENT_CHECKLIST.md` | Pre/post deployment verification |
| `PRODUCTION_SETUP.md` | Detailed explanation of all changes |
| `.env.example` | Required environment variables reference |

## 🔑 Environment Variables Required

```
MONGO_URI                   # MongoDB connection string (REQUIRED)
ACCESS_TOKEN_SECRET_KEY     # JWT secret (REQUIRED, generate with node)
REFRESH_TOKEN_SECRET_KEY    # JWT secret (REQUIRED, generate with node)
NODE_ENV                    # "production" or "development"
FRONTEND_URL                # Your frontend domain (e.g., myapp.netlify.app)
GITHUB_CLIENT_ID            # Optional - for GitHub OAuth
GITHUB_CLIENT_SECRET        # Optional - for GitHub OAuth  
GITHUB_REDIRECT_URI         # Optional - GitHub callback URL
```

## 📋 Package.json Scripts

```json
{
  "scripts": {
    "start": "node index.js",     // For production
    "dev": "nodemon index.js"      // For local development
  }
}
```

## 🔍 Changes Made

### 1. Server Configuration
```javascript
// ✅ Dynamic port from environment
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

### 2. Environment Validation
```javascript
// ✅ Fail fast if missing required variables
const requiredEnvVars = ['MONGO_URI', 'ACCESS_TOKEN_SECRET_KEY', 'REFRESH_TOKEN_SECRET_KEY'];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`❌ Missing: ${missing.join(', ')}`);
  process.exit(1);
}
```

### 3. Production CORS
```javascript
// ✅ Secure CORS for production
app.use(cors({
  origin: NODE_ENV === "production" ? ALLOWED_ORIGINS : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  maxAge: 3600
}));
```

### 4. Socket.IO Production
```javascript
// ✅ Works on Render with fallback transports
const io = new Server(server, {
  cors: { origin: NODE_ENV === "production" ? ALLOWED_ORIGINS : true },
  transports: ['websocket', 'polling']
});
```

### 5. Graceful Shutdown
```javascript
// ✅ Handles Render's SIGTERM signal
process.on('SIGTERM', () => {
  console.log('📭 Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(() => process.exit(0));
  });
});
```

### 6. GitHub OAuth Security
```javascript
// ✅ Removed hardcoded credentials
// ❌ BEFORE: client_id: "Ov23liTae4WNJqAamzvi"
// ✅ AFTER: client_id: process.env.GITHUB_CLIENT_ID
```

## 🧪 Test Your Deployment

### Health Check
```bash
curl https://your-backend.onrender.com/_health
```

### Authentication Test
```bash
curl -X POST https://your-backend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Frontend Connection
Update your frontend's API base URL:
```javascript
const API_BASE_URL = "https://your-backend.onrender.com";
```

## ⚡ Performance Tips

1. **Render Free Tier**: Apps spin down after 15 minutes (cold starts)
   - Solution: Upgrade to Paid plan for always-on

2. **MongoDB Connection**: Optimized timeouts for cloud
   - Connection timeout: 10 seconds
   - Socket timeout: 45 seconds

3. **Socket.IO**: Uses WebSocket + Polling
   - Primary: WebSocket (real-time)
   - Fallback: HTTP Polling (always works)

## 🐛 Troubleshooting

### App won't start - "Missing environment variables"
→ Check Render dashboard → Environment tab has all required variables

### "CORS not allowed" errors from frontend  
→ Verify `FRONTEND_URL` matches your frontend domain exactly

### "Cannot connect to MongoDB"
→ Check MongoDB Atlas cluster allows connections + correct `MONGO_URI`

### Health check returns "mongodb": "disconnected"
→ Database connection issue - check MongoDB Atlas connection logs

## 📊 Monitoring

### View Logs
Render Dashboard → Logs (real-time)

### Key Startup Indicators
```
✅ All required environment variables are set
✅ MongoDB connected successfully
🚀 Server running on port 10000
```

### Health Endpoint Response
```javascript
{
  "status": "ok",                    // Service status
  "environment": "production",       // Env mode
  "mongodb": "connected",            // DB status
  "timestamp": "2024-01-01T12:00:00Z" // Check time
}
```

## 🎯 Next Steps

1. **Read**: `RENDER_DEPLOYMENT.md` for detailed guide
2. **Prepare**: Generate JWT secrets and collect MongoDB URI
3. **Configure**: Add all environment variables to Render
4. **Deploy**: Push to GitHub and Render auto-deploys
5. **Test**: Verify health endpoint and API calls work
6. **Connect**: Update frontend to use new backend URL
7. **Monitor**: Watch logs for any issues

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Health Check**: `GET /_health` endpoint
- **Logs**: Check Render dashboard real-time logs
- **MongoDB**: Verify cluster security settings

---

## 🎉 Backend Ready!

Your backend is production-ready. Follow `RENDER_DEPLOYMENT.md` to deploy.

**Status**: ✅ Production Ready  
**Last Updated**: 2024  
**Version**: 1.0.0
