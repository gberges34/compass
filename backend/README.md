# Backend API Documentation

## API Pagination

### Cursor-Based Pagination

Tasks and reviews endpoints use cursor-based pagination:

**Query Parameters:**
- `cursor` (optional): ID of last item from previous page
- `limit` (optional): Page size (default: 30, max: 100)

**Response Format:**
```json
{
  "items": [...],
  "nextCursor": "uuid-string" | null
}
```

**Example:**
```bash
# First page
GET /api/tasks?limit=30

# Next page
GET /api/tasks?cursor=previous-last-id&limit=30
```

**With filters:**
```bash
GET /api/tasks?status=NEXT&priority=MUST&cursor=abc-123&limit=30
```

### Paginated Endpoints

#### Tasks - GET /api/tasks
- Supports cursor-based pagination
- Ordered by: status (asc), priority (asc), scheduledStart (asc), createdAt (desc)
- Optimized with composite index `@@index([status, priority, scheduledStart, createdAt])` (BACKEND-PERF-001)
- Cursor uses `id > cursor` for next page
- Works with filters: status, priority, category, scheduledDate

#### Reviews - GET /api/reviews
- Supports cursor-based pagination
- Ordered by: periodStart (desc), id (desc) - newest first
- Cursor uses `id < cursor` for next page (DESC ordering)
- Works with filter: type (DAILY/WEEKLY)

## API Authentication

All backend routes (except `/api/health`) require authentication via the `x-api-secret` header. The header value must match the `API_SECRET` environment variable configured in `backend/.env`.

The frontend automatically includes this header via an Axios interceptor that reads the API secret from localStorage (stored after user login). See `docs/plans/2025-11-24-process-captured-refactor.md` for details on the authentication implementation.

## Anthropic Connectivity Check

Use the workspace health script whenever you need to validate Anthropic access without exposing secrets in logs.

1. Export your key as `COMPASS_ANTHROPIC_API_KEY` (preferred) or `ANTHROPIC_API_KEY` in `backend/.env`.
2. Run the dedicated script:
   ```bash
   npm run check:anthropic
   ```
3. The script shells into `scripts/health-check.sh` with networking limited to a single message request and redacts sensitive data from stdout.

The command exits non-zero if Anthropic is unreachable or the key is missing, making it safe to wire into CI.
