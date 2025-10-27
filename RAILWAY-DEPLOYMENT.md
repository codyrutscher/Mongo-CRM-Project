# 🚂 Railway Deployment Guide

Your React CRM application is **Railway-ready**! Here's everything you need to deploy to Railway.

## ✅ **Pre-Deployment Checklist**

### **✅ Configuration Files Updated**
- ✅ `package.json` - Updated build scripts for React frontend
- ✅ `nixpacks.toml` - Configured for production build
- ✅ `railway.json` - Health check endpoint configured
- ✅ Backend serves React build in production mode
- ✅ Health check endpoint: `/api/health`

### **✅ Build Process Tested**
- ✅ React frontend builds successfully
- ✅ Production build creates optimized files
- ✅ Backend configured to serve React in production

## 🚀 **Deployment Steps**

### **1. Environment Variables**
Make sure these are set in Railway:

**Required:**
```bash
NODE_ENV=production
MONGODB_URI=mongodb://your-mongo-connection-string
PORT=3001  # Railway will override this
```

**Optional (if using integrations):**
```bash
# HubSpot Integration
HUBSPOT_ACCESS_TOKEN=your-hubspot-token
HUBSPOT_WEBHOOK_SECRET=your-webhook-secret

# Google Sheets Integration  
GOOGLE_CLIENT_EMAIL=your-service-account-email
GOOGLE_PRIVATE_KEY=your-service-account-private-key
GOOGLE_PROJECT_ID=your-google-project-id

# Application Settings
BASE_URL=https://your-railway-domain.railway.app
WEBHOOK_SECRET=your-webhook-secret-key
```

### **2. Deploy Process**

**Option A: Connect GitHub Repository (Recommended)**
1. Push your code to GitHub
2. Connect repository in Railway dashboard
3. Railway will automatically:
   - Install backend dependencies (`npm ci`)
   - Install React dependencies (`cd react-frontend && npm install`)
   - Build React app (`npm run build`)
   - Start server in production mode

**Option B: Railway CLI**
```bash
railway login
railway init
railway up
```

### **3. Post-Deployment**

**Verify Deployment:**
- ✅ Health Check: `https://your-app.railway.app/api/health`
- ✅ API Root: `https://your-app.railway.app/api/`
- ✅ Frontend: `https://your-app.railway.app/` (React app)

**Set Webhooks (if using HubSpot):**
- HubSpot Webhook URL: `https://your-app.railway.app/api/webhooks/hubspot`

## 📁 **Production Build Structure**

```
Production Deployment:
├── Server runs on Railway assigned port
├── NODE_ENV=production automatically set
├── React build files served from /react-frontend/build/
├── API endpoints available at /api/*
├── All static files (React) served for /* routes
└── Health check at /api/health
```

## 🔧 **How It Works**

### **Build Process:**
1. Railway runs `npm ci` (install backend deps)
2. Railway runs `npm run build`:
   - Installs React frontend dependencies
   - Builds React app to `react-frontend/build/`
3. Railway starts with `NODE_ENV=production npm start`

### **Production Serving:**
- Backend runs on Railway's assigned port
- All `/api/*` requests → Express API
- All other requests → React app (SPA routing)
- Health check monitoring via `/api/health`

## ⚡ **Performance Optimizations**

**Already Included:**
- ✅ React production build (minified, optimized)
- ✅ Gzip compression enabled
- ✅ Security headers (Helmet.js)
- ✅ Rate limiting on API routes
- ✅ Static file serving optimized

## 🔍 **Troubleshooting**

### **Common Issues:**

**Build Fails:**
- Check that Node.js version is compatible (18.x)
- Verify all dependencies are in package.json
- Check build logs in Railway dashboard

**Frontend Not Loading:**
- Verify `NODE_ENV=production` is set
- Check that React build completed successfully
- Verify backend is serving static files correctly

**API Not Working:**
- Check MongoDB connection string
- Verify environment variables are set
- Check `/api/health` endpoint

**Webhooks Not Working:**
- Update webhook URLs to Railway domain
- Verify webhook secrets match
- Check Railway logs for webhook requests

### **Monitoring:**
```bash
# Check Railway logs
railway logs

# Health check
curl https://your-app.railway.app/api/health

# API status
curl https://your-app.railway.app/api/
```

## 🎯 **Expected Performance**

**Build Time:** ~2-3 minutes
- Backend deps: ~30s
- React deps: ~1-2min  
- React build: ~30s

**Runtime:**
- Cold start: ~2-3s
- Warm requests: <100ms
- Health check: <50ms

## 🚢 **Ready to Deploy!**

Your application is **fully configured** for Railway deployment with:

1. ✅ **Modern React Frontend** - Optimized production build
2. ✅ **Express.js Backend** - API-first architecture  
3. ✅ **MongoDB Integration** - All your data and models
4. ✅ **HubSpot & Google Sheets** - All integrations preserved
5. ✅ **Health Monitoring** - Railway health checks configured
6. ✅ **Security** - Helmet, CORS, rate limiting
7. ✅ **Performance** - Compression, caching, optimization

**Simply connect your repository to Railway and deploy!** 🚂

The deployment will automatically build and serve both your backend API and React frontend from a single Railway service.