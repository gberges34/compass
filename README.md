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

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Railway account)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd compass
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables:

Backend `.env`:
```env
DATABASE_URL="your-postgresql-connection-string"
PORT=3001
```

Frontend `.env` (optional):
```env
REACT_APP_API_URL=http://localhost:3001
```

5. Run database migrations:
```bash
cd backend
npx prisma migrate dev
```

6. Start the development servers:

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm start
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:3001`.

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

## Contributing

This is a personal productivity system, but suggestions and improvements are welcome!

## License

MIT
