# Navigate Shortcut - Start Task

**Purpose**: Select and activate a task, set iOS Focus Mode, start Timery timer, and display Definition of Done.

## Prerequisites

1. iOS Shortcuts app
2. Timery app installed (for time tracking)
3. iOS Focus Modes set up (see Setup below)
4. Backend API accessible

## Focus Modes Setup

Create these Focus Modes in Settings → Focus:

1. **School** - For study and coursework
2. **Music Practice** - For music sessions
3. **Workout** - For fitness activities
4. **Gaming** - For gaming sessions
5. **Meal Prep** - For nutrition tasks
6. **Hygiene** - For personal care
7. **Pet Care** - For pet tasks
8. **Social** - For social activities
9. **Personal** - For personal projects
10. **Admin** - For administrative tasks
11. **Deep Work** - Default for other categories

## Shortcut Instructions

### 1. Create New Shortcut
Open iOS Shortcuts app → Create new shortcut → Name it "Navigate"

### 2. Add Actions (in order)

#### Step 1: Get NEXT Tasks
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/tasks?status=NEXT
Method: GET
Headers:
  Content-Type: application/json
```

#### Step 2: Parse Response
```
Action: Get Dictionary from Input
Input: Contents of URL
```

#### Step 3: Check if Empty
```
Action: Count Items in Dictionary
Action: If Count | is | 0
Then:
  Action: Show Alert
  Title: No tasks ready
  Message: Go to Northbound to clarify some tasks first!
  Action: Exit Shortcut
```

#### Step 4: Build Task Menu Items
```
Action: Repeat with Each (Dictionary)
  Action: Text
  Content: [Repeat Item.name] ([Repeat Item.duration] min)
  Action: Add to Variable "TaskMenuItems"
```

#### Step 5: Show Task Selection
```
Action: Choose from List
Prompt: Which task to start?
List: TaskMenuItems
```

#### Step 6: Find Selected Task
```
Action: Repeat with Each (Dictionary)
  Action: Text: [Repeat Item.name] ([Repeat Item.duration] min)
  Action: If Text | is | Chosen Item
    Action: Set Variable "SelectedTask" to Repeat Item
    Action: Exit Loop
```

#### Step 7: Get Task ID
```
Action: Get Dictionary Value
Key: id
Dictionary: SelectedTask
Set Variable: TaskID
```

#### Step 8: Activate Task
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/tasks/[TaskID]/activate
Method: POST
Headers:
  Content-Type: application/json
```

#### Step 9: Parse Activation Response
```
Action: Get Dictionary from Input
```

#### Step 10: Extract Response Fields
```
Action: Get Dictionary Value
  - "focusMode" → Set Variable "FocusMode"
  - "definitionOfDone" → Set Variable "DoD"
  - "timeryProject" → Set Variable "TimeryProject"

Action: Get Dictionary from "task"
  - "name" → Set Variable "TaskName"
  - "duration" → Set Variable "Duration"
  - "energyRequired" → Set Variable "Energy"
```

#### Step 11: Set Focus Mode
```
Action: Set Focus
Focus: FocusMode
Turn On/Off: Turn On
Duration: Until Turned Off Manually
```

#### Step 12: Start Timery Timer
```
Action: Run Shortcut
Shortcut: Start Timery Timer (built-in Timery action)
Input:
  Description: TaskName
  Project: TimeryProject
```

**Alternative if Timery integration not available:**
```
Action: Open URL
URL: timery://start?description=[TaskName]&project=[TimeryProject]
```

#### Step 13: Build DoD Display
```
Action: Text
Content:
🎯 ACTIVE TASK
─────────────
TaskName

⏱️ Duration: Duration minutes
⚡ Energy: Energy
🔔 Focus: FocusMode

✓ DEFINITION OF DONE:
DoD
─────────────
✅ Complete this, then run Portside!
```

#### Step 14: Show DoD
```
Action: Show Notification
Title: Task Started!
Body: Text (from Step 13)
```

#### Step 15: Optional - Set Reminder
```
Action: Add New Reminder
Title: Complete [TaskName]
Alert: In Duration minutes
List: Compass
```

## Timery Integration Options

### Option A: Use Timery Shortcut Actions
If you have Timery installed, it provides Shortcuts actions:
1. Open Shortcuts
2. Add Action → Apps → Timery
3. Use "Start Timer" action

### Option B: Use URL Scheme
Timery supports URL schemes:
```
timery://start?description=TASK_NAME&project=PROJECT_NAME
```

### Option C: Manual Toggl API
```
Action: Get Contents of URL
URL: https://api.track.toggl.com/api/v9/time_entries
Method: POST
Headers:
  Content-Type: application/json
  Authorization: Basic [BASE64_ENCODED_TOKEN]
Body:
{
  "description": "TaskName",
  "project_id": "PROJECT_ID",
  "workspace_id": "WORKSPACE_ID",
  "start": "CURRENT_ISO_TIMESTAMP",
  "duration": -1,
  "created_with": "Compass"
}
```

## Testing the Shortcut

1. Make sure you have some NEXT tasks:
```bash
curl http://localhost:3001/api/tasks?status=NEXT
```

2. Run Navigate shortcut
3. Select a task
4. Verify:
   - Focus Mode is activated
   - Timery timer starts
   - Definition of Done is displayed
   - Task status changes to ACTIVE

## Troubleshooting

**Focus Mode not switching**
- Check Focus Mode names match exactly
- Enable Shortcuts to control Focus in Settings → Shortcuts → Focus

**Timery not starting**
- Verify Timery is installed
- Check URL scheme works: timery://
- Try manual Toggl API approach

**Task not activating**
- Check task status: `curl http://localhost:3001/api/tasks/TASK_ID`
- Verify task exists in database

## Tips

1. **Quick Access**: Add Navigate to Home Screen widget for one-tap access
2. **Siri**: Enable "Hey Siri, Navigate" for voice activation
3. **Automation**: Set up automatic trigger when leaving home WiFi
4. **Back-to-Back**: Use with Pomodoro timer for 25-min deep work blocks

## Next Steps

After creating Navigate:
1. Start a task with Navigate
2. Work on it for the estimated duration
3. Use Portside shortcut to complete and log the task
