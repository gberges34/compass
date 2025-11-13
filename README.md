# Compass - Personal Productivity System

A full-stack productivity application built with React, TypeScript, Express, and Prisma.

## Features

- **Task Management** - Organize tasks with priorities, categories, energy levels, and contexts
- **Daily Planning** - Orient East (morning planning) and Orient West (evening reflection)
- **Calendar Integration** - Schedule tasks and view your day at a glance
- **Reviews** - Daily and weekly reviews to track progress
- **Task Clarification** - AI-powered task enrichment with Todoist integration
- **Analytics** - Track completed tasks and deep work hours

## Tech Stack

### Frontend
- React 19.2.0
- TypeScript
- React Router DOM 7.9.5
- TailwindCSS v3
- React Big Calendar
- Axios

### Backend
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL (Railway)
- Zod validation

## Getting Started

### Quick Start (Recommended)

```bash
# 1. Clone and setup
git clone <your-repo-url>
cd compass
npm run setup

# 2. Configure backend/.env with your database credentials

# 3. Initialize database
npm run db:migrate

# 4. Start development
npm run dev
```

**🎉 That's it!** Frontend at http://localhost:3000, Backend at http://localhost:3001

For detailed instructions, see [Quick Start Guide](docs/QUICK_START.md).

### npm Scripts

Development:
- `npm run dev` - Start both servers with health checks
- `npm run start:backend` - Backend only
- `npm run start:frontend` - Frontend only

Database:
- `npm run db:migrate` - Run migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database

Utilities:
- `npm run setup` - Initial setup
- `npm run verify` - Environment health check
- `npm run build` - Production build

### Troubleshooting

Run environment diagnostics:
```bash
npm run verify
```

For common issues and solutions, see [Quick Start Guide](docs/QUICK_START.md#troubleshooting).

## Project Structure

```
compass/
├── backend/
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── prisma.ts      # Prisma client
│   │   └── index.ts       # Express app setup
│   └── prisma/
│       └── schema.prisma  # Database schema
└── frontend/
    └── src/
        ├── components/    # React components
        ├── pages/         # Page components
        ├── contexts/      # React contexts (Toast)
        ├── lib/           # API client
        └── types/         # TypeScript types
```

## Database Schema

The application uses Prisma with PostgreSQL. Main models:
- **Task** - Task management with status, priority, category, energy, context
- **DailyPlan** - Daily planning with deep work blocks and outcomes
- **Review** - Daily and weekly reviews
- **PostDoLog** - Task completion tracking
- **TempCapturedTask** - Tasks from Todoist pending clarification

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks (with filters)
- `POST /api/tasks` - Create a task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task
- `POST /api/tasks/:id/activate` - Activate a task
- `POST /api/tasks/:id/complete` - Complete a task
- `PATCH /api/tasks/:id/schedule` - Schedule a task

### Orient (Daily Planning)
- `GET /api/orient/today` - Get today's plan
- `POST /api/orient/east` - Create morning plan
- `PATCH /api/orient/west/:id` - Add evening reflection

### Reviews
- `GET /api/reviews` - Get reviews (daily/weekly)
- `POST /api/reviews/daily` - Create daily review
- `POST /api/reviews/weekly` - Create weekly review

### Todoist Integration
- `GET /api/todoist/pending` - Get pending tasks from Todoist
- `POST /api/todoist/import` - Import tasks from Todoist

### Health & Observability
- `GET /api/health` - Returns overall status plus dependency breakdown (database, Todoist bridge, HealthKit stub, Toggl stub). Responds with HTTP 200 when all required deps are `up`, otherwise 503 with the failing dependency list in the payload for fast triage.

## Contributing

This is a personal productivity system, but suggestions and improvements are welcome!

## License

MIT
