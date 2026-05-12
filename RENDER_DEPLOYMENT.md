# Render Deployment Guide

This backend is configured and ready for deployment on [Render](https://render.com/).

## Prerequisites

- MongoDB Atlas account with a connection string
- GitHub account (for OAuth setup, optional)
- Render account

## Step-by-Step Deployment

### 1. Prepare MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create or use an existing database cluster
3. Copy your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/...`)

### 2. Generate JWT Secrets

Run this in your terminal to generate secure random strings:

```bash
node -e "console.log('ACCESS_TOKEN_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('REFRESH_TOKEN_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
```

Save these values - you'll need them in Step 4.

### 3. Setup GitHub OAuth (Optional)

If you want GitHub integration:

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Your app name
   - **Homepage URL**: `https://your-render-frontend-domain.onrender.com`
   - **Authorization callback URL**: `https://your-render-frontend-domain.onrender.com/github-auth`
4. Copy your **Client ID** and **Client Secret**

### 4. Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** and select **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `collaborative-text-editor-backend` (or your choice) |
   | **Environment** | `Node` |
   | **Region** | Choose closest to your users |
   | **Branch** | `main` (or your deployment branch) |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |

5. Click **"Advanced"** and add Environment Variables (see Step 5)

### 5. Add Environment Variables

In the Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=           # Leave empty - Render assigns it automatically
FRONTEND_URL=https://your-netlify-frontend-domain.netlify.app
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
ACCESS_TOKEN_SECRET_KEY=<your-generated-secret-from-step-2>
REFRESH_TOKEN_SECRET_KEY=<your-generated-secret-from-step-2>
GITHUB_CLIENT_ID=<from-step-3>
GITHUB_CLIENT_SECRET=<from-step-3>
GITHUB_REDIRECT_URI=https://your-netlify-frontend-domain.netlify.app/github-auth
```

### 6. Deploy

1. Click **"Create Web Service"**
2. Render will automatically build and deploy your backend
3. Your backend URL will be displayed (e.g., `https://collaborative-text-editor-backend.onrender.com`)

### 7. Update Frontend

Update your frontend's API configuration to use your Render backend URL:

```javascript
// In your frontend API config
const BACKEND_URL = "https://collaborative-text-editor-backend.onrender.com";
```

## Health Check

Your backend includes a health check endpoint:

```
GET https://your-backend-url.onrender.com/_health
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

## Important Notes

### Cold Starts
- Render's free tier services spin down after 15 minutes of inactivity
- First request after inactivity may take 30+ seconds
- Upgrade to Paid plan to avoid cold starts

### Database Connection
- MongoDB connections timeout after prolonged inactivity
- The app gracefully handles reconnections
- Monitor MongoDB Atlas logs if experiencing connection issues

### CORS Configuration
- CORS is configured for production security
- Only whitelisted domains can access your API
- Make sure `FRONTEND_URL` matches your deployed frontend exactly

### Socket.IO
- Configured to work with Render's infrastructure
- Uses both WebSocket and polling transports
- Ensure frontend Socket.IO client is on same version

## Monitoring

### Logs
- View real-time logs in Render dashboard
- Look for startup messages and any connection errors

### Common Issues

**Issue**: `MongoDB connection error`
- **Solution**: Check `MONGO_URI` is correct and cluster allows connections from anywhere

**Issue**: `CORS not allowed`
- **Solution**: Verify `FRONTEND_URL` matches exactly (including http/https and domain)

**Issue**: `Port already in use`
- **Solution**: Should not occur on Render; if it does, redeploy

**Issue**: GitHub OAuth fails
- **Solution**: Check `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_REDIRECT_URI` are correct

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | No | Server port (auto-assigned by Render) | `10000` |
| `FRONTEND_URL` | Yes | Frontend domain for CORS | `https://myapp.netlify.app` |
| `MONGO_URI` | Yes | MongoDB connection string | `mongodb+srv://...` |
| `ACCESS_TOKEN_SECRET_KEY` | Yes | JWT access token secret | `random-hex-string` |
| `REFRESH_TOKEN_SECRET_KEY` | Yes | JWT refresh token secret | `random-hex-string` |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth Client ID | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth Secret | `abc123...` |
| `GITHUB_REDIRECT_URI` | No | GitHub OAuth callback | `https://myapp.netlify.app/github-auth` |

## API Routes

Once deployed, your API will be available at:

- Health Check: `GET /api/health` → `/_health` 
- Auth: `POST /api/auth/login`, `/api/auth/signup`
- Projects: `GET/POST /api/project/`
- Git Operations: `GET/POST /api/git/*`
- GitHub: `GET/POST /api/github/*`

## Deployment Checklist

- [x] Backend code is production-ready
- [ ] MongoDB Atlas cluster created and accessible
- [ ] JWT secrets generated securely
- [ ] GitHub OAuth app created (if needed)
- [ ] Environment variables configured in Render
- [ ] Build and start commands verified
- [ ] FRONTEND_URL environment variable set correctly
- [ ] MONGO_URI environment variable set correctly
- [ ] Backend deployed on Render
- [ ] Health check endpoint responding
- [ ] Frontend updated with backend URL
- [ ] End-to-end testing completed

## Support

For issues:

1. Check Render logs in dashboard
2. Verify all environment variables are set correctly
3. Test health endpoint: `https://your-url.onrender.com/_health`
4. Check MongoDB Atlas connection logs
5. Verify CORS settings if frontend cannot connect

## Next Steps

1. Deploy frontend on Netlify/Vercel
2. Connect frontend to this backend
3. Test authentication flow
4. Test Git operations
5. Monitor logs and performance

---

**Backend Ready for Production** ✅
