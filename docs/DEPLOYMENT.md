# Deployment Guide

## Architecture

**Frontend:** Vercel (Static Site)
- Repository: https://github.com/gberges34/compass
- Platform: Vercel
- URL: https://compass-wt6j.vercel.app
- Auto-deploys from: `main` branch

**Backend:** Railway (Express API)
- Repository: https://github.com/gberges34/compass
- Platform: Railway
- URL: https://compass-production-1795.up.railway.app
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
- `API_SECRET` - API authentication secret (must match frontend client secrets)
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
curl https://compass-production-1795.up.railway.app/api/health
```

Expected: `{"status":"ok","timestamp":"...","service":"compass-backend"}`

**Frontend health:**
Open `https://compass-wt6j.vercel.app` in browser

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

## Configuration Files

### Railway Configuration (`.railway.toml`)

Located in `backend/.railway.toml`:

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

### Vercel Configuration (`vercel.json`)

Located in project root:

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

## Preview Deployments

**Vercel Preview Deployments:**
- Enabled for all pull requests
- Each PR gets a unique preview URL
- Automatically deployed when PR is opened or updated

**Railway PR Environments:**
- May be limited on free tier
- Check Railway dashboard for availability

## Security Considerations

1. **Environment Variables:** Never commit sensitive values to git
2. **CORS:** Restricted to specific frontend URL
3. **API Keys:** Stored securely in platform dashboards
4. **Database:** Access restricted to Railway backend service

## Production URLs

**Live Application:**
- Frontend: https://compass-wt6j.vercel.app
- Backend API: https://compass-production-1795.up.railway.app

**Dashboards:**
- Railway: https://railway.app
- Vercel: https://vercel.com
- GitHub: https://github.com/gberges34/compass

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
