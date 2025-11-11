# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Quick Start
```bash
# Initial setup (first time only)
npm run setup

# Start both frontend and backend with health checks
npm run dev

# Start individually
npm run start:backend  # Backend on port 3001
npm run start:frontend # Frontend on port 3000
```

### Database Operations
```bash
# Run Prisma migrations
npm run db:migrate

# Generate Prisma client after schema changes
npm run db:generate

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### Backend Development
```bash
cd backend

# Start backend with hot reload
npm run dev

# Build for production
npm run build

# Start production build
npm start
```

### Frontend Development
```bash
cd frontend

# Start React dev server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Utilities
```bash
# Verify environment setup (run when things aren't working)
npm run verify

# Check health of running services
npm run health
```

## Architecture

### Monorepo Structure
This is a TypeScript monorepo with two main workspaces:
- **`/backend`** - Express.js REST API server (port 3001)
- **`/frontend`** - React SPA (port 3000)
- **`/scripts`** - Setup and development scripts

### Backend Architecture

#### Route Organization
Routes are organized by **feature domain**, not HTTP method:
- `routes/tasks.ts` - Task CRUD, scheduling, enrichment, completion
- `routes/orient.ts` - Daily planning (Orient East morning, Orient West evening)
- `routes/reviews.ts` - Daily/weekly review generation
- `routes/todoist.ts` - Todoist integration
- `routes/postdo.ts` - Post-task analytics

All routes are mounted at `/api/*` prefix in `src/index.ts`.

#### Database Pattern: Direct Prisma Calls
**There is no repository layer.** Prisma client is used directly in route handlers:
```typescript
const tasks = await prisma.task.findMany({
  where: { status: 'NEXT' },
  include: { postDoLog: true }
});
```

The Prisma client singleton is exported from `src/prisma.ts` with development-friendly logging.

**When adding new routes:**
1. Import `prisma` from `src/prisma.ts`
2. Use Prisma directly in handlers
3. Handle Prisma errors (especially `P2025` for not found)

#### Validation Pattern: Zod Schemas
Every endpoint validates input with Zod schemas defined at the top of route files:
```typescript
const createTaskSchema = z.object({
  name: z.string().min(1),
  priority: z.enum(['MUST', 'SHOULD', 'COULD', 'MAYBE']),
  // ... more fields
});

router.post('/', async (req, res) => {
  try {
    const validatedData = createTaskSchema.parse(req.body);
    const task = await prisma.task.create({ data: validatedData });
    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }
    // Handle other errors
  }
});
```

**When adding new endpoints:**
1. Define Zod schema at top of route file
2. Use `schema.parse()` to validate `req.body`
3. Return 400 with `error.issues` for validation failures

#### Error Handling

**Architecture:**
- Custom error classes in `src/errors/AppError.ts` (ValidationError, NotFoundError, BadRequestError, InternalError)
- Global error middleware in `src/middleware/errorHandler.ts` catches all errors
- Async handler wrapper in `src/middleware/asyncHandler.ts` catches async route errors
- All routes wrapped with `asyncHandler()` - no try-catch blocks needed

**Error response format:**
```typescript
// Standard errors
{ error: 'Human-readable message', code: 'ERROR_CODE' }

// Validation errors include details
{ error: 'Validation error', code: 'VALIDATION_ERROR', details: [...] }
```

**Required imports for new routes:**
```typescript
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';
```

**When adding new endpoints:**
1. Wrap handler with `asyncHandler(async (req, res) => { ... })`
2. Use `schema.parse()` for validation - ZodError automatically caught
3. Throw error classes instead of returning status codes:
   - `throw new NotFoundError('Resource')` for 404
   - `throw new BadRequestError('message')` for 400
   - `throw new ValidationError('message', details)` for validation
4. DO NOT add try-catch blocks (let middleware handle errors)
5. Prisma P2025 errors automatically converted to 404

**Handled automatically by middleware:**
- Zod validation errors → 400 with details
- Prisma P2025 (not found) → 404
- Custom AppError instances → appropriate status code
- Unhandled errors → 500 (logged with stack trace)

#### Middleware Stack
Core middleware in order (see `src/index.ts`):
1. **CORS** - Configured for `FRONTEND_URL` env var
2. **JSON Parser** - `express.json()`
3. **Cache Control** - Intelligent per-route HTTP caching:
   - Tasks: 60s cache (frequent updates)
   - Orient: 600s cache (daily changes)
   - Reviews: 300s cache (moderate frequency)

#### Services
External integrations are in `src/services/`:
- **`llm.ts`** - Claude API for task enrichment (with graceful fallbacks)
- **`timery.ts`** - Time tracking integration (structure defined)

Services handle failures gracefully and provide sensible defaults.

#### Retry Logic

All external API calls (LLM, Todoist, Timery) are wrapped with `withRetry()` utility:

```typescript
import { withRetry } from '../utils/retry';

const result = await withRetry(() => externalAPI.call());
```

**Configuration:**
- 4 retries with exponential backoff: 1s, 2s, 4s, 8s
- Retries on: Network errors, 5xx server errors, 429 rate limits
- Fails immediately on: 4xx client errors

**Custom retry logic:**
```typescript
await withRetry(() => someAPI.call(), {
  maxRetries: 2,
  initialDelay: 500,
  shouldRetry: (error) => error.code === 'CUSTOM_ERROR'
});
```

#### LLM Response Validation

LLM responses are validated with Zod schemas:
- Strict type checking for enums (category, context)
- Partial recovery: valid fields used, invalid fields get defaults
- Validation failures logged for monitoring

**Example validation with recovery:**
```typescript
const enrichmentSchema = z.object({
  category: z.enum(['SCHOOL', 'MUSIC', 'FITNESS', ...]),
  context: z.enum(['HOME', 'OFFICE', 'COMPUTER', ...]),
  rephrasedName: z.string().min(1),
  definitionOfDone: z.string().min(1),
});

// If LLM returns invalid category, fall back to 'PERSONAL'
// If valid fields exist, they are preserved
```

#### Pagination

**Backend:**
- All list endpoints support cursor-based pagination
- Default page size: 30, max: 100
- Response format: `{ items: T[], nextCursor: string | null }`
- Implementation in: `routes/tasks.ts`, `routes/reviews.ts`

**Frontend:**
- Use `useInfiniteQuery` for cursor-based pagination
- Use `useFlatTasks()` or `useFlatReviews()` for simple array access
- Example:
```typescript
const { data, fetchNextPage, hasNextPage } = useTasks(filters);
// OR
const { tasks, fetchNextPage, hasNextPage } = useFlatTasks(filters);
```

### Frontend Architecture

#### State Management
**React Query (TanStack Query) for Server State**

Query keys follow structured pattern:
```typescript
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: TaskFilters) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};
```

**React Query handles:**
- Server data caching and invalidation
- Optimistic updates with rollback on error
- Refetching strategies

**Pages use `useState` for UI state only:**
- Modal visibility
- Selected tabs/filters
- Form state

**Never duplicate server state in `useState`** - always use React Query hooks.

#### Component Organization
Components in `src/components/` are flat and focused:
- **Layout:** `Layout.tsx`, `Card.tsx`
- **Forms:** `Input.tsx`, `Button.tsx`
- **UI:** `Badge.tsx`, `LoadingSkeleton.tsx`, `Toast.tsx`
- **Features:** `TaskModal.tsx`, `CompleteTaskModal.tsx`, `TaskActions.tsx`

Components follow single-responsibility pattern. No deep nesting.

#### API Client
Centralized Axios client in `src/lib/api.ts`:
- All API methods are exported functions (e.g., `getTasks`, `scheduleTask`)
- Response interceptor adds user-friendly error messages to errors
- Base URL configured via `REACT_APP_API_URL` env var

**When calling APIs:**
1. Use exported functions from `api.ts`
2. Handle errors via `error.userMessage` (added by interceptor)
3. Show errors via Toast context

#### Type Definitions
All types centralized in `src/types/index.ts`:
- **Domain models** (Task, DailyPlan, Review, etc.)
- **Enums** (TaskStatus, Priority, Energy, Category, Context)
- **API request/response types**
- **UI-specific types** (filters, form data)

**Types mirror backend Prisma schema** but are manually maintained. When the backend schema changes, update frontend types accordingly.

### Key Architectural Patterns

#### Date/Time Handling
- **Database storage:** All timestamps stored as UTC (Prisma default)
- **API communication:** ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Display formatting:** Use `date-fns` for user-facing dates
- **Utilities:** Both backend and frontend have date utilities if needed

**When working with dates:**
1. Store/transmit as ISO 8601 strings
2. Parse with `date-fns` `parseISO()` on frontend
3. Format with `date-fns` `format()` for display

#### Type Safety
- TypeScript strict mode enabled in both workspaces
- Zod validates at API boundaries (backend)
- TypeScript types provide compile-time safety (frontend)
- Prisma generates types from schema (backend)

#### Error Handling Philosophy
- **Backend:** Return appropriate HTTP status codes with descriptive error messages
- **Frontend:** Display user-friendly messages via Toast context
- **Services:** Fail gracefully with sensible defaults (e.g., LLM enrichment)

### Testing

#### Frontend Tests
Located in `src/hooks/useTasks.test.tsx`:
- Jest + React Testing Library
- Tests focus on React Query integration (cache behavior, optimistic updates, rollback)
- Run with `npm test` in frontend directory

**When writing tests:**
1. Mock API calls with Jest
2. Test optimistic updates by checking cache state
3. Test error rollback behavior
4. Test refetch logic

#### Backend Tests
**Not yet implemented.** Expected pattern:
- Route integration tests with supertest
- Validation tests (Zod error cases)
- Service tests with mocks

## Common Development Patterns

### Adding a New Backend Route
1. Create/edit route file in `backend/src/routes/`
2. Define Zod validation schemas at top
3. Use `prisma` directly from `src/prisma.ts`
4. Handle errors consistently (400 validation, 404 not found, 500 server)
5. Register route in `src/index.ts` with `/api` prefix
6. Return appropriate HTTP status (201 for POST success, 200 for updates)

### Adding a New Frontend Page
1. Create page component in `frontend/src/pages/`
2. Add route in `App.tsx` `<Routes>`
3. Define types in `src/types/index.ts` if needed
4. Add API methods to `src/lib/api.ts`
5. Create React Query hooks (queries/mutations) if needed
6. Use Toast context for user feedback

### Database Schema Changes
1. Edit `backend/prisma/schema.prisma`
2. Run `npm run db:migrate` (creates migration and applies)
3. Update frontend types in `frontend/src/types/index.ts`
4. Update Zod schemas in affected route files
5. Update API client and React Query hooks if needed

### Adding External Service Integration
1. Create service file in `backend/src/services/`
2. Export typed functions for service operations
3. Handle failures gracefully with try/catch and defaults
4. Add environment variables to `backend/.env`
5. Call service from routes, not directly from route handlers

## Environment Configuration

### Backend `.env` (required)
```
DATABASE_URL="postgresql://user:password@host:port/database"
ANTHROPIC_API_KEY="sk-ant-..."
TOGGL_API_TOKEN="..."
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

### Frontend `.env` (optional)
```
REACT_APP_API_URL="http://localhost:3001"
```

If not set, frontend defaults to `http://localhost:3001`.

## Important Conventions

### Code Organization
- Backend routes are feature-focused, not REST resource focused
- Components are flat, not deeply nested
- Types are centralized, not scattered
- API methods are grouped by feature in single file

### Naming
- Database models: PascalCase (Task, DailyPlan)
- Routes: kebab-case URLs (`/api/orient/east`)
- Zod schemas: camelCase with `Schema` suffix (`createTaskSchema`)
- React Query keys: feature-based factory pattern (`taskKeys.list(filters)`)

### State Management Rules
- Server state → React Query (cached, synced)
- UI state → `useState` (local, ephemeral)
- Never duplicate server state in `useState`
- Use Toast context for notifications, not alerts

### Validation
- Backend validates ALL inputs with Zod
- Frontend can add UI validation, but backend is source of truth
- Validation errors return 400 with structured error details

## Troubleshooting

### Database Issues
```bash
# Check if Postgres is running
npm run verify

# Reset database if migrations are stuck
npm run db:reset

# Regenerate Prisma client after schema changes
npm run db:generate
```

### Port Conflicts
Backend runs on 3001, frontend on 3000. If ports are in use:
- Change `PORT` in `backend/.env`
- Update `REACT_APP_API_URL` in frontend

### Cache Issues
React Query caches aggressively. To clear:
- Reload browser (clears React Query cache)
- Check React Query DevTools (bottom left of frontend)

### Hot Reload Not Working
- Backend: `nodemon` may need restart if `tsconfig.json` changes
- Frontend: Create React App hot reload is automatic

## Hooks & Notifications

### Audible Notifications for User Input

Claude Code can play an audible notification when user input is required (e.g., when `AskUserQuestion` tool is used, permission prompts, or idle prompts).

#### Quick Setup (Terminal Bell)

Enable global terminal bell notifications:
```bash
claude config set --global preferredNotifChannel terminal_bell
```

This will emit a system beep whenever Claude needs input.

#### Enhanced Setup (macOS System Notifications)

For better UX with macOS system notifications and custom sounds:

1. **Install terminal-notifier** (if not already installed):
```bash
brew install terminal-notifier
```

2. **Configure Notification hook** in `.claude/settings.local.json`:

```json
{
  "permissions": { ... existing permissions ... },
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "terminal-notifier -message 'Claude Code Needs Your Input' -title 'Claude Code' -sound Basso -group 'claude-code' -activate 'com.apple.Terminal'"
          }
        ]
      }
    ]
  }
}
```

**Available macOS notification sounds:**
- `Basso` (recommended - low, attention-getting)
- `Ping` (gentle)
- `Glass` (clear)
- `Blow`, `Bottle`, `Frog`, `Funk`, `Morse`, `Pop`, `Purr`, `Sosumi`, `Submarine`, `Tink`

**Hook parameters:**
- `-message` - Notification text
- `-title` - Notification title
- `-sound` - System sound name
- `-group` - Notification grouping (prevents spam)
- `-activate` - Bundle ID to activate when clicked (focuses terminal)

#### Available Hook Events

Claude Code supports these hook types:
- **Notification** - User input needed, idle prompts, permissions
- **PreToolUse** - Before any tool executes (can block)
- **PostToolUse** - After tool completes
- **Stop** - When response finishes
- **SubagentStop** - When subagent tasks complete
- **UserPromptSubmit** - When user submits prompt
- **SessionStart** - Session begins
- **SessionEnd** - Session ends

See [Claude Code Hooks Documentation](https://docs.claude.com/en/docs/claude-code/hooks) for details.

#### Testing Hooks

After configuring hooks, test them to ensure they work correctly. See [Hook Testing Procedures](docs/testing-hooks.md) for detailed testing methods.

Quick test:
```bash
# Test notification script directly
./scripts/notify-input-needed.sh

# Or ask Claude to use AskUserQuestion tool
# Expected: notification sound plays and macOS notification appears
```

#### Troubleshooting Hooks

**Hook not firing:**
```bash
# Check hook configuration syntax
cat .claude/settings.local.json | jq '.hooks'

# Test terminal-notifier directly
terminal-notifier -message "Test" -sound Basso
```

**Invalid configuration:**
- Hooks validate strictly - syntax errors disable ALL hooks
- Check JSON syntax with `jq` or JSON validator
- Ensure `command` value is a single string (not array)
- Hook timeout default is 60 seconds - long commands may fail

## Project Context

**Compass** is a personal productivity system with:
- Task management (priority, energy, context-based)
- Daily planning (Orient East morning, Orient West evening)
- Weekly reviews with metrics
- Todoist integration for task capture/enrichment
- Calendar view for scheduled tasks
- Analytics tracking (deep work hours, completion rates)

**Core workflow:**
1. Capture tasks from Todoist → Clarify page
2. Enrich with AI → Creates proper task with metadata
3. Orient East → Morning planning (select NEXT tasks, schedule deep work)
4. Work on tasks → Complete with reflection (PostDo log)
5. Orient West → Evening reflection
6. Daily/weekly reviews → Track progress and insights
