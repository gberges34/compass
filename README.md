# Compass 🧭

**A Personal Productivity System for High-Agency Work**

Compass is a full-stack TypeScript application designed to manage tasks, energy, and attention. It integrates daily planning (Orienting), execution (Task Management), and reflection (Reviews) into a unified workflow. Built with a React 19 frontend and an Express/Prisma backend, it emphasizes deep work tracking and intentionality over simple checking off boxes.

## 🌟 Key Features

* **Task Management**: Create and organize tasks with attributes like **Energy Required** (High/Medium/Low), **Priority** (Must/Should/Could), and **Context** (Home/Office/Computer).
* **Daily Orientation**:
* **Orient East (Morning)**: Set intentions, plan blocks, and define top outcomes.
* **Orient West (Evening)**: Reflect on the day, log actual outcomes, and rate energy alignment.


* **Time Engine**: Track time usage with dimensions for Work Mode, Social, and Segments. Includes integration hooks for Toggl and Timery.
* **Review System**: Structured Daily and Weekly reviews (`3-3-3` method: Wins, Misses, Lessons) with calculated metrics for deep work hours and execution rate.
* **Integrations**:
* **Todoist**: Import pending tasks for clarification.
* **HealthKit**: (Data model support) Track sleep, steps, and active calories alongside productivity.


* **Post-Do Analysis**: Log actual effort, efficiency, and key insights after completing tasks to improve future estimation.

## 🛠 Tech Stack

### Frontend (`/frontend`)

* **Framework**: React 19.2.0 + Vite
* **Language**: TypeScript 5.9
* **Styling**: TailwindCSS v3
* **Routing**: React Router DOM 7.9
* **State/Data**: React Query (@tanstack/react-query)
* **Calendar**: React Big Calendar

### Backend (`/backend`)

* **Runtime**: Node.js (v18+ required)
* **Framework**: Express.js
* **Database**: PostgreSQL
* **ORM**: Prisma 7.1
* **Validation**: Zod
* **External APIs**: Axios (for Todoist/Toggl), Discord.js (for notifications)

## 📂 Project Structure

The repository is organized as a monorepo-style codebase:

```text
compass/
├── backend/                # Express API & Prisma ORM
│   ├── prisma/            # Database schema & migrations
│   └── src/
│       ├── routes/        # API endpoints (tasks, orient, reviews)
│       ├── services/      # Business logic
│       └── middleware/    # Auth, Caching, Error handling
├── frontend/               # React Vite application
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Route views
│       └── hooks/         # Custom React hooks
├── scripts/                # Automation scripts (setup, dev, verify)
├── shared/                 # Shared TypeScript types/DTOs
└── shortcuts/              # Apple Shortcuts & automation scripts

```

## 🚀 Getting Started

### Prerequisites

* **Node.js**: v18 or higher (Verified by `scripts/setup.sh`)
* **PostgreSQL**: Local installation or a cloud URL (e.g., Railway)
* **npm**: v9+

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd compass

```


2. **Run the automated setup**:
This script installs dependencies for both frontend and backend, generates the Prisma client, and checks your environment.
```bash
npm run setup

```


3. **Configure Environment Variables**:
* **Backend**: Copy `backend/.env.example` to `backend/.env` and update `DATABASE_URL` and `API_SECRET`.
* **Frontend**: Copy `frontend/.env.example` to `frontend/.env` (defaults to `http://localhost:3001` for API).


```bash
# Example Backend .env setup
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL connection string

```


4. **Initialize Database**:
Run migrations to create the schema in your PostgreSQL instance.
```bash
npm run db:migrate

```



### Running Locally

Start both the frontend and backend servers in development mode:

```bash
npm run dev

```

* **Frontend**: http://localhost:3000
* **Backend**: http://localhost:3001
* **Health Check**: `npm run verify` (Runs environment diagnostics)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Location |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (Required) | Backend |
| `API_SECRET` | Secret key for API authentication (Required) | Backend |
| `TOGGL_API_TOKEN` | Token for time tracking integration (Optional) | Backend |
| `VITE_API_URL` | URL of the backend API (Default: localhost:3001) | Frontend |
| `CORS_ALLOW_VERCEL_PREVIEWS` | Set to "true" to allow Vercel preview URLs | Backend |

## 📜 Scripts

* `npm run setup`: Full project installation and initialization.
* `npm run dev`: Starts backend and frontend concurrently with health checks.
* `npm run db:migrate`: Runs Prisma migrations (`backend`).
* `npm run db:studio`: Opens Prisma Studio GUI to inspect data (`backend`).
* `npm run verify`: Runs `scripts/verify-environment.sh` to check Node version, DB connection, and env vars.

## 🚢 Deployment

The project is configured for split deployment:

* **Frontend**: Deployed to **Vercel** (detects Vite settings automatically).
* **Backend**: Deployed to **Railway** (PostgreSQL database hosted here as well).

Refer to `docs/DEPLOYMENT.md` (if available) or the `vercel.json` and `backend/.railway.toml` files for specific configuration details.

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (conventional commits preferred).
4. **Verification**: Run `npm run verify` and `npm test` before pushing.
5. Open a Pull Request.

## 📄 License

This project is licensed under the MIT License.
