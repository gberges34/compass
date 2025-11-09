# Railway Database Setup Guide

Follow these steps to set up your PostgreSQL database on Railway:

## Step 1: Login to Railway CLI

```bash
cd ~/compass/backend
railway login
```

This will open your browser. Authorize the CLI with your Railway account.

## Step 2: Initialize Railway Project

```bash
railway init
```

When prompted:
- Enter project name: `compass-backend`
- Select "Create new project"

## Step 3: Add PostgreSQL Database

```bash
railway add --database postgresql
```

This will provision a PostgreSQL database for your project.

## Step 4: Link Local Environment

```bash
railway link
```

Select your `compass-backend` project when prompted.

## Step 5: Get Database Connection String

```bash
railway variables
```

Look for the `DATABASE_URL` variable. It will look something like:
```
postgresql://postgres:password@containers-us-west-xyz.railway.app:1234/railway
```

## Step 6: Update .env File

Copy the `DATABASE_URL` from Railway and update your `backend/.env` file:

```
DATABASE_URL="postgresql://postgres:password@containers-us-west-xyz.railway.app:1234/railway"
```

## Step 7: Run Database Migrations

Once your DATABASE_URL is set, run:

```bash
cd ~/compass/backend
npm run prisma:migrate
```

This will create all the tables in your Railway PostgreSQL database.

## Verify Setup

Check that everything is working:

```bash
npm run prisma:studio
```

This will open Prisma Studio where you can see your database tables.

---

## Quick Reference

- **View variables**: `railway variables`
- **Open dashboard**: `railway open`
- **Deploy**: `railway up`
- **Logs**: `railway logs`

## Troubleshooting

If migration fails:
1. Verify DATABASE_URL is correctly set in `.env`
2. Check Railway dashboard to ensure PostgreSQL is running
3. Make sure your IP is not blocked (Railway uses public IPs)
