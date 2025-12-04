# Start Activity Shortcut - Time Engine

**Purpose**: Start tracking a non-task activity via the Time Engine. Automatically closes any conflicting activity in the same dimension.

## Prerequisites

1. iOS Shortcuts app
2. Backend API accessible
3. Optional: NFC tags for specific activities

## When to Use

Use this shortcut when you're starting an activity that is NOT a Compass Task:
- Showering (via NFC/Bluetooth)
- Cooking (via kitchen NFC)
- Commute (via location automation)
- Deep Work mode (via Focus Mode)
- Workout (via gym location/Focus)

**Note:** Some activities have dedicated automation sources:
- **Sleep** → HealthKit API (no shortcut needed - authoritative source)
- **Gaming** → Discord Bot → Gaming Focus Mode (automatic)
- **Discord Call** → Discord Bot (usually automatic) - SOCIAL dimension, can overlap with PRIMARY activities

## API Endpoint

```
POST /api/engine/start

{
  "category": "Showering",
  "dimension": "PRIMARY",
  "source": "SHORTCUT"
}
```

## Shortcut Instructions

### 1. Create New Shortcut
Open iOS Shortcuts app → Create new shortcut → Name it "Start Activity"

### 2. Add Actions (in order)

#### Step 1: Choose Activity Category
```
Action: Choose from Menu
Prompt: What are you starting?
Menu Items:
  - Showering
  - Cooking
  - Commute
  - Workout
  - Personal Care
  - Errands
  - Deep Work
  - Shallow Work
  - Discord Call
  - Morning Lag
  - Gym Block
  - Custom...

Case "Showering": Set Variable "Category" to "Showering"
Case "Cooking": Set Variable "Category" to "Cooking"
Case "Commute": Set Variable "Category" to "Commute"
Case "Workout": Set Variable "Category" to "Workout"
Case "Personal Care": Set Variable "Category" to "Personal Care"
Case "Errands": Set Variable "Category" to "Errands"
Case "Deep Work": Set Variable "Category" to "Deep Work"
Case "Shallow Work": Set Variable "Category" to "Shallow Work"
Case "Discord Call": Set Variable "Category" to "Discord Call"
Case "Morning Lag": Set Variable "Category" to "Morning Lag"
Case "Gym Block": Set Variable "Category" to "Gym Block"
Case "Custom...":
  Action: Ask for Input
  Prompt: Enter activity name
  Set Variable: Category
```

#### Step 2: Determine Dimension
```
Action: If Category | is | Deep Work
  Set Variable "Dimension" to "WORK_MODE"
Else If Category | is | Shallow Work
  Set Variable "Dimension" to "WORK_MODE"
Else If Category | is | Discord Call
  Set Variable "Dimension" to "SOCIAL"
Else If Category | is | Morning Lag
  Set Variable "Dimension" to "SEGMENT"
Else If Category | is | Gym Block
  Set Variable "Dimension" to "SEGMENT"
Else
  Set Variable "Dimension" to "PRIMARY"
End If
```

#### Step 3: Build API Request
```
Action: Dictionary
{
  "category": Category,
  "dimension": Dimension,
  "source": "SHORTCUT"
}
```

#### Step 4: Call Time Engine API
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/engine/start
Method: POST
Headers:
  Content-Type: application/json
  x-api-secret: [YOUR_API_SECRET]
Body: Dictionary (from Step 3)
```

#### Step 5: Parse Response
```
Action: Get Dictionary from Input
Action: Get Dictionary Value
  - "category" → Set Variable "StartedCategory"
  - "start" → Set Variable "StartTime"
```

#### Step 6: Show Confirmation
```
Action: Show Notification
Title: ⏱️ Activity Started
Body: StartedCategory tracking started
Sound: Default
```

## Automation Triggers

### NFC Tag (e.g., Kitchen)
```
Automation: When NFC Tag is scanned
Tag: Kitchen Counter

Actions:
1. Set Variable "Category" to "Cooking"
2. Set Variable "Dimension" to "PRIMARY"
3. Run Start Activity shortcut with inputs
```

### Bluetooth Device (Shower Speaker)
```
Automation: When Bluetooth device connects
Device: Shower Speaker

Actions:
1. Set Variable "Category" to "Showering"
2. Set Variable "Dimension" to "PRIMARY"
3. Call POST /api/engine/start directly
```

**Note:** Shower Speaker only signals "I'm showering" - it is NOT used for morning/evening routines.

### Location (Leave Home)
```
Automation: When I leave Home

Actions:
1. Set Variable "Category" to "Commute"
2. Call POST /api/engine/start
```

### Focus Mode (Deep Work ON)
```
Automation: When Focus Mode turns on
Focus: Deep Work

Actions:
1. Set Variable "Category" to "Deep Work"
2. Set Variable "Dimension" to "WORK_MODE"
3. Call POST /api/engine/start
```

### Focus Mode (Workout ON)
```
Automation: When Focus Mode turns on
Focus: Workout

Actions:
1. Set Variable "Category" to "Workout"
2. Set Variable "Dimension" to "PRIMARY"
3. Call POST /api/engine/start
```

## External Automation Sources

### Discord Bot (Gaming + Social)

The Discord Bot handles these categories automatically:

| Category | Dimension | Trigger | Flow |
|----------|-----------|---------|------|
| **Gaming** | PRIMARY | Game activity detected | Bot → Gaming Focus Mode → iOS Automation → API |
| **Discord Call** | SOCIAL | Voice channel join | Bot → Direct API call |

**Why SOCIAL dimension for Discord Call?**
The SOCIAL dimension allows Discord Call to **overlap with PRIMARY activities**. For example:
- You can be **Coding (PRIMARY)** + **Discord Call (SOCIAL)** simultaneously
- You can be **Gaming (PRIMARY)** + **Discord Call (SOCIAL)** simultaneously

This is by design - the Time Engine supports multi-dimensional tracking.

You typically do NOT need manual shortcuts for Gaming or Discord Call - the Discord Bot handles them. However, Discord Call can be started manually if needed.

### HealthKit (Sleep)

Sleep data comes from HealthKit, not from manual shortcuts. A background ingestion job syncs sleep data to TimeSlices.

## Testing

1. Run the shortcut manually
2. Select "Cooking" as the activity
3. Verify via API:
```bash
curl https://YOUR_BACKEND_URL/api/engine/state
```

Expected response:
```json
{
  "primary": { "category": "Cooking", "start": "2025-12-03T10:00:00Z" },
  "work_mode": null,
  "social": null,
  "segment": null
}
```

## Tips

1. **Quick Actions**: Add specific NFC automations for frequently-used activities
2. **Home Screen Widget**: Add shortcut to home screen for one-tap access
3. **Siri**: Enable "Hey Siri, Start Activity" for voice activation
4. **Avoid Duplicates**: Don't manually start Gaming/Sleep/Discord - they're automated

