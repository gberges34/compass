# Orient East Shortcut - Morning Planning

**Purpose**: Create your daily plan each morning by setting energy level, scheduling deep work blocks, and defining top 3 outcomes.

## Prerequisites

1. iOS Shortcuts app
2. Backend API accessible
3. Run this once per day in the morning

## When to Use

**Best Time**: Right after waking up, during morning coffee/breakfast

**Frequency**: Once per day (morning)

**Duration**: 5-10 minutes

## Shortcut Instructions

### 1. Create New Shortcut
Open iOS Shortcuts app → Create new shortcut → Name it "Orient East"

### 2. Add Actions (in order)

#### Step 1: Check for Existing Plan
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/orient/today
Method: GET
Headers:
  Content-Type: application/json
```

#### Step 2: Handle Existing Plan
```
Action: If Contents of URL | contains | "error"
Then:
  (Continue with planning)
Else:
  Action: Show Alert
  Title: Plan Already Exists
  Message: You've already created today's plan. View it?
  Show Cancel Button: YES

  Action: If (tapped OK)
    Action: Get Dictionary from Contents of URL
    (Show plan details - see Step 20)
    Action: Exit Shortcut
```

#### Step 3: Welcome Message
```
Action: Show Notification
Title: Good Morning! ☀️
Body: Let's plan your day
```

#### Step 4: Ask Energy Level
```
Action: Choose from Menu
Prompt: How's your energy today?
Menu Items:
  - ⚡ HIGH - Feeling sharp and energized
  - 🔋 MEDIUM - Normal, balanced energy
  - 🪫 LOW - Tired or low motivation

Case "HIGH": Set Variable "Energy" to "HIGH"
Case "MEDIUM": Set Variable "Energy" to "MEDIUM"
Case "LOW": Set Variable "Energy" to "LOW"
```

#### Step 5: Deep Work Block 1 (Required)
```
Action: Show Notification
Title: Deep Work Block #1
Body: Plan your primary focus session

Action: Ask for Input
Prompt: Start time? (HH:MM format)
Default: 09:00
Set Variable: DW1Start

Action: Ask for Input
Prompt: End time? (HH:MM format)
Default: 11:30
Set Variable: DW1End

Action: Ask for Input
Prompt: What will you focus on?
Placeholder: e.g., "Complete quarterly report analysis"
Set Variable: DW1Focus
```

#### Step 6: Deep Work Block 2 (Optional)
```
Action: Show Alert
Title: Second Deep Work Block?
Message: Do you want a second deep work session today?
Show Cancel Button: YES (labeled "Skip")

Action: If tapped OK
Then:
  Action: Ask for Input
  Prompt: Start time? (HH:MM format)
  Default: 14:00
  Set Variable: DW2Start

  Action: Ask for Input
  Prompt: End time? (HH:MM format)
  Default: 16:00
  Set Variable: DW2End

  Action: Ask for Input
  Prompt: What will you focus on?
  Set Variable: DW2Focus

  Action: Dictionary
  {
    "start": DW2Start,
    "end": DW2End,
    "focus": DW2Focus
  }
  Set Variable: DeepWork2
Else:
  Set Variable "DeepWork2" to null
```

#### Step 7: Admin Block (Optional)
```
Action: Show Alert
Title: Admin Time?
Message: Email, meetings, calls, planning, etc.
Show Cancel Button: YES (labeled "Skip")

Action: If tapped OK
Then:
  Action: Ask for Input
  Prompt: Admin start time?
  Default: 11:30
  Set Variable: AdminStart

  Action: Ask for Input
  Prompt: Admin end time?
  Default: 12:30
  Set Variable: AdminEnd

  Action: Dictionary
  {
    "start": AdminStart,
    "end": AdminEnd
  }
  Set Variable: AdminBlock
Else:
  Set Variable "AdminBlock" to null
```

#### Step 8: Buffer Block (Optional)
```
Action: Show Alert
Title: Buffer Time?
Message: Flex time for interruptions or overflow
Show Cancel Button: YES (labeled "Skip")

Action: If tapped OK
Then:
  Action: Ask for Input
  Prompt: Buffer start time?
  Default: 16:00
  Set Variable: BufferStart

  Action: Ask for Input
  Prompt: Buffer end time?
  Default: 17:00
  Set Variable: BufferEnd

  Action: Dictionary
  {
    "start": BufferStart,
    "end": BufferEnd
  }
  Set Variable: BufferBlock
Else:
  Set Variable "BufferBlock" to null
```

#### Step 9: Top 3 Outcomes
```
Action: Show Notification
Title: Top 3 Outcomes
Body: What MUST get done today?

Action: Ask for Input
Prompt: Outcome #1 (Most Important)
Set Variable: Outcome1

Action: Ask for Input
Prompt: Outcome #2
Set Variable: Outcome2

Action: Ask for Input
Prompt: Outcome #3
Set Variable: Outcome3

Action: List
Items:
  - Outcome1
  - Outcome2
  - Outcome3
Set Variable: TopOutcomes
```

#### Step 10: Reward (Optional)
```
Action: Ask for Input
Prompt: What's your reward for completing all outcomes?
Placeholder: e.g., "Evening walk" or "Watch favorite show"
Allow Empty: YES
Set Variable: Reward
```

#### Step 11: Build Plan Dictionary
```
Action: Dictionary
{
  "energyLevel": Energy,
  "deepWorkBlock1": {
    "start": DW1Start,
    "end": DW1End,
    "focus": DW1Focus
  },
  "deepWorkBlock2": DeepWork2,
  "adminBlock": AdminBlock,
  "bufferBlock": BufferBlock,
  "topOutcomes": TopOutcomes,
  "reward": Reward
}
```

#### Step 12: Create Daily Plan
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/orient/east
Method: POST
Headers:
  Content-Type: application/json
Body: Dictionary (from Step 11)
```

#### Step 13: Check for Errors
```
Action: If Contents of URL | contains | "error"
Then:
  Action: Show Alert
  Title: Error Creating Plan
  Message: Contents of URL
  Action: Exit Shortcut
```

#### Step 14: Parse Created Plan
```
Action: Get Dictionary from Contents of URL
Action: Get Dictionary Value (key: "id")
Set Variable: PlanID
```

#### Step 15: Build Summary
```
Action: Text
Content:
☀️ TODAY'S PLAN
─────────────
⚡ Energy: Energy

🎯 TOP 3 OUTCOMES
1. Outcome1
2. Outcome2
3. Outcome3

⏰ SCHEDULE
─────────────
🧠 Deep Work #1
   DW1Start - DW1End
   → DW1Focus

(If DeepWork2 exists)
🧠 Deep Work #2
   DW2Start - DW2End
   → DW2Focus

(If AdminBlock exists)
📧 Admin Time
   AdminStart - AdminEnd

(If BufferBlock exists)
🔄 Buffer
   BufferStart - BufferEnd

(If Reward exists)
🎁 REWARD
Reward
─────────────
Let's make it happen! 💪
```

#### Step 16: Show Plan Summary
```
Action: Show Alert
Title: Plan Created! ✅
Message: Text (from Step 15)
```

#### Step 17: Optional - Create Calendar Events
```
Action: Create Calendar Event
Calendar: Compass
Title: Deep Work: DW1Focus
Start: Today at DW1Start
End: Today at DW1End
Alert: 5 minutes before
```

#### Step 18: Optional - Set Daily Reminder
```
Action: Add Reminder
Title: Review Plan (Orient West)
Due: Today at 20:00
List: Compass
Notes: Reflect on how the day went
```

## Tips for Better Planning

### Energy-Appropriate Task Assignment

**HIGH Energy Days:**
- Schedule hardest tasks in Deep Work blocks
- Tackle creative or complex problems
- Push through challenging material

**MEDIUM Energy Days:**
- Mix of routine and focused work
- Batch similar tasks together
- Steady progress on projects

**LOW Energy Days:**
- Admin tasks and meetings
- Easy wins and maintenance
- Catch up on emails/messages

### Deep Work Block Best Practices

1. **90-120 minutes is optimal** for most people
2. **Morning blocks** (8-11 AM) often most productive
3. **No interruptions** - phone on DND, close Slack
4. **Single focus** - one project per block
5. **Break between blocks** - at least 15 minutes

### Top 3 Outcomes Selection

**Good Outcomes:**
- ✅ "Complete budget spreadsheet draft"
- ✅ "Ship feature X to staging"
- ✅ "Finalize presentation slides"

**Too Vague:**
- ❌ "Make progress on project"
- ❌ "Work on tasks"
- ❌ "Be productive"

**Too Small:**
- ❌ "Reply to one email"
- ❌ "Read one article"

## Testing the Shortcut

1. Run Orient East in the morning
2. Fill in all prompts
3. Verify plan is created:
```bash
curl http://localhost:3001/api/orient/today | jq
```

4. Check that duplicate prevention works (run again - should show existing plan)

## Automation Ideas

### Morning Routine Automation
```
Trigger: Time of Day (7:00 AM)
+ Location: At Home
Action: Run "Orient East" shortcut
```

### Reminder Automation
```
Trigger: Alarm is stopped (morning alarm)
Action: Wait 10 minutes
Action: Show Notification "Time to plan your day!"
Action: Run "Orient East"
```

## Troubleshooting

**"Plan already exists" but want to update**
- Delete today's plan via API:
```bash
curl -X DELETE http://localhost:3001/api/orient/today
```
- Or add update functionality to shortcut

**Time format errors**
- Use HH:MM format (e.g., 09:00, not 9am)
- Backend expects 24-hour format

**Can't schedule second deep work**
- It's optional - skip if one block is enough
- Some days need more admin/buffer time

## Next Steps

After Orient East:
1. Review your plan throughout the day
2. Use Navigate to start each outcome task
3. Run Orient West in the evening to reflect
4. Compare planned vs. actual in daily review
