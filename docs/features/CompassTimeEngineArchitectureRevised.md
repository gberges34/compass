# Compass Time Engine – Revised Architecture (Stateful)

**Status:** Implementation Phase
**Owner:** Compass Engineering
**Scope:** Time collection, storage, and API interface.
**Architecture Style:** Stateful / Transactional (Prisma + Express)

---

## 1. Purpose

To establish a centralized **Time Engine** that tracks *how time is spent* independently of *what tasks are completed*. This engine runs parallel to the existing Task/PostDoLog system, allowing for:

1. **Continuous Tracking:** Tracking activities like "Sleep", "Commute", or "Gaming" that are not "Tasks".
2. **Multi-Dimensionality:** Storing overlapping contexts (e.g., "Deep Work" occurring simultaneously with "Software Development").
3. **Shortcut-First Design:** Acting as the backend receiver for iOS Shortcuts and hardware automations.

---

## 2. Core Concepts

### 2.1 The "Stateful" Approach

Unlike the initial Event Sourcing draft, this architecture is **Stateful**. The Engine maintains the "Current Truth" in the database.

* **Write Logic:** When a new activity starts, the Engine transactionally "closes" the previous conflicting activity and "opens" the new one.
* **Read Logic:** The state of the user is simply the set of open `TimeSlice` rows (where `end` is `NULL`).

### 2.2 Dimensions (Mutual Exclusion Scopes)

Time is tracked across parallel **Dimensions**. Rules for overlap are enforced *within* a dimension, but not *across* them.

| Dimension       | Description                            | Example Values                            |
| :-------------- | :------------------------------------- | :---------------------------------------- |
| **`PRIMARY`**   | The main activity. Mutually exclusive. | Sleep, Gaming, Coding, Cooking, Workout   |
| **`WORK_MODE`** | The cognitive mode overlay.            | Deep Work, Shallow Work, Admin            |
| **`SOCIAL`**    | Social context overlay.                | Discord Call, In-Person, Date Night       |
| **`SEGMENT`**   | Broad day structure.                   | Morning Lag, Gym Block, Evening Wind-down |

**Rules:**

* You CANNOT have two `PRIMARY` slices active at once (e.g., Sleeping and Gaming).
* You CAN have `PRIMARY` (Coding) and `WORK_MODE` (Deep Work) active at once.

---

## 3. Data Architecture

### 3.1 The `TimeSlice` Model

A dedicated table in Postgres (via Prisma) that records time blocks. This is independent of the `Task` or `PostDoLog` tables.

```prisma
model TimeSlice {
  id        String    @id @default(uuid())
  
  // Timing
  start     DateTime
  end       DateTime?  // NULL indicates "Currently Active"
  
  // Classification
  category  String     // e.g., "Sleep", "Coding", "Deep Work"
  dimension String     // "PRIMARY", "WORK_MODE", "SOCIAL", "SEGMENT"
  
  // Metadata
  source    String     // "SHORTCUT", "TIMERY", "MANUAL", "API"
  isLocked  Boolean    @default(false) // If true, auto-rules won't overwrite
  
  // Optional: Loose coupling to Tasks for future analytics
  linkedTaskId String? 
  
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  // Indexes for fast "What am I doing?" lookups
  @@index([start, end])
  @@index([dimension, end]) 
}
```

### 3.2 Relationship to Tasks (PostDoLog)

* **PostDoLog:** Remains the system of record for Task Completion ("I finished Ticket X"). It is tightly coupled to the Task entity.
* **TimeSlice:** Becomes the system of record for Time Usage ("I sat at my computer for 4 hours").

**Decoupling:** The Time Engine does not require a Task to exist. However, when a Task is started in the UI, the backend may optionally create a corresponding `TimeSlice` to keep them visually synced.

---

## 4. Engine Logic (Service Layer)

The `TimeEngineService` encapsulates the rules for ensuring data integrity during writes.

### 4.1 Operation: `startSlice(category, dimension)`

When a request comes in to start an activity:

1. **Transaction Start:** Begin a database transaction.
2. **Find Conflict:** Query `TimeSlice` for any row where `dimension == input.dimension` AND `end IS NULL`.
3. **Close Conflict:** If a row is found, update its `end` time to `NOW()`.
4. **Create New:** Insert the new `TimeSlice` with `start = NOW()` and `end = NULL`.
5. **Transaction Commit.**

### 4.2 Operation: `stopSlice(dimension)`

When a request comes in to stop a specific context (e.g., "Turn off Deep Work"):

1. **Find Active:** Query `TimeSlice` for the row where `dimension == input.dimension` AND `end IS NULL`.
2. **Close:** Update `end` to `NOW()`.

---

## 5. API Interface (Integration Layer)

The Engine exposes REST endpoints specifically designed for iOS Shortcuts and external scripts.

### 5.1 Endpoints

#### 5.1.1 `POST /api/engine/start`

Starts a new activity. Automatically handles "stop previous" logic.

**Payload:**

```json
{
  "category": "Sleep",
  "dimension": "PRIMARY",
  "source": "SHORTCUT_BEDTIME"
}
```

#### 5.1.2 `POST /api/engine/stop`

Stops the active slice for a dimension.

**Payload:**

```json
{
  "dimension": "PRIMARY"
}
```

Optional behavior: If `category` is provided, the service validates that the active slice matches the category before stopping.

#### 5.1.3 `GET /api/engine/state`

Returns the full snapshot of the user's current context. Used by Shortcuts to make logic decisions (e.g., "If I am already in Deep Work, do X").

**Response:**

```json
{
  "primary":   { "category": "Coding",        "start": "2023-10-27T10:00:00Z" },
  "work_mode": { "category": "Deep Work",     "start": "2023-10-27T10:15:00Z" },
  "social":    null,
  "segment":   { "category": "Morning Block", "start": "2023-10-27T08:00:00Z" }
}
```

---

## 6. Integrations

### 6.1 Hardware & Shortcuts

Hardware integrations (Shower Speaker, Smart Plugs, etc.) do not communicate with the backend directly. They trigger iOS Shortcuts, which then call the Compass API.

* **Flow 1:** `NFC Tag -> iOS Shortcut -> POST /api/engine/start`
* **Flow 2:** `Focus Mode ON -> iOS Automation -> POST /api/engine/start`

### 6.2 Timery / Toggl

Legacy Timery syncing can be migrated to this engine.

* **Ingestion Job:** A background job can poll Timery and insert `TimeSlice` records for historical accuracy, mapping Toggl Projects to Compass Categories.
