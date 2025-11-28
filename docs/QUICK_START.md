# Compass Quick Start Guide

Get Compass running on your local machine in under 5 minutes.

## Prerequisites

- Node.js 18 or higher
- PostgreSQL database (local or Railway)
- npm or yarn
- VS Code (recommended) - for the best development experience

## Installation

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd compass

# Run automated setup
npm run setup
```

The setup script will:
- ✓ Check Node.js version
- ✓ Install all dependencies
- ✓ Copy .env.example to .env
- ✓ Generate Prisma client

### 1.5. Install VS Code Extensions (Optional but Recommended)

If you're using VS Code, install the recommended extensions for the best development experience:

```bash
# Install all recommended extensions automatically
npm run vscode:extensions
```

Alternatively:
- VS Code will automatically prompt you to install recommended extensions when you open the workspace
- Or install manually from the Extensions view (Cmd+Shift+X / Ctrl+Shift+X)

Recommended extensions include:
- Prisma (schema syntax highlighting)
- ESLint & Prettier (code quality)
- Tailwind CSS IntelliSense
- Jest (testing)
- PostgreSQL (database tools)
- Error Lens, GitLens, and more

### 2. Configure Environment

Edit `backend/.env` with your credentials:

```env
# Required: Database connection
DATABASE_URL="postgresql://user:password@host:5432/compass"

# Required: API Authentication
API_SECRET="your-secure-api-key-here"

# Optional: Time tracking
TOGGL_API_TOKEN="your-toggl-token"
```

### 3. Initialize Database

```bash
# Run migrations
npm run db:migrate

# (Optional) Open Prisma Studio to verify
npm run db:studio
```

### 4. Start Development Servers

```bash
npm run dev
```

This starts:
- Backend: http://localhost:3001
- Frontend: http://localhost:3000

## Troubleshooting

### Environment Check

Run the verification script to diagnose issues:

```bash
npm run verify
```

### API Authentication

The backend requires an API secret for authentication. Set `API_SECRET` in `backend/.env` to match the secret used by your frontend clients. The frontend stores the API secret in localStorage after login.

### Common Issues

**Port already in use**
```bash
# Find process using port
lsof -ti:3000
lsof -ti:3001

# Kill process
kill -9 <PID>
```

**Database connection failed**
- Verify DATABASE_URL in backend/.env
- Check PostgreSQL is running
- Test connection: `npm run db:studio`

**Prisma client not generated**
```bash
npm run db:generate
```

**Dependencies out of sync**
```bash
# Clean install
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install:all
```

## npm Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both frontend and backend |
| `npm run setup` | Initial environment setup |
| `npm run verify` | Check environment configuration |
| `npm run install:all` | Install all dependencies |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset database (⚠️ deletes data) |
| `npm run build` | Build for production |
| `npm run vscode:extensions` | Install recommended VS Code extensions |

## Manual Startup

If you prefer to start servers separately:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## Next Steps

1. 📚 Read the [full README](../README.md)
2. 🗄️ Review the [database schema](../backend/prisma/schema.prisma)
3. 🏗️ Check the [project structure](../README.md#project-structure)
4. 🚀 Start building!

## Getting Help

- Check logs: `tail -f backend.log` or `tail -f frontend.log`
- Run health check: `curl http://localhost:3001/api/health`
- Verify environment: `npm run verify`
