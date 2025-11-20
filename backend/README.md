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

