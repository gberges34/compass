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

Code Quality Analysis:
- `npm run analyze` - Run all 9 quality assessment agents
- `npm run analyze:parallel` - Run all agents in parallel (faster)
- `npm run analyze:reliability` - Error handling analysis
- `npm run analyze:maintainability` - Code maintainability check
- `npm run analyze:complexity` - Cyclomatic complexity audit
- `npm run analyze:churn` - Code change frequency tracking
- `npm run analyze:duplication` - Duplicate code detection
- `npm run analyze:coverage` - Test coverage analysis
- `npm run analyze:debt` - Technical debt calculation
- `npm run analyze:sustainability` - Resource efficiency evaluation
- `npm run analyze:reviews` - Code review metrics

### Troubleshooting

Run environment diagnostics:
```bash
npm run verify
```

For common issues and solutions, see [Quick Start Guide](docs/QUICK_START.md#troubleshooting).

## Multi-Agent Code Quality Assessment

Compass includes a comprehensive code quality analysis system powered by 9 specialized AI agents:

1. **Reliability Analyst** - Error handling, input validation, edge case coverage
2. **Maintainability Inspector** - Code readability, documentation, architecture
3. **Cyclomatic Complexity Auditor** - Control flow complexity measurement
4. **Code Churn Tracker** - Change frequency and stability analysis
5. **Duplication Detective** - Duplicate code detection and DRY violations
6. **Test Coverage Analyst** - Test coverage gaps and recommendations
7. **Technical Debt Accountant** - Debt calculation with payoff roadmap
8. **Sustainability Metrics Evaluator** - Resource efficiency and performance
9. **Review Metrics Analyst** - Code review process health

### Running Analysis

```bash
# Run all agents sequentially
npm run analyze

# Run all agents in parallel (faster)
npm run analyze:parallel

# Run individual agents
npm run analyze:reliability
npm run analyze:maintainability
# ... etc
```

Results are saved to `analysis/ANALYSIS_REPORT.md` with an overall quality score, detailed findings, and actionable recommendations.

For more details, see [analysis/README.md](analysis/README.md).

## Project Structure

```
compass/
├── analysis/              # Code quality assessment system
│   ├── agents/           # 9 specialized analysis agents
│   ├── orchestrator.ts   # Multi-agent coordinator
│   └── ANALYSIS_REPORT.md # Generated quality report
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

## Contributing

This is a personal productivity system, but suggestions and improvements are welcome!

## License

MIT
