# Stop Activity Shortcut - Time Engine

**Purpose**: Stop tracking the current activity in a specific dimension. Closes the active TimeSlice.

## Prerequisites

1. iOS Shortcuts app
2. Backend API accessible
3. Active time slice to stop

## API Endpoint

```
POST /api/engine/stop

{
  "dimension": "PRIMARY"
}
```

Optional: Include `category` for validation (only stops if category matches).

## Shortcut Instructions

### 1. Create New Shortcut
Open iOS Shortcuts app → Create new shortcut → Name it "Stop Activity"

### 2. Add Actions (in order)

#### Step 1: Get Current State
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/engine/state
Method: GET
Headers:
  Content-Type: application/json
  x-api-secret: [YOUR_API_SECRET]
```

#### Step 2: Parse State
```
Action: Get Dictionary from Input
```

#### Step 3: Build Active Slices List
```
Action: Set Variable "ActiveSlices" to Empty List

Action: Get Dictionary Value (key: "primary")
Action: If primary | is not | empty
  Action: Add "PRIMARY: [primary.category]" to ActiveSlices

Action: Get Dictionary Value (key: "work_mode")
Action: If work_mode | is not | empty
  Action: Add "WORK_MODE: [work_mode.category]" to ActiveSlices

Action: Get Dictionary Value (key: "social")
Action: If social | is not | empty
  Action: Add "SOCIAL: [social.category]" to ActiveSlices

Action: Get Dictionary Value (key: "segment")
Action: If segment | is not | empty
  Action: Add "SEGMENT: [segment.category]" to ActiveSlices
```

#### Step 4: Check if Any Active
```
Action: Count Items in ActiveSlices
Action: If Count | is | 0
  Action: Show Alert
  Title: No Active Tracking
  Message: Nothing is being tracked right now.
  Action: Exit Shortcut
```

#### Step 5: Choose Slice to Stop
```
Action: If Count | is | 1
  Action: Get Item from List (Item 1)
  Set Variable: SelectedSlice
Else
  Action: Choose from List
  Prompt: Which activity to stop?
  List: ActiveSlices
  Set Variable: SelectedSlice
```

#### Step 6: Extract Dimension
```
Action: Split Text (by ":")
Input: SelectedSlice
Get Item: 1
Set Variable: Dimension
```

#### Step 7: Build Stop Request
```
Action: Dictionary
{
  "dimension": Dimension
}
```

#### Step 8: Call Stop API
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/engine/stop
Method: POST
Headers:
  Content-Type: application/json
  x-api-secret: [YOUR_API_SECRET]
Body: Dictionary (from Step 7)
```

#### Step 9: Parse Response
```
Action: Get Dictionary from Input
Action: Get Dictionary Value
  - "category" → Set Variable "StoppedCategory"
  - "start" → Set Variable "StartTime"
  - "end" → Set Variable "EndTime"
```

#### Step 10: Calculate Duration
```
Action: Get Time Between Dates
Start: StartTime
End: EndTime
In: Minutes
Set Variable: Duration
```

#### Step 11: Show Confirmation
```
Action: Show Notification
Title: ⏹️ Activity Stopped
Body: StoppedCategory - Duration min
Sound: Default
```

## Quick Stop Variants

### Stop PRIMARY Only
For automations that should only stop the main activity:

```
Action: Dictionary
{
  "dimension": "PRIMARY"
}

Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/engine/stop
Method: POST
Body: Dictionary
```

### Stop WORK_MODE Only
For Focus Mode OFF automations:

```
Action: Dictionary
{
  "dimension": "WORK_MODE"
}

Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/engine/stop
Method: POST
Body: Dictionary
```

## Automation Triggers

### Focus Mode OFF (Deep Work)
```
Automation: When Focus Mode turns off
Focus: Deep Work

Actions:
1. Call POST /api/engine/stop with dimension: "WORK_MODE"
```

### Focus Mode OFF (Workout)
```
Automation: When Focus Mode turns off
Focus: Workout

Actions:
1. Call POST /api/engine/stop with dimension: "PRIMARY"
```

### Arrive Home (Stop Commute)
```
Automation: When I arrive at Home

Actions:
1. Call POST /api/engine/stop with:
   - dimension: "PRIMARY"
   - category: "Commute" (optional validation)
```

### Bluetooth Disconnect (Shower Speaker)
```
Automation: When Bluetooth device disconnects
Device: Shower Speaker

Actions:
1. Call POST /api/engine/stop with:
   - dimension: "PRIMARY"
   - category: "Showering"
```

## External Automation Sources

### Discord Bot (Gaming + Social)

The Discord Bot handles stopping these categories automatically:

| Category | Dimension | Trigger | Flow |
|----------|-----------|---------|------|
| **Gaming** | PRIMARY | Game activity ends | Bot → Gaming Focus Mode OFF → iOS Automation → API |
| **Discord Call** | SOCIAL | Voice channel leave | Bot → Direct API call |

**Why SOCIAL dimension for Discord Call?**
Discord Call uses the SOCIAL dimension so it can **overlap with PRIMARY activities**. When you leave a voice channel, only the SOCIAL slice is stopped - your PRIMARY activity continues uninterrupted.

You typically do NOT need manual shortcuts for stopping Gaming or Discord Call - the Discord Bot handles it.

## Error Handling

The API returns 404 if no active slice exists for the dimension. Handle this gracefully:

```
Action: Get Contents of URL
...

Action: If Error
  Action: Show Alert
  Title: Already Stopped
  Message: No activity was being tracked.
```

## Testing

1. Start an activity first (via Start Activity shortcut)
2. Run Stop Activity
3. Select the activity to stop
4. Verify via API:
```bash
curl https://YOUR_BACKEND_URL/api/engine/state
```

All dimensions should show `null` after stopping.

## Tips

1. **Quick Stop**: Create dedicated "Stop Commute", "Stop Workout" shortcuts for common activities
2. **Home Screen Widget**: Add Stop Activity to home screen for easy access
3. **Siri**: Enable "Hey Siri, Stop Activity" for voice control
4. **Don't Double-Stop**: Gaming/Discord Call are stopped automatically by the Discord Bot

