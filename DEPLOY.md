# Railway Deployment Guide for ProspereCRM

## 🚀 Quick Deploy to Railway

### 1. **Prepare Repository**
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial ProspereCRM deployment"

# Add Railway remote (you'll get this URL from Railway)
git remote add railway <your-railway-git-url>
```

### 2. **Railway Setup**
1. **Go to:** [railway.app](https://railway.app)
2. **Sign up/Login** with GitHub
3. **Click "Deploy from GitHub repo"**
4. **Select your repo** or connect this folder
5. **Railway will auto-detect** Node.js and deploy

### 3. **Environment Variables in Railway**
Set these in Railway dashboard → Variables:

```env
# MongoDB (use your existing Atlas connection)
MONGODB_URI=your_mongodb_connection_string_here

# HubSpot Configuration  
HUBSPOT_ACCESS_TOKEN=your_hubspot_access_token_here
HUBSPOT_APP_ID=your_hubspot_app_id_here
HUBSPOT_WEBHOOK_SECRET=your_webhook_secret_from_hubspot

# Google Sheets Configuration
GOOGLE_CLIENT_EMAIL=your_google_service_account_email
GOOGLE_PRIVATE_KEY="your_google_private_key_here"
GOOGLE_PROJECT_ID=your_google_project_id

# Production Configuration
NODE_ENV=production
PORT=3000
BASE_URL=https://your-app-name.up.railway.app

# Security
JWT_SECRET=your_secure_jwt_secret_for_production
```

### 4. **Custom Domain (Optional)**
1. **In Railway dashboard** → Settings → Domains
2. **Add custom domain** (e.g., `prospere-crm.yourdomain.com`)
3. **Update BASE_URL** to your custom domain

### 5. **HubSpot Webhook URL**
After deployment, use this webhook URL in HubSpot:
```
https://your-app-name.up.railway.app/api/webhooks/hubspot
```

### 6. **Required HubSpot Scopes**
Add these scopes to your HubSpot app:
- ✅ `crm.objects.contacts.read`
- ✅ `crm.objects.contacts.write` 
- ✅ `crm.lists.read` (for DNC list)
- ✅ `crm.lists.write` (for DNC list)
- ✅ `webhooks` (for real-time sync)

### 7. **Post-Deployment Setup**
Once deployed, initialize segments:
```bash
# SSH into Railway or use Railway CLI
railway shell
node scripts/sync-hubspot-dnc.js
```

## 🎯 **Production Benefits**
- ✅ **Public webhook URL** for real-time HubSpot sync
- ✅ **Always-on server** for continuous sync
- ✅ **SSL/HTTPS** for secure webhooks
- ✅ **Auto-scaling** based on usage
- ✅ **Professional domain** for your client

## 🔧 **Railway CLI (Optional)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

## 📊 **What You'll Get**
After deployment:
1. **Professional CRM URL** for your client
2. **Real-time HubSpot integration** with webhooks
3. **DNC list sync** for compliance
4. **Custom segments and exports**
5. **24/7 uptime** for continuous syncing

**Ready to deploy?** Railway makes it super easy - just push your code and it handles everything! 🚀