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

## Discord Bot Environment

Set these environment variables to enable the embedded Discord bot that writes Time Engine slices:

- `DISCORD_BOT_ENABLED`: set to `true` to start the bot; unset/anything else disables it.
- `DISCORD_TOKEN`: Discord bot token.
- `DISCORD_USER_ID`: Discord user ID to track.
- `DISCORD_GUILD_IDS`: Comma-separated guild IDs the bot should monitor.
- `DISCORD_DENYLIST_APPS`: Comma-separated app names/IDs to ignore as games (start with `Spotify`).
