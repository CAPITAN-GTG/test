# Deployment Guide

## Current Status
- ✅ **Next.js App**: Deployed to Vercel at https://test-delta-indol-99.vercel.app/
- ⏳ **WebSocket Server**: Ready to deploy to Railway

## Step 1: Deploy WebSocket Server to Railway

### Option A: Using Railway CLI (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy from the test directory
cd test
railway deploy
```

### Option B: Using Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect the Node.js app

## Step 2: Get Railway WebSocket URL
After deployment, Railway will give you a URL like:
- `https://your-app-name.railway.app`

Convert it to WebSocket URL:
- `wss://your-app-name.railway.app`

## Step 3: Update Vercel Environment Variables
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   - **Name**: `NEXT_PUBLIC_WS_URL`
   - **Value**: `wss://your-railway-app.railway.app`
   - **Environment**: Production

## Step 4: Redeploy Vercel
```bash
# Trigger a new deployment
git commit --allow-empty -m "Update WebSocket URL"
git push
```

## Alternative: Deploy to Render
If Railway doesn't work, try Render:

1. Go to [render.com](https://render.com)
2. Connect GitHub account
3. Create "Web Service"
4. Select your repository
5. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node

## Testing
1. Visit your Vercel app: https://test-delta-indol-99.vercel.app/
2. Go to Mouse Room
3. Connect to a room
4. Open another browser window/tab
5. Join the same room
6. Move your mouse - you should see real-time cursor sharing!

## Troubleshooting
- **WebSocket connection fails**: Check the Railway URL is correct
- **CORS errors**: Railway handles CORS automatically
- **Connection timeout**: Check Railway logs for errors
- **Environment variables**: Make sure `NEXT_PUBLIC_WS_URL` is set in Vercel
