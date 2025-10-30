# Push Backend to GitHub - Step by Step

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `skills-factory-backend` (or whatever you prefer)
3. Description: "Backend API for Claude Skills Factory"
4. Choose: **Private** (recommended) or **Public**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **"Create repository"**

## Step 2: Push Your Code

After creating the repo, GitHub will show you commands. Use these:

```bash
cd C:\Users\spder\claude-skills-factory-specs\backend

# Add the GitHub remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Example:**
```bash
git remote add origin https://github.com/sperry-entelech/skills-factory-backend.git
git branch -M main
git push -u origin main
```

## Step 3: Connect to Railway

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Find and select your `skills-factory-backend` repo
5. Railway will auto-detect it's a Node.js project
6. **Important:** Set **Root Directory** to: `.` (current directory) or leave blank

## Step 4: Add Environment Variables

In Railway dashboard:
1. Go to your project
2. Click on the service
3. Go to **"Variables"** tab
4. Add these:
   - `CLAUDE_API_KEY` = `<your-anthropic-api-key>`
   - `PORT` = `3001`
   - `NODE_ENV` = `production`

5. Railway will auto-deploy!

## Step 5: Get Your Backend URL

1. In Railway, go to your service
2. Click **"Settings"**
3. Find **"Network"** section
4. Copy the **"Public Domain"** URL
   - Example: `https://skills-factory-backend-production.up.railway.app`

## Step 6: Update Frontend Environment Variables

Go to Vercel:
1. Skills Factory Frontend: Add `VITE_API_URL` = `https://your-railway-url.railway.app/api`
2. Entelech Platform: Add `NEXT_PUBLIC_SKILLS_FACTORY_URL` = `https://your-railway-url.railway.app/api`

That's it! 🚀

