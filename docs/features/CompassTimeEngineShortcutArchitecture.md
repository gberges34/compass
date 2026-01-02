Here’s how the Time Engine API actually looks (from backend/src/routes/engine.ts (line 1) and backend/src/schemas/timeEngine.ts (line 1)), and a concrete pattern you can use to design your shortcuts.

1) Core Time Engine API surface

All endpoints are under BASE_URL/api/engine and require:

Header: x-api-secret: YOUR_API_SECRET (see backend/src/middleware/auth.ts (line 1))
Header: Content-Type: application/json
Auth is all-or-nothing: no secret → 401/403.
a) Start slice – POST /api/engine/start

Validated by startSliceSchema:

Method: POST
URL: BASE_URL/api/engine/start
Body (all required except linkedTaskId):

{
  "category": "Sleep",                 // any non-empty string
  "dimension": "PRIMARY",              // PRIMARY | WORK_MODE | SOCIAL | SEGMENT
  "source": "SHORTCUT",                // /Users/gberges/Library/CloudStorage/GoogleDrive-gberges34@gmail.com/My Drive/compass/Device CompartmentalizationSHORTCUT | TIMERY | MANUAL | API
  "linkedTaskId": "uuid-optional"      // optional UUID string
}

Behavior (see backend/src/services/timeEngine.ts (line 23)):

Uses server time (new Date()) for start.
Looks for an active slice with same dimension and end === null.
If existing slice has same category and linkedTaskId → returns it unchanged (idempotent).
Otherwise closes that slice (end = now) and creates a new one.
Response: full TimeSlice row (id, start, end, category, dimension, source, linkedTaskId, createdAt, updatedAt).

For automations, you can:

Send only dimension for “just stop whatever’s active in this dimension”.
Or send dimension + category when you want safety (only stop if it’s “Commute”, etc.).
c) Current state – GET /api/engine/state

Built by getCurrentState() in backend/src/services/timeEngine.ts (line 79):

Method: GET
URL: BASE_URL/api/engine/state
No query/body.
Response shape:

{
  "primary":   { "category": "Coding", "start": "2025-12-03T10:00:00.000Z" } | null,
  "work_mode": { "category": "Deep Work", "start": "..." } | null,
  "social":    { "category": "Discord Call", "start": "..." } | null,
  "segment":   { "category": "Morning Block", "start": "..." } | null
}

This is your main “decision state” for shortcuts (e.g. “if already in Deep Work…”).

d) History & summary (optional for shortcuts)

GET /api/engine/slices (with startDate, endDate, optional dimension, category, linkedTaskId)
→ returns array of TimeSlice records overlapping the range.

PATCH /api/engine/slices/:id and DELETE /api/engine/slices/:id
→ mutate individual slices (used by Time History UI).

GET /api/engine/summary with startDate, endDate
→ returns { "categoryBalance": { [category: string]: minutes } }.

These are useful for “Daily/Weekly Time Review” shortcuts or analytics, but not required for basic start/stop flows.

2) Recommended shortcut template/framework

You can treat the Time Engine shortcuts as a small “SDK” made of 3–4 reusable building blocks. Everything else (NFC tags, Focus automations, etc.) just calls into these.

a) Global config shortcut (Compass Config)

Already hinted in shortcuts/README.md (line 132).

Shortcut returns a Dictionary like:

baseURL: https://your-backend-domain.com
apiSecret: YOUR_API_SECRET
In every Time Engine shortcut:

Run Shortcut → "Compass Config"
Get Dictionary Value "baseURL" → BaseURL
Get Dictionary Value "apiSecret" → ApiSecret
This keeps endpoint changes and secrets in one place.

b) Core “Start Context” shortcut

This generalizes shortcuts/07-start-activity.md into a reusable building block.

Inputs:

Category (Text) – either passed in from an automation or chosen via menu.
Optional Dimension – when omitted, derive from category (PRIMARY/WORK_MODE/SOCIAL/SEGMENT).
Actions (conceptually):

Run Compass Config → get BaseURL, ApiSecret.
If Dimension is empty:
Map Category to dimension, similar to 07-start-activity.md (line 54):
Deep Work/Shallow Work → WORK_MODE
Discord Call → SOCIAL
Morning Lag, Gym Block, etc. → SEGMENT
else → PRIMARY
Build Dictionary:
category: Category
dimension: Dimension
source: "SHORTCUT"
(optional) linkedTaskId: pass through when you’re starting from a task-based shortcut.
Get Contents of URL:
URL: BaseURL + "/api/engine/start"
Method: POST
Headers:
Content-Type: application/json
x-api-secret: ApiSecret
Body: Dictionary from step 3.
Parse response Dictionary as needed (e.g. category, start) and show a notification or just return the Dictionary to the caller shortcut.
Then:

Any automation (“Focus Mode ON”, “NFC tag scanned”, etc.) just sets Category and maybe Dimension, then runs this shortcut.
c) Core “Stop Context” shortcut

Generalizes shortcuts/08-stop-activity.md.

Inputs:

Optional Dimension (e.g. "PRIMARY", "WORK_MODE")
Optional Category for strict stopping (e.g. only stop if it’s “Commute”).
Two designs:

Simple stop by dimension:

Run Compass Config → BaseURL, ApiSecret.
Build Dictionary:
dimension: Dimension
If Category is not empty, add category.
Get Contents of URL:
URL: BaseURL + "/api/engine/stop"
Method: POST
Headers: same as start.
Body: Dictionary from step 2.
Optional: handle HTTP 404 as “nothing to stop” and show a gentle alert.
Smart stop that lets user choose which slice to stop:

Very close to 08-stop-activity.md:

Call /api/engine/state.
Build a list of active slices (PRIMARY/WORK_MODE/SOCIAL/SEGMENT) with their categories.
If list is empty, show “Nothing is being tracked”.
If one, pick it automatically; if multiple, Choose from List.
Extract dimension from the chosen entry (split at :).
Call /api/engine/stop with that dimension (and optionally category).
Show notification with stopped category + duration.
You can keep both variants as separate reusable shortcuts: “Stop Context Quick” and “Stop Context Picker”.

d) Core “Toggle Context” pattern

This is often what you want for Focus Mode or NFC triggers: if the context is active, stop it; otherwise start it.

Pattern:

Run Compass Config.
Call /api/engine/state.
Map your trigger to (Category, Dimension), e.g.:
Focus Deep Work → ("Deep Work", "WORK_MODE")
Focus Workout → ("Workout", "PRIMARY")
Check state:
If state[dimensionKey] exists and category matches your Category:
Call /api/engine/stop with { "dimension": Dimension, "category": Category }.
Else:
Call /api/engine/start with { "category": Category, "dimension": Dimension, "source": "SHORTCUT" }.
Optionally show a notification “Deep Work started” vs “Deep Work stopped”.
Because startSlice is idempotent when same category + linkedTaskId is already active, this pattern is robust even if automations double-fire.

e) Analytics / review shortcuts

Using /api/engine/slices and /summary:

For “Daily Time Review”:

Compute startDate = start of today, endDate = end of today in ISO.
Call /summary → get categoryBalance minutes.
Build a human-readable text summary by iterating the dictionary.
Show in a notification or “Show Result” / write to Notes.
For “What have I done in the last X hours in PRIMARY vs WORK_MODE?”:

Call /api/engine/slices with a short window and appropriate filters.
Group and aggregate inside Shortcuts if you want more custom views.
3) Concrete data contract summary for shortcuts

When designing your shortcuts, you can treat the Time Engine as expecting:

Authentication
x-api-secret header with your API_SECRET (backend/src/config/env.ts).
Start events
Required: category: string, dimension: "PRIMARY" | "WORK_MODE" | "SOCIAL" | "SEGMENT", source: "SHORTCUT".
Optional: linkedTaskId: uuid-string to tie to a specific task.
Stop events
Required: dimension.
Optional: category for validation.
Read state
GET /state → { primary, work_mode, social, segment } with category and start timestamps.
All timestamps
When starting/stopping via shortcuts, timestamps are chosen by the server at call time. Shortcuts don’t send start/end themselves.

Key constraints to keep in mind while you design your shortcuts are:

Always send category, dimension, and source: "SHORTCUT" to POST /api/engine/start, plus linkedTaskId when starting from a task.
Use POST /api/engine/stop with dimension (and optionally category for safety) to close a slice; a missing slice returns 404.
Use GET /api/engine/state as your single source of truth for logic (e.g. “if Deep Work already active, then…”).
Put baseURL and apiSecret in a shared “Compass Config” shortcut and have all others call it.
Implement your flows using the three patterns: Start Context, Stop Context, and Toggle Context; everything else (NFC, Focus, location) just feeds those.

Here’s a compact mapping grid you can use while designing shortcuts. It’s organized by trigger type and pins down category, dimension, and when to use linkedTaskId.

Focus Modes → Time Engine

Use these when a Focus automation directly drives the Time Engine (or when you “Toggle Context” based on Focus).

iOS Focus Mode	Typical use	Time Engine category	dimension	linkedTaskId usage
School	Study / coursework	School	PRIMARY	Optional; set when tied to a specific task
Music Practice	Practicing instrument	Music Practice	PRIMARY	Optional
Workout	Exercise sessions	Workout	PRIMARY	Optional
Gaming	Gaming sessions	Gaming	PRIMARY	Usually handled by Discord bot; rarely manual
Meal Prep	Cooking / prep	Meal Prep or Cooking	PRIMARY	Optional
Hygiene	Personal care	Hygiene or Personal Care	PRIMARY	Optional
Pet Care	Pet-related care	Pet Care	PRIMARY	Optional
Social	Social events as main activity	Social Time	PRIMARY	Optional
Personal	Personal projects	Personal Projects	PRIMARY	Optional
Admin	Admin mode overlay	Admin	WORK_MODE	Optional
Deep Work	Deep work overlay	Deep Work	WORK_MODE	Optional; often linked to active task
Pattern: Focus ON → POST /api/engine/start with source: "SHORTCUT".
Focus OFF → POST /api/engine/stop with matching dimension (and often matching category).
NFC / Location / Device Triggers → Time Engine

These mostly mirror shortcuts/07-start-activity.md.

Trigger	Scenario	category	dimension	Notes
Shower NFC / BT Speaker ON	Start showering	Showering	PRIMARY	OFF trigger stops PRIMARY (category optional)
Kitchen NFC	Start cooking	Cooking	PRIMARY	Often from NFC tag in kitchen
Leave Home (location)	Start commute	Commute	PRIMARY	Arrive Home automation stops Commute
Gym NFC / location	Gym workout	Workout	PRIMARY	Mirrors Workout Focus mode
Morning location/time trigger	Morning sluggish block	Morning Lag	SEGMENT	Structural block overlay
Gym block time window	Gym time block	Gym Block	SEGMENT	Structural block overlay
Manual “Start Activity” menu	Misc activities (Errands, etc.)	Menu choice	Derived*	See next row
Derived dimension rule	Deep vs Shallow vs Social contexts	e.g. Deep Work	WORK_MODE / SOCIAL / SEGMENT	As in 07-start-activity.md mapping rules
*Dimension derivation (from 07-start-activity.md):

Deep Work, Shallow Work → WORK_MODE
Discord Call → SOCIAL
Morning Lag, Gym Block → SEGMENT
Everything else → PRIMARY
Task-based (Navigate / task activation) → Time Engine

When starting a Compass task via the Navigate-like flow, you can attach slices to tasks with linkedTaskId.

Flow step	Time Engine call	category	dimension	linkedTaskId
Task activated (Navigate)	POST /api/engine/start	e.g. task.name or task category	PRIMARY	task.id (UUID from backend)
Work mode for that task (optional)	POST /api/engine/start	from focusMode (e.g. Deep Work)	WORK_MODE	task.id (same as above)
Task completed (Portside)	POST /api/engine/stop (PRIMARY, optional category)	n/a (in body)	PRIMARY	not needed in stop (dimension+category)
Clear work mode after task (optional)	POST /api/engine/stop with dimension: "WORK_MODE"	n/a	WORK_MODE	not needed in stop
Think of linkedTaskId as “analytics glue”: it lets Time History group slices by task for later views.
External automations (bot / ingestion) → Time Engine

These are mostly backend/automation, but you can mirror them for manual fallbacks.

Source	Scenario	category	dimension	source
Discord bot	Game starts/stops	Gaming	PRIMARY	API
Discord bot	Voice channel join/leave	Discord Call	SOCIAL	API
HealthKit	Sleep sessions	Sleep	PRIMARY	TIMERY/API (implementation choice)
Timery import	Historical focused work blocks	Project / description	PRIMARY	TIMERY
You can use this grid as a living reference: every new shortcut/automation should boil down to a row with (Trigger → category, dimension, optional linkedTaskId, source: "SHORTCUT"), and then call the corresponding Time Engine endpoint.
