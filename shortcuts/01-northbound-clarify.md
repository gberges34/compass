# Northbound Shortcut - Clarify Workflow

**Purpose**: Process captured tasks from Todoist, clarify their details (Category, Context, Energy), and add them to your Compass task list.

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
  x-api-key: [YOUR_API_KEY]
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

#### Step 8: Clarify Task Name (Optional)
```
Action: Ask for Input
Prompt: Review Task Name
Default Answer: TaskName
Set Variable "FinalName" to Provided Input
```

#### Step 9: Set Priority
```
Action: Choose from Menu
Prompt: Priority?
Menu Items:
  1. Must Do (P1)
  2. Should Do (P2)
  3. Could Do (P3)
  4. Maybe (P4)

Case "Must Do (P1)": Set Variable "Priority" to "MUST"
Case "Should Do (P2)": Set Variable "Priority" to "SHOULD"
Case "Could Do (P3)": Set Variable "Priority" to "COULD"
Case "Maybe (P4)": Set Variable "Priority" to "MAYBE"
```

#### Step 10: Set Duration
```
Action: Choose from Menu
Prompt: Duration?
Menu Items:
  - 15 min
  - 30 min
  - 45 min
  - 60 min
  - Custom

Case "15 min": Set Variable "Duration" to 15
...
Case "Custom": Ask for Number → Set Variable "Duration"
```

#### Step 11: Set Energy
```
Action: Choose from Menu
Prompt: Energy Required?
Menu Items:
  - High ⚡
  - Medium 😊
  - Low 😴

Case "High ⚡": Set Variable "Energy" to "HIGH"
Case "Medium 😊": Set Variable "Energy" to "MEDIUM"
Case "Low 😴": Set Variable "Energy" to "LOW"
```

#### Step 12: Set Category
```
Action: Choose from Menu
Prompt: Category?
Menu Items:
  - SCHOOL
  - MUSIC
  - FITNESS
  - GAMING
  - NUTRITION
  - HYGIENE
  - PET
  - SOCIAL
  - PERSONAL
  - ADMIN

Set Variable "Category" to Chosen Item
```

#### Step 13: Set Context
```
Action: Choose from Menu
Prompt: Context?
Menu Items:
  - HOME
  - OFFICE
  - COMPUTER
  - PHONE
  - ERRANDS
  - ANYWHERE

Set Variable "Context" to Chosen Item
```

#### Step 14: Define Done
```
Action: Ask for Input
Prompt: What does "Done" look like?
Input Type: Text
Set Variable "DefinitionOfDone" to Provided Input
```

#### Step 15: Build Process Request
```
Action: Dictionary
  tempTaskId: TaskID
  name: FinalName
  priority: Priority
  duration: Duration
  energyRequired: Energy
  category: Category
  context: Context
  definitionOfDone: DefinitionOfDone
  status: "NEXT"
```

#### Step 16: Call Process API
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/tasks/process-captured
Method: POST
Headers:
  Content-Type: application/json
  x-api-key: [YOUR_API_KEY]
Request Body: Dictionary (from Step 15)
```

#### Step 17: Celebrate
```
Action: Show Notification
Title: 🎉 Task Processed!
Body: FinalName is now in your Compass system.
```

## Testing the Shortcut

1. Add a test task via Todoist or the import API.

2. Run "Northbound" on your iPhone.

3. Step through the clarification wizard.

4. Verify the task appears in your Compass "NEXT" list with all attributes set.
