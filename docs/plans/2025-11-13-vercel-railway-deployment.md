# Vercel + Railway Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy Compass frontend to Vercel and backend to Railway with automatic deployments from GitHub.

**Architecture:** Two-platform deployment - Express backend on Railway (with PostgreSQL), React SPA on Vercel. Both platforms connected to GitHub for continuous deployment.

**Tech Stack:** Railway (backend hosting), Vercel (frontend hosting), GitHub Actions (optional CI checks), PostgreSQL on Railway

---

## Task 1: Prepare Backend for Railway Deployment

**Files:**
- Create: `backend/.railway.toml` (Railway configuration)
- Create: `backend/Procfile` (Railway process definition)
- Modify: `backend/package.json:8-9` (add production start script)
- Verify: `backend/.env.example` (already exists)

**Step 1: Create Railway configuration file**

Create `backend/.railway.toml`:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npx prisma generate && npm run build"

[deploy]
startCommand = "npx prisma migrate deploy && npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 100
restartPolicyType = "always"
```

**Why:** Railway uses this file to understand how to build and deploy the backend.

**Step 2: Verify build script exists**

Check `backend/package.json` line 8 has: `"build": "tsc"`

Expected: ✅ Script exists (already in package.json)

**Step 3: Verify start script exists**

Check `backend/package.json` line 9 has: `"start": "node dist/index.js"`

Expected: ✅ Script exists (already in package.json)

**Step 4: Test local build**

```bash
cd backend
npm run build
```

Expected: TypeScript compiles successfully, creates `dist/` directory

**Step 5: Test production start locally**

```bash
# In backend directory
NODE_ENV=production npm start
```

Expected: Server starts on configured port (check logs for "🚀 Compass API server running")

Stop the server with Ctrl+C.

**Step 6: Commit Railway configuration**

```bash
git add backend/.railway.toml
git commit -m "feat: add Railway deployment configuration for backend"
```

---

## Task 2: Create Frontend Environment Configuration

**Files:**
- Create: `frontend/.env.production` (production environment variables)
- Create: `frontend/.env.example` (environment variable template)
- Verify: `frontend/src/lib/api.ts:35` (API URL already uses env var)

**Step 1: Create production environment template**

Create `frontend/.env.example`:

```env
# Frontend Environment Variables

# Backend API URL (required)
# Development: http://localhost:3001
# Production: Your Railway backend URL
REACT_APP_API_URL=http://localhost:3001
```

**Why:** Documents required environment variables for future reference.

**Step 2: Verify API client uses environment variable**

Check `frontend/src/lib/api.ts` line 35:

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
```

Expected: ✅ Already configured (verified in file read)

**Step 3: Add .env files to .gitignore**

Verify `frontend/.gitignore` contains:

```
.env.local
.env.production.local
.env
```

Expected: Create React App template should already have this

**Step 4: Commit environment examples**

```bash
git add frontend/.env.example
git commit -m "docs: add frontend environment variable examples"
```

**Note:** Do NOT commit `.env.production` yet - we need the Railway URL first.

---

## Task 3: Prepare Frontend Build for Vercel

**Files:**
- Create: `vercel.json` (Vercel configuration for SPA routing)
- Verify: `frontend/package.json:31` (build script exists)

**Step 1: Create Vercel configuration**

Create `vercel.json` in project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "frontend/build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "dest": "/frontend/build/static/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/build/index.html"
    }
  ],
  "outputDirectory": "frontend/build"
}
```

**Why:** Configures Vercel to:
1. Build only the frontend workspace
2. Serve static assets correctly
3. Handle client-side routing (SPA fallback to index.html)

**Step 2: Test frontend build locally**

```bash
cd frontend
npm run build
```

Expected: Creates `frontend/build/` directory with compiled React app

**Step 3: Verify build output**

```bash
ls -la frontend/build/
```

Expected output includes:
- `index.html`
- `static/` directory (CSS, JS bundles)
- `manifest.json`
- `asset-manifest.json`

**Step 4: Test production build locally**

```bash
# Install serve if not already installed
npm install -g serve

# Serve the production build
serve -s frontend/build -l 3000
```

Open http://localhost:3000 in browser.

Expected: ⚠️ App loads but API calls will fail (backend not running or CORS issue)

Stop the server with Ctrl+C.

**Step 5: Commit Vercel configuration**

```bash
git add vercel.json
git commit -m "feat: add Vercel deployment configuration for frontend"
```

---

## Task 4: Deploy Backend to Railway

**Prerequisites:** Railway account created, GitHub account connected

**Step 1: Push latest code to GitHub**

```bash
# Ensure all commits are pushed
git push origin main
```

Expected: `Everything up-to-date` or successful push

**Step 2: Create new Railway project (via web dashboard)**

Manual steps (web browser):

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account (if first time)
5. Search for and select **"gberges34/compass"** repository
6. Railway will detect the monorepo

**Step 3: Configure backend service**

In Railway dashboard:

1. Click **"Add Service"** → **"GitHub Repo"**
2. Select the compass repository
3. In **"Root Directory"**, enter: `backend`
4. In **"Build Command"**, leave blank (uses .railway.toml)
5. In **"Start Command"**, leave blank (uses .railway.toml)
6. Click **"Deploy"**

**Step 4: Add PostgreSQL database to project**

In Railway dashboard:

1. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway automatically creates a PostgreSQL instance
3. Click on the PostgreSQL service
4. Copy the **"DATABASE_URL"** connection string (in Variables tab)

**Step 5: Configure backend environment variables**

In Railway dashboard, click on your backend service:

1. Go to **"Variables"** tab
2. Click **"New Variable"** and add each:

```
DATABASE_URL = <paste PostgreSQL URL from step 4>
ANTHROPIC_API_KEY = sk-ant-api03-... <your key>
PORT = 3001
NODE_ENV = production
FRONTEND_URL = https://<we'll update this after Vercel deployment>
```

**Optional (if you use Toggl/Timery):**
```
TOGGL_API_TOKEN = <your token>
```

3. Click **"Deploy"** to redeploy with new variables

**Step 6: Wait for deployment and verify**

Monitor the deployment logs in Railway:

Expected logs:
- `Running build command`
- `Running Prisma migrations`
- `🚀 Compass API server running on port 3001`

**Step 7: Get backend public URL**

In Railway dashboard, backend service:

1. Go to **"Settings"** tab
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. Copy the generated URL (e.g., `https://compass-backend-production.up.railway.app`)

**Step 8: Test backend health endpoint**

```bash
curl https://<your-railway-url>/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-13T...",
  "service": "compass-backend"
}
```

**Step 9: Save Railway URL for next task**

Create a temporary note:

```bash
echo "RAILWAY_BACKEND_URL=https://<your-url>" > DEPLOYMENT_URLS.txt
```

---

## Task 5: Deploy Frontend to Vercel

**Prerequisites:** Vercel account created, GitHub account connected, Railway backend URL from Task 4

**Step 1: Create production environment file locally**

Create `frontend/.env.production`:

```env
# Production Backend URL
REACT_APP_API_URL=https://<your-railway-url-from-task-4>
```

**Important:** Replace `<your-railway-url-from-task-4>` with actual Railway URL.

**Step 2: Commit production environment (optional)**

**Security decision:**

**Option A (Less secure, easier):** Commit `.env.production` to repo
```bash
git add frontend/.env.production
git commit -m "feat: add production environment configuration"
git push origin main
```

**Option B (More secure, recommended):** Configure in Vercel dashboard only
- Don't commit `.env.production`
- Add env var manually in Vercel (Step 5 below)

Choose option B for this guide (more secure).

**Step 3: Create new Vercel project (via web dashboard)**

Manual steps (web browser):

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Find and select **"gberges34/compass"** repository
5. Click **"Import"**

**Step 4: Configure Vercel project settings**

In the project configuration screen:

1. **Framework Preset:** Vercel should auto-detect **"Create React App"** ✅
2. **Root Directory:** Click **"Edit"** → Select **"frontend"** → Click **"Continue"**
3. **Build Command:** `npm run build` (should be auto-filled)
4. **Output Directory:** `build` (should be auto-filled)
5. **Install Command:** `npm install` (should be auto-filled)

**Step 5: Add environment variables**

Still in configuration screen:

1. Scroll to **"Environment Variables"**
2. Click **"Add"**
3. Enter:
   - **Key:** `REACT_APP_API_URL`
   - **Value:** `https://<your-railway-backend-url>` (from Task 4, Step 9)
   - **Environments:** Check ✅ Production, ✅ Preview, ✅ Development
4. Click **"Add"**

**Step 6: Deploy**

1. Click **"Deploy"** button
2. Wait for deployment (watch build logs)

Expected logs:
- `Running install command`
- `Running build command`
- `Build completed`
- `Deployment ready`

**Step 7: Get frontend public URL**

After deployment completes:

1. Vercel shows your deployed site URL (e.g., `https://compass-abc123.vercel.app`)
2. Click **"Visit"** to open in browser
3. Copy the URL

**Step 8: Test frontend**

Open the Vercel URL in browser:

Expected: ⚠️ App loads but some features may not work due to CORS

Check browser console for errors:
```
Access to XMLHttpRequest at 'https://...' from origin 'https://compass-abc123.vercel.app'
has been blocked by CORS policy
```

This is expected - we'll fix CORS in Task 6.

**Step 9: Save Vercel URL**

```bash
echo "VERCEL_FRONTEND_URL=https://<your-vercel-url>" >> DEPLOYMENT_URLS.txt
```

---

## Task 6: Configure CORS for Production

**Files:**
- Modify: Backend environment variables in Railway dashboard

**Step 1: Update Railway backend FRONTEND_URL**

In Railway dashboard:

1. Navigate to your backend service
2. Go to **"Variables"** tab
3. Find **"FRONTEND_URL"** variable
4. Update value to: `https://<your-vercel-url-from-task-5>`
5. Click **"Save"**
6. Railway automatically redeploys

**Step 2: Wait for Railway redeployment**

Monitor logs for:
- `🚀 Compass API server running on port 3001`

**Step 3: Test CORS from frontend**

Open Vercel frontend URL in browser:

1. Open browser DevTools → Console
2. Navigate through the app
3. Try to fetch tasks or other data

Expected: ✅ No CORS errors, API calls succeed

**Step 4: Verify end-to-end functionality**

Test critical user flows:

1. **Tasks page:** Can view tasks
2. **Create task:** Modal opens, can create task
3. **Orient page:** Can view daily plan
4. **Reviews page:** Can view reviews

Expected: ✅ All features work correctly

---

## Task 7: Configure Automatic Deployments

**Goal:** Ensure both platforms auto-deploy when code is pushed to GitHub

**Step 1: Verify Railway auto-deployment**

In Railway dashboard, backend service:

1. Go to **"Settings"** tab
2. Scroll to **"Builds"** section
3. Verify **"Deploy on Push"** is enabled ✅

Expected: ✅ Already enabled by default

**Step 2: Verify Vercel auto-deployment**

In Vercel dashboard, project:

1. Go to **"Settings"** → **"Git"**
2. Verify **"Production Branch"** is set to `main` ✅
3. Verify **"Deploy Hooks"** shows GitHub connected ✅

Expected: ✅ Already enabled by default

**Step 3: Test automatic deployment**

Make a trivial change to trigger deployment:

```bash
# Add a comment to trigger rebuild
echo "# Deployment test" >> README.md
git add README.md
git commit -m "test: trigger automatic deployment"
git push origin main
```

**Step 4: Monitor deployments**

Watch both dashboards:

1. **Railway:** Should show new deployment starting
2. **Vercel:** Should show new deployment starting

Expected: Both platforms automatically detect the push and deploy

**Step 5: Verify deployments complete**

Wait for both deployments:

1. Railway: Check logs for `🚀 Compass API server running`
2. Vercel: Check for `Deployment ready`

**Step 6: Verify app still works**

Open Vercel frontend URL and test basic functionality.

Expected: ✅ App works correctly

---

## Task 8: Document Deployment URLs and Process

**Files:**
- Create: `docs/DEPLOYMENT.md` (deployment documentation)
- Modify: `README.md` (add deployment section)

**Step 1: Create deployment documentation**

Create `docs/DEPLOYMENT.md`:

```markdown
# Deployment Guide

## Architecture

**Frontend:** Vercel (Static Site)
- Repository: https://github.com/gberges34/compass
- Platform: Vercel
- URL: https://<your-vercel-url>
- Auto-deploys from: `main` branch

**Backend:** Railway (Express API)
- Repository: https://github.com/gberges34/compass
- Platform: Railway
- URL: https://<your-railway-url>
- Auto-deploys from: `main` branch

**Database:** Railway PostgreSQL
- Platform: Railway
- Connected to: Backend service

## Deployment Process

### Automatic Deployments

Both frontend and backend automatically deploy when code is pushed to `main`:

```bash
git push origin main
```

- **Vercel** detects the push and rebuilds the frontend
- **Railway** detects the push and rebuilds the backend

### Manual Deployments

**Backend (Railway):**
1. Go to Railway dashboard
2. Select backend service
3. Click "Deployments" → "Redeploy"

**Frontend (Vercel):**
1. Go to Vercel dashboard
2. Select compass project
3. Click "Deployments" → latest deployment → "Redeploy"

## Environment Variables

### Backend (Railway)

Required:
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Railway)
- `ANTHROPIC_API_KEY` - Claude API key
- `FRONTEND_URL` - Vercel frontend URL (for CORS)
- `PORT` - 3001
- `NODE_ENV` - production

Optional:
- `TOGGL_API_TOKEN` - Timery/Toggl integration

### Frontend (Vercel)

Required:
- `REACT_APP_API_URL` - Railway backend URL

## Database Migrations

**Railway automatically runs migrations on deploy** via `.railway.toml`:

```bash
npx prisma migrate deploy
```

To create new migrations locally:

```bash
cd backend
npx prisma migrate dev --name migration_name
git add prisma/migrations/
git commit -m "feat: add migration_name migration"
git push origin main
```

Railway will apply the new migration automatically.

## Monitoring

### Health Checks

**Backend health:**
```bash
curl https://<railway-url>/api/health
```

Expected: `{"status":"ok","timestamp":"...","service":"compass-backend"}`

**Frontend health:**
Open `https://<vercel-url>` in browser

### Logs

**Backend logs:**
- Railway dashboard → Backend service → "Logs"

**Frontend logs:**
- Vercel dashboard → Project → Deployment → "Logs"
- Browser console for client-side errors

## Rollback

### Backend Rollback (Railway)

1. Go to Railway dashboard → Backend service
2. Click "Deployments"
3. Find previous successful deployment
4. Click "..." → "Redeploy"

### Frontend Rollback (Vercel)

1. Go to Vercel dashboard → Project
2. Click "Deployments"
3. Find previous successful deployment
4. Click "..." → "Promote to Production"

## Troubleshooting

### CORS Errors

If frontend shows CORS errors:

1. Verify `FRONTEND_URL` in Railway backend matches Vercel URL exactly
2. Check Railway backend logs for CORS middleware initialization
3. Verify frontend is using correct `REACT_APP_API_URL`

### Database Connection Errors

If backend shows database errors:

1. Verify `DATABASE_URL` is set in Railway backend variables
2. Check PostgreSQL service is running in Railway
3. Verify database migrations completed (check deployment logs)

### Build Failures

**Backend (Railway):**
- Check build logs for TypeScript errors
- Verify `package.json` scripts are correct
- Ensure Prisma generates successfully

**Frontend (Vercel):**
- Check build logs for compilation errors
- Verify environment variables are set
- Check `vercel.json` configuration is valid
```

**Replace placeholders:**
- `<your-vercel-url>` → Actual Vercel URL
- `<your-railway-url>` → Actual Railway URL

**Step 2: Update main README**

Add to `README.md` after the "Development Commands" section:

```markdown
## Production Deployment

**Live URLs:**
- Frontend: https://<your-vercel-url>
- Backend API: https://<your-railway-url>
- Documentation: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

Both frontend and backend automatically deploy from the `main` branch.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment information.
```

**Replace placeholders** with actual URLs.

**Step 3: Commit documentation**

```bash
git add docs/DEPLOYMENT.md README.md
git commit -m "docs: add deployment guide and production URLs"
```

**Step 4: Remove temporary deployment notes**

```bash
rm DEPLOYMENT_URLS.txt
```

**Step 5: Push final documentation**

```bash
git push origin main
```

Wait for auto-deployments to complete.

---

## Task 9: Set Up Preview Deployments (Optional but Recommended)

**Goal:** Enable preview deployments for pull requests and feature branches

**Step 1: Configure Vercel preview deployments**

In Vercel dashboard:

1. Go to project **"Settings"** → **"Git"**
2. Under **"Preview Deployments"**, verify:
   - ✅ "Enable Automatic Previews for Pull Requests"
   - ✅ "Enable Automatic Previews for Branches"
3. Leave **"Production Branch"** as `main`

Expected: ✅ Already enabled by default

**Step 2: Configure Railway preview environments (optional)**

Railway free tier may not support PR environments. Skip if not available.

If available:
1. Go to Railway backend service → **"Settings"**
2. Enable **"PR Deploys"**

**Step 3: Test preview deployment**

Create a test branch and PR:

```bash
git checkout -b test-preview-deployment
echo "# Testing preview deployments" >> README.md
git add README.md
git commit -m "test: preview deployment"
git push origin test-preview-deployment
```

**Step 4: Create pull request**

On GitHub:
1. Go to https://github.com/gberges34/compass
2. Click **"Pull requests"** → **"New pull request"**
3. Base: `main`, Compare: `test-preview-deployment`
4. Click **"Create pull request"**

**Step 5: Verify Vercel preview deployment**

In the PR:
1. Look for **Vercel bot comment** with preview URL
2. Click the preview URL
3. Verify app loads

Expected: ✅ Preview deployment works (but may show errors if Railway doesn't have PR deploys)

**Step 6: Clean up test PR**

1. Close the PR without merging
2. Delete branch:

```bash
git checkout main
git branch -D test-preview-deployment
git push origin --delete test-preview-deployment
```

---

## Task 10: Verification and Final Testing

**Goal:** Comprehensive verification of production deployment

**Step 1: Test all critical user flows in production**

Open Vercel frontend URL and test:

**Tasks:**
- [ ] View tasks list
- [ ] Create new task
- [ ] Edit task
- [ ] Delete task
- [ ] Schedule task on calendar
- [ ] Complete task with post-do log

**Todoist Integration:**
- [ ] View pending tasks
- [ ] Import task from Todoist
- [ ] Enrich task with AI

**Orient (Daily Planning):**
- [ ] View today's plan
- [ ] Create Orient East (morning plan)
- [ ] Update Orient West (evening reflection)

**Reviews:**
- [ ] View daily reviews
- [ ] View weekly reviews
- [ ] Generate new daily review
- [ ] Generate new weekly review

**Calendar:**
- [ ] View scheduled tasks
- [ ] Drag-and-drop to reschedule

Expected: ✅ All flows work without errors

**Step 2: Verify API performance**

Check browser DevTools → Network tab:

- API response times < 1s for most requests
- No 4xx or 5xx errors
- Proper caching headers (see values in `backend/src/index.ts:45-73`)

Expected: ✅ Good performance, proper caching

**Step 3: Verify database persistence**

1. Create a task in production
2. Refresh the page
3. Verify task is still there

Expected: ✅ Data persists across page reloads

**Step 4: Test mobile responsiveness**

Open Vercel URL on mobile device or use browser DevTools device emulation:

- App layout adjusts to mobile
- Navigation works
- Modals display correctly
- Calendar is usable

Expected: ✅ App is mobile-friendly (Tailwind responsive classes)

**Step 5: Check for console errors**

Open browser DevTools → Console:

Expected: ✅ No errors (warnings are okay)

**Step 6: Verify automatic deployments work**

Make a trivial change:

```bash
# Update a comment
echo "<!-- Deployment verified $(date) -->" >> frontend/public/index.html
git add frontend/public/index.html
git commit -m "test: verify automatic deployment"
git push origin main
```

Watch both dashboards deploy automatically.

Expected: ✅ Both platforms deploy within 2-3 minutes

**Step 7: Verify app still works after auto-deploy**

After deployments complete, test app again.

Expected: ✅ App works correctly

**Step 8: Document production URLs in secure location**

Save these URLs somewhere safe (password manager, notes):

```
Production Frontend: https://<vercel-url>
Production Backend: https://<railway-url>
Railway Dashboard: https://railway.app/project/<project-id>
Vercel Dashboard: https://vercel.com/<username>/compass
```

**Step 9: Final commit**

```bash
git add .
git commit -m "chore: complete Vercel + Railway deployment setup"
git push origin main
```

---

## Success Criteria

✅ **Backend deployed to Railway:**
- Express API running on Railway
- Connected to PostgreSQL database
- Health endpoint returns 200
- Environment variables configured
- Auto-deploys from `main` branch

✅ **Frontend deployed to Vercel:**
- React app accessible via Vercel URL
- Connected to Railway backend API
- No CORS errors
- Auto-deploys from `main` branch

✅ **CORS configured correctly:**
- Frontend can call backend APIs
- No console errors

✅ **Automatic deployments working:**
- Push to `main` triggers both deployments
- Deployments complete successfully

✅ **Documentation complete:**
- `docs/DEPLOYMENT.md` created with full guide
- `README.md` updated with production URLs
- Environment variable examples documented

✅ **All features working in production:**
- Tasks CRUD operations
- Todoist integration + AI enrichment
- Orient East/West planning
- Reviews generation
- Calendar scheduling

---

## Rollback Plan

If deployment fails or causes issues:

**Backend Rollback:**
1. Railway dashboard → Backend service → Deployments
2. Find last working deployment
3. Click "Redeploy"

**Frontend Rollback:**
1. Vercel dashboard → Project → Deployments
2. Find last working deployment
3. Click "Promote to Production"

**Emergency Rollback (both):**
```bash
git revert <commit-hash>
git push origin main
```

Both platforms will auto-deploy the reverted code.

---

## Post-Deployment Checklist

After completing all tasks:

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] CORS configured correctly
- [ ] Database connected and migrations applied
- [ ] All environment variables set
- [ ] Automatic deployments tested
- [ ] Documentation complete
- [ ] All user flows tested in production
- [ ] Mobile responsiveness verified
- [ ] No console errors in production
- [ ] Preview deployments configured (optional)
- [ ] Production URLs saved securely

---

## Next Steps (Future Enhancements)

After basic deployment is working:

1. **Custom domains:**
   - Configure custom domain in Vercel (e.g., `compass.yourdomain.com`)
   - Configure custom domain in Railway (e.g., `api.compass.yourdomain.com`)
   - Update CORS and environment variables

2. **Monitoring and alerts:**
   - Set up Vercel Analytics
   - Configure Railway monitoring alerts
   - Add error tracking (e.g., Sentry)

3. **Performance optimization:**
   - Enable Vercel Edge Network
   - Configure Railway autoscaling (if available)
   - Add Redis caching layer

4. **CI/CD enhancements:**
   - Add GitHub Actions for tests before deploy
   - Add type checking in CI
   - Add database migration checks

5. **Security hardening:**
   - Add rate limiting to backend
   - Configure CSP headers
   - Add API authentication/authorization
