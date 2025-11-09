# Portside Shortcut - Complete Task

**Purpose**: Complete an active task, stop Timery timer, capture Post-Do reflection, and create analytics log.

## Prerequisites

1. iOS Shortcuts app
2. Timery app with running timer
3. Backend API accessible
4. Active task (started with Navigate shortcut)

## Shortcut Instructions

### 1. Create New Shortcut
Open iOS Shortcuts app → Create new shortcut → Name it "Portside"

### 2. Add Actions (in order)

#### Step 1: Get Active Tasks
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/tasks?status=ACTIVE
Method: GET
Headers:
  Content-Type: application/json
```

#### Step 2: Parse Response
```
Action: Get Dictionary from Input
```

#### Step 3: Check if Empty
```
Action: Count Items in Dictionary
Action: If Count | is | 0
Then:
  Action: Show Alert
  Title: No active task
  Message: Use Navigate to start a task first!
  Action: Exit Shortcut
```

#### Step 4: Handle Multiple Active Tasks
```
Action: If Count | is greater than | 1
Then:
  Action: Repeat with Each (Dictionary)
    Action: Text: [Repeat Item.name]
    Action: Add to Variable "TaskNames"

  Action: Choose from List
  Prompt: Multiple tasks active. Which one did you complete?
  List: TaskNames

  Action: Repeat with Each (Dictionary)
    Action: If [Repeat Item.name] | is | Chosen Item
      Action: Set Variable "ActiveTask" to Repeat Item
      Action: Exit Loop
Else:
  Action: Get Item from List
  List: Dictionary
  Item Number: 1
  Set Variable: ActiveTask
```

#### Step 5: Extract Task Details
```
Action: Get Dictionary Value from ActiveTask
  - "id" → Set Variable "TaskID"
  - "name" → Set Variable "TaskName"
  - "duration" → Set Variable "EstimatedDuration"
  - "definitionOfDone" → Set Variable "DoD"
```

#### Step 6: Stop Timery Timer
```
Action: Run Shortcut
Shortcut: Stop Timery Timer (Timery action)
Output: TimeryData
```

**Alternative - URL Scheme:**
```
Action: Open URL
URL: timery://stop
Wait to Return: ON
```

**Alternative - Get Current Entry via API:**
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/timery/current
Method: GET
Headers:
  Content-Type: application/json
Set Variable: TimeryData
```

#### Step 7: Parse Timery Data
```
Action: Get Dictionary from TimeryData
Action: Get Dictionary Value
  - "duration" → Set Variable "ActualDuration"
  - "startTime" → Set Variable "StartTime"
  - "endTime" → Set Variable "EndTime"
```

#### Step 8: Show DoD for Reference
```
Action: Show Alert
Title: Task Complete!
Message: Did you achieve this?

DoD

Select OK to continue.
```

#### Step 9: Ask for Outcome
```
Action: Ask for Input
Prompt: What did you accomplish?
Default Text: TaskName
Input Type: Text (multiline)
Set Variable: Outcome
```

#### Step 10: Ask for Effort Level
```
Action: Choose from Menu
Prompt: How hard was this task?
Menu Items:
  - Easy (barely tried)
  - Medium (good effort)
  - Hard (very challenging)

Case "Easy": Set Variable "Effort" to "EASY"
Case "Medium": Set Variable "Effort" to "MEDIUM"
Case "Hard": Set Variable "Effort" to "HARD"
```

#### Step 11: Ask for Key Insight
```
Action: Ask for Input
Prompt: What did you learn or realize?
Placeholder: e.g., "The research phase took longer than coding"
Input Type: Text (multiline)
Set Variable: KeyInsight
```

#### Step 12: Calculate Variance Preview
```
Action: Calculate
Formula: ActualDuration - EstimatedDuration
Set Variable: Variance

Action: Text
Content:
📊 Quick Stats:
Estimated: EstimatedDuration min
Actual: ActualDuration min
Variance: Variance min
```

#### Step 13: Show Stats Preview
```
Action: Show Notification
Title: Task Metrics
Body: Text (from Step 12)
```

#### Step 14: Build Completion Request
```
Action: Dictionary
{
  "outcome": Outcome,
  "effortLevel": Effort,
  "keyInsight": KeyInsight,
  "actualDuration": ActualDuration,
  "startTime": StartTime,
  "endTime": EndTime
}
```

#### Step 15: Complete Task
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/tasks/[TaskID]/complete
Method: POST
Headers:
  Content-Type: application/json
Body: Dictionary (from Step 14)
```

#### Step 16: Parse Completion Response
```
Action: Get Dictionary from Input
```

#### Step 17: Extract Metrics
```
Action: Get Dictionary from "metrics"
  - "efficiency" → Set Variable "Efficiency"
  - "variance" → Set Variable "FinalVariance"
  - "timeOfDay" → Set Variable "TimeOfDay"
  - "dayOfWeek" → Set Variable "DayOfWeek"
```

#### Step 18: Build Success Message
```
Action: Text
Content:
✅ TASK COMPLETED!
─────────────
TaskName

📈 PERFORMANCE METRICS
─────────────
⏱️ Time: ActualDuration min (est. EstimatedDuration)
📊 Efficiency: Efficiency%
📉 Variance: FinalVariance min
🕐 Time of Day: TimeOfDay
📅 Day: DayOfWeek
💪 Effort: Effort

🎯 OUTCOME:
Outcome

💡 KEY INSIGHT:
KeyInsight
─────────────
Great work! 🎉
```

#### Step 19: Show Completion
```
Action: Show Alert
Title: Task Logged!
Message: Text (from Step 18)
```

#### Step 20: Turn Off Focus Mode
```
Action: Set Focus
Focus: Do Not Disturb  (or whatever was set)
Turn On/Off: Turn Off
```

#### Step 21: Optional - Reward Check
```
Action: Get Dictionary Value
Key: reward
Dictionary: ActiveTask

Action: If reward | is not | empty
Then:
  Action: Show Notification
  Title: 🎁 Reward Time!
  Body: reward
  Sound: Default
```

## Advanced: Timery Integration

### Get Timer Data Directly from Toggl

If Timery doesn't provide output, call Toggl API directly:

```
Action: Get Contents of URL
URL: https://api.track.toggl.com/api/v9/me/time_entries/current
Method: GET
Headers:
  Content-Type: application/json
  Authorization: Basic [BASE64_ENCODED_TOKEN:api_token]

Action: Get Dictionary from Input
Action: Get Dictionary Value
  - "duration" → Calculate: -(duration) / 60 → ActualDuration
  - "start" → StartTime
```

Stop the timer:
```
Action: Get Dictionary Value (key: "id") → TimerID

Action: Get Contents of URL
URL: https://api.track.toggl.com/api/v9/time_entries/[TimerID]/stop
Method: PATCH
Headers:
  Authorization: Basic [BASE64_ENCODED_TOKEN]
```

### Backend Timery Endpoint

Alternatively, use the backend endpoint (if you set up Toggl token in .env):

```bash
# Add to backend .env:
TOGGL_API_TOKEN=your_toggl_api_token_here
```

Then in shortcut:
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/timery/stop
Method: POST
```

## Testing the Shortcut

1. Start a task with Navigate
2. Work on it for a bit
3. Run Portside
4. Fill in reflection questions
5. Verify:
   - Timery stops
   - Post-Do log is created
   - Task status changes to DONE
   - Metrics are calculated

Check the log:
```bash
curl http://localhost:3001/api/tasks/TASK_ID
```

## Troubleshooting

**Timery not stopping**
- Check Timery is running
- Try manual Toggl API approach
- Verify TOGGL_API_TOKEN in backend

**No active task found**
- Check task status: `curl http://localhost:3001/api/tasks?status=ACTIVE`
- Make sure you ran Navigate first

**Completion fails**
- Verify all required fields are filled
- Check startTime/endTime format (ISO 8601)
- Look at backend logs

**Focus Mode not turning off**
- Check Shortcuts has Focus permissions
- Manually turn off if needed

## Tips

1. **Quick Capture**: Use voice dictation for outcome/insight
2. **Batch Review**: Save detailed reflection for daily review
3. **Patterns**: Look for variance patterns in your efficiency over time
4. **Automation**: Set up automatic Portside trigger when Timery stops

## Next Steps

After Portside:
1. Review your metrics in daily review
2. Look for estimation patterns
3. Adjust future task durations based on variance
4. Use insights to improve planning
