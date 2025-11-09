# Northbound Shortcut - Clarify Workflow

**Purpose**: Process captured tasks from Todoist, enrich them with Claude AI, and add them to your Compass task list.

## Prerequisites

1. iOS Shortcuts app installed
2. Backend API accessible from iPhone (see Setup Options below)

## Setup Options for Backend Access

### Option A: Deploy Backend to Railway (Recommended)
```bash
# From ~/compass/backend directory
# 1. Install Railway CLI: https://docs.railway.app/develop/cli
# 2. Login and deploy:
railway login
railway up
railway domain  # Get your public URL
```

Your backend URL will be something like: `https://your-app.up.railway.app`

### Option B: Use ngrok for Local Testing
```bash
# Install ngrok: https://ngrok.com/download
# Run in a separate terminal:
cd ~/compass/backend
npm run dev

# In another terminal:
ngrok http 3001
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### Option C: Same Network (WiFi only)
```bash
# Get your Mac's local IP:
ipconfig getifaddr en0

# Use http://YOUR_LOCAL_IP:3001 as base URL
# Example: http://192.168.1.100:3001
```

## Shortcut Instructions

### 1. Create New Shortcut
Open iOS Shortcuts app → Create new shortcut → Name it "Northbound"

### 2. Add Actions (in order)

#### Step 1: Get Pending Tasks
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/todoist/pending
Method: GET
Headers:
  Content-Type: application/json
```

#### Step 2: Parse Response
```
Action: Get Dictionary from Input
Input: Contents of URL
```

#### Step 3: Extract Tasks Array
```
Action: Get Dictionary Value
Key: tasks
Dictionary: Dictionary
```

#### Step 4: Check if Empty
```
Action: If
Condition: Tasks | is | empty
Then:
  Action: Show Alert
  Title: No pending tasks
  Message: All caught up! No tasks to clarify.
  Action: Exit Shortcut
```

#### Step 5: Show Task Selection Menu
```
Action: Choose from List
Prompt: Select a task to clarify
List: Repeat with Each (Tasks)
  Item: Get Dictionary Value (key: "name")
```

#### Step 6: Find Selected Task
```
Action: Repeat with Each (Tasks)
  Action: Get Dictionary Value (key: "name")
  Action: If (Dictionary Value | is | Chosen Item)
    Action: Set Variable "SelectedTask" to Repeat Item
```

#### Step 7: Get Task Details
```
Action: Get Dictionary Value from SelectedTask
  - Get "id" → Set Variable "TaskID"
  - Get "name" → Set Variable "TaskName"
  - Get "dueDate" → Set Variable "DueDate"
```

#### Step 8: Ask for Priority
```
Action: Choose from Menu
Prompt: Priority for this task?
Menu Items:
  1. Must Do (P1)
  2. Should Do (P2)
  3. Could Do (P3)
  4. Maybe (P4)

Case "Must Do (P1)": Set Variable "Priority" to 1
Case "Should Do (P2)": Set Variable "Priority" to 2
Case "Could Do (P3)": Set Variable "Priority" to 3
Case "Maybe (P4)": Set Variable "Priority" to 4
```

#### Step 9: Ask for Duration
```
Action: Choose from Menu
Prompt: How long will this take?
Menu Items:
  - 15 minutes
  - 30 minutes
  - 45 minutes
  - 60 minutes
  - 90 minutes
  - 120 minutes
  - Custom

Case "15 minutes": Set Variable "Duration" to 15
Case "30 minutes": Set Variable "Duration" to 30
Case "45 minutes": Set Variable "Duration" to 45
Case "60 minutes": Set Variable "Duration" to 60
Case "90 minutes": Set Variable "Duration" to 90
Case "120 minutes": Set Variable "Duration" to 120
Case "Custom":
  Action: Ask for Input
  Prompt: Enter duration in minutes
  Input Type: Number
  Set Variable "Duration" to Provided Input
```

#### Step 10: Ask for Energy Level
```
Action: Choose from Menu
Prompt: Energy level required?
Menu Items:
  - High (Deep focus)
  - Medium (Normal)
  - Low (Easy tasks)

Case "High": Set Variable "Energy" to "HIGH"
Case "Medium": Set Variable "Energy" to "MEDIUM"
Case "Low": Set Variable "Energy" to "LOW"
```

#### Step 11: Show Processing Alert
```
Action: Show Notification
Title: Enriching task...
Body: Claude is analyzing your task
```

#### Step 12: Build Enrichment Request
```
Action: Dictionary
  tempTaskId: TaskID
  priority: Priority
  duration: Duration
  energy: Energy
```

#### Step 13: Call Enrich API
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/tasks/enrich
Method: POST
Headers:
  Content-Type: application/json
Request Body: Dictionary (from Step 12)
```

#### Step 14: Parse Enriched Task
```
Action: Get Dictionary from Input
```

#### Step 15: Extract Enriched Fields
```
Action: Get Dictionary Value
  - "name" → Set Variable "EnrichedName"
  - "category" → Set Variable "Category"
  - "context" → Set Variable "Context"
  - "definitionOfDone" → Set Variable "DoD"
  - "status" → Set Variable "Status"
```

#### Step 16: Build Confirmation Message
```
Action: Text
Content:
✅ Task Enriched!

📝 Name: EnrichedName
📂 Category: Category
📍 Context: Context
⚡ Energy: Energy
⏱️ Duration: Duration min
🎯 Priority: Priority

✓ Definition of Done:
DoD

Status: Status
```

#### Step 17: Show Confirmation
```
Action: Show Alert
Title: Task Ready
Message: Text (from Step 16)
Show Cancel Button: ON
```

#### Step 18: Celebrate
```
Action: Show Notification
Title: 🎉 Task added!
Body: EnrichedName is now in your task list
```

## Testing the Shortcut

1. First, add test tasks via Todoist import:
```bash
curl -X POST http://localhost:3001/api/todoist/import \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "name": "Review quarterly metrics",
        "due": "2025-11-15T17:00:00Z"
      },
      {
        "name": "Call dentist for appointment"
      }
    ]
  }'
```

2. Run the Northbound shortcut on your iPhone
3. Select a task, set priority/duration/energy
4. Verify enrichment happens and task is created

## Troubleshooting

**"Could not connect to server"**
- Check backend is running: `curl http://localhost:3001/health`
- Verify iPhone can reach backend URL
- Check firewall settings

**"No pending tasks"**
- Verify tasks exist: `curl http://localhost:3001/api/todoist/pending`
- Check database connection

**Enrichment fails**
- Verify Claude API key in backend `.env`
- Check API credits: https://console.anthropic.com/

## Next Steps

After creating this shortcut:
1. Add to home screen or widget
2. Create Navigate shortcut (for starting tasks)
3. Create Portside shortcut (for completing tasks)
