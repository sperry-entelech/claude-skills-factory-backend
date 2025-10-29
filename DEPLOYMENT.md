# Skills Factory Backend - Deployment Guide

## Deploy to Railway

### Method 1: Railway CLI

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login:
```bash
railway login
```

3. Initialize project:
```bash
cd backend
railway init
```

4. Set environment variables in Railway dashboard:
```
CLAUDE_API_KEY=sk-ant-api03-...
PORT=3001
NODE_ENV=production
DATABASE_PATH=/app/data/skills.db
```

5. Deploy:
```bash
railway up
```

### Method 2: Railway Dashboard (GitHub Integration)

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub repository
5. Select the `backend` directory
6. Add environment variables in Settings:
   - `CLAUDE_API_KEY`
   - `PORT=3001`
   - `NODE_ENV=production`
   - `DATABASE_PATH=/app/data/skills.db`
7. Railway will auto-deploy

## Deploy to Render

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** skills-factory-backend
   - **Root Directory:** backend
   - **Environment:** Node
   - **Build Command:** (leave empty, or `npm install`)
   - **Start Command:** `npm start`
   - **Plan:** Free or Starter ($7/month)

5. Add Environment Variables:
   - `CLAUDE_API_KEY`
   - `PORT=3001`
   - `NODE_ENV=production`
   - `DATABASE_PATH=/tmp/data/skills.db`

6. Click "Create Web Service"

## Post-Deployment

After deployment, you'll get a URL like:
- Railway: `https://your-app.railway.app`
- Render: `https://your-app.onrender.com`

Update Skills Factory frontend to use this URL:
```env
VITE_API_URL=https://your-backend-url.com/api
```

Update Entelech Platform environment:
```env
NEXT_PUBLIC_SKILLS_FACTORY_URL=https://your-backend-url.com/api
```
