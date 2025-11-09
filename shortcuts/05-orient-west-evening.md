# Orient West Shortcut - Evening Reflection

**Purpose**: Reflect on your day, compare planned vs. actual outcomes, and assess energy accuracy.

## Prerequisites

1. iOS Shortcuts app
2. Backend API accessible
3. Today's Orient East plan created
4. Run this once per day in the evening

## When to Use

**Best Time**: End of workday, before dinner or bedtime routine

**Frequency**: Once per day (evening)

**Duration**: 3-5 minutes

## Shortcut Instructions

### 1. Create New Shortcut
Open iOS Shortcuts app → Create new shortcut → Name it "Orient West"

### 2. Add Actions (in order)

#### Step 1: Get Today's Plan
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/orient/today
Method: GET
Headers:
  Content-Type: application/json
```

#### Step 2: Check Plan Exists
```
Action: If Contents of URL | contains | "error"
Then:
  Action: Show Alert
  Title: No Plan Found
  Message: You need to create a morning plan with Orient East first!
  Action: Exit Shortcut
```

#### Step 3: Parse Plan
```
Action: Get Dictionary from Contents of URL
Action: Get Dictionary Value
  - "id" → Set Variable "PlanID"
  - "topOutcomes" → Set Variable "PlannedOutcomes"
  - "energyLevel" → Set Variable "PlannedEnergy"
  - "reflection" → Set Variable "ExistingReflection"
```

#### Step 4: Check if Already Completed
```
Action: If ExistingReflection | is not | empty
Then:
  Action: Show Alert
  Title: Already Reflected
  Message: You've already completed Orient West today. View it?
  Show Cancel Button: YES

  Action: If tapped OK
    (Show existing reflection - see Step 16)
    Action: Exit Shortcut
```

#### Step 5: Show Planned Outcomes
```
Action: Get Item from List
List: PlannedOutcomes
Item: 1
Set Variable: Outcome1

Action: Get Item from List
List: PlannedOutcomes
Item: 2
Set Variable: Outcome2

Action: Get Item from List
List: PlannedOutcomes
Item: 3
Set Variable: Outcome3

Action: Text
Content:
🎯 TODAY'S OUTCOMES
─────────────
1. Outcome1
2. Outcome2
3. Outcome3

How many did you complete?
```

#### Step 6: Ask Actual Outcomes
```
Action: Choose from Menu
Prompt: Text (from Step 5)
Menu Items:
  - ✅ 3 out of 3 (Perfect!)
  - ✅ 2 out of 3 (Good progress)
  - ✅ 1 out of 3 (Some progress)
  - ❌ 0 out of 3 (None completed)

Case "3 out of 3": Set Variable "ActualOutcomes" to 3
Case "2 out of 3": Set Variable "ActualOutcomes" to 2
Case "1 out of 3": Set Variable "ActualOutcomes" to 1
Case "0 out of 3": Set Variable "ActualOutcomes" to 0
```

#### Step 7: Ask Energy Match
```
Action: Text
Content:
⚡ ENERGY ASSESSMENT
─────────────
This morning you predicted: PlannedEnergy

How accurate was that?

Action: Choose from Menu
Prompt: Text
Menu Items:
  - 🎯 Perfect - Energy matched exactly
  - ✓ Mostly Aligned - Close enough
  - ≈ Some Mismatch - Noticeable difference
  - ✗ Poor - Way off

Case "Perfect": Set Variable "EnergyMatch" to "PERFECT"
Case "Mostly Aligned": Set Variable "EnergyMatch" to "MOSTLY_ALIGNED"
Case "Some Mismatch": Set Variable "EnergyMatch" to "SOME_MISMATCH"
Case "Poor": Set Variable "EnergyMatch" to "POOR"
```

#### Step 8: Ask for Reflection
```
Action: Ask for Input
Prompt: What happened today? Wins, challenges, learnings?
Input Type: Text (multiline)
Placeholder: e.g., "Completed all outcomes ahead of schedule. Deep work block was super productive. Energy dipped after lunch - need better meal planning."
Set Variable: Reflection
```

#### Step 9: Provide Reflection Prompts (if empty)
```
Action: If Reflection | is | empty
Then:
  Action: Text
  Content:
  Reflection Prompts:
  • What went well today?
  • What was challenging?
  • What would you do differently?
  • What did you learn?
  • How did you feel?
  • What surprised you?

  Action: Ask for Input
  Prompt: Text (from above)
  Set Variable: Reflection
```

#### Step 10: Build Update Dictionary
```
Action: Dictionary
{
  "reflection": Reflection,
  "actualOutcomes": ActualOutcomes,
  "energyMatch": EnergyMatch
}
```

#### Step 11: Update Plan with Reflection
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/orient/west/[PlanID]
Method: PATCH
Headers:
  Content-Type: application/json
Body: Dictionary (from Step 10)
```

#### Step 12: Check for Errors
```
Action: If Contents of URL | contains | "error"
Then:
  Action: Show Alert
  Title: Error Updating Plan
  Message: Contents of URL
  Action: Exit Shortcut
```

#### Step 13: Parse Updated Plan
```
Action: Get Dictionary from Contents of URL
```

#### Step 14: Calculate Execution Rate
```
Action: Calculate
Formula: (ActualOutcomes / 3) * 100
Set Variable: ExecutionRate
```

#### Step 15: Build Summary
```
Action: Text
Content:
🌅 DAY REFLECTION
─────────────
📊 PERFORMANCE
Outcomes: ActualOutcomes / 3 (ExecutionRate%)
Energy Match: EnergyMatch

⚡ PLANNED ENERGY
PlannedEnergy

💭 REFLECTION
Reflection
─────────────
```

#### Step 16: Provide Feedback
```
Action: If ActualOutcomes | equals | 3
Then:
  Set Variable "Message" to "🎉 Perfect day! All outcomes completed!"
  Set Variable "Title" to "Amazing Work!"

Action: If ActualOutcomes | equals | 2
Then:
  Set Variable "Message" to "💪 Good progress! 2/3 is solid execution."
  Set Variable "Title" to "Well Done!"

Action: If ActualOutcomes | equals | 1
Then:
  Set Variable "Message" to "📈 Some progress made. What blocked the others?"
  Set Variable "Title" to "Keep Going!"

Action: If ActualOutcomes | equals | 0
Then:
  Set Variable "Message" to "🤔 Tough day? Tomorrow is a fresh start."
  Set Variable "Title" to "Tomorrow's Another Day"
```

#### Step 17: Show Summary
```
Action: Show Alert
Title: Title
Message: Text (from Step 15)
```

#### Step 18: Energy Pattern Alert
```
Action: If EnergyMatch | equals | "POOR"
Then:
  Action: Show Notification
  Title: ⚠️ Energy Mismatch
  Body: Your energy was way off today. Track patterns over the week to improve predictions.
```

#### Step 19: Reward Reminder
```
Action: Get Dictionary Value
Key: reward
Dictionary: (Plan from Step 3)

Action: If reward | is not | empty
Then:
  Action: If ActualOutcomes | equals | 3
    Action: Show Alert
    Title: 🎁 Time for Your Reward!
    Message: reward
  Else:
    Action: Show Notification
    Title: Reward Not Earned
    Body: Complete all 3 outcomes tomorrow to earn: reward
```

#### Step 20: Prompt for Daily Review
```
Action: Show Notification
Title: Daily Review Coming Up
Body: Run Daily Review shortcut to capture full analytics
```

## Reflection Guidelines

### Good Reflections

**Example 1 - High Performer:**
```
Crushed all 3 outcomes by 3pm. Deep work block from 9-11 was incredibly productive - no interruptions. Energy was spot on (HIGH). Afternoon admin block handled emails smoothly. Taking reward walk now!
```

**Example 2 - Mixed Day:**
```
Completed 2/3 outcomes. Database optimization took longer than expected due to unexpected edge case. Energy was actually MEDIUM, not HIGH - overestimated. Should have scheduled more buffer time. Learned to add 30% time padding for technical work.
```

**Example 3 - Challenging Day:**
```
Only 1/3 outcomes done. Multiple urgent interruptions pulled me out of deep work. Energy crashed after lunch - need to review meal choices. Tomorrow: block morning for focused work, communicate "busy" status to team.
```

### Vague Reflections (Avoid)

❌ "Good day"
❌ "Got stuff done"
❌ "Tired"
❌ "OK I guess"

### Key Questions to Answer

1. **Execution**: Why did/didn't you hit outcomes?
2. **Energy**: Was prediction accurate? Why/why not?
3. **Surprises**: What unexpected things happened?
4. **Learnings**: What would you do differently?
5. **Patterns**: Any recurring themes?

## Energy Match Patterns

Track these over time in Daily/Weekly reviews:

**PERFECT** (🎯)
- Keep doing what you're doing
- Note what factors contributed (sleep, meals, etc.)

**MOSTLY_ALIGNED** (✓)
- Close enough for planning
- Minor adjustments possible

**SOME_MISMATCH** (≈)
- Review morning routines
- Check sleep patterns
- Consider external factors (weather, stress)

**POOR** (✗)
- Significant disconnect
- Review previous evening activities
- Check health/wellness factors
- May need a rest day

## Testing the Shortcut

1. Make sure Orient East was run today:
```bash
curl http://localhost:3001/api/orient/today
```

2. Run Orient West in the evening
3. Complete reflection prompts
4. Verify update:
```bash
curl http://localhost:3001/api/orient/today | jq
```

Should see `reflection`, `actualOutcomes`, and `energyMatch` populated.

## Automation Ideas

### Evening Routine Automation
```
Trigger: Time of Day (8:00 PM)
+ Location: At Home
Action: Show Notification "Time to reflect on your day"
Action: Wait for user to dismiss
Action: Run "Orient West" shortcut
```

### Focus Mode Exit Automation
```
Trigger: When "Work" Focus Mode turns off
+ Time: After 5:00 PM
Action: Run "Orient West" shortcut
```

### Timery Stop Automation
```
Trigger: When Timery last timer stops
+ Time: After 6:00 PM
Action: Wait 5 minutes
Action: Run "Orient West"
```

## Troubleshooting

**"No plan found"**
- Run Orient East first
- Check backend: `curl http://localhost:3001/api/orient/today`

**"Already reflected"**
- Can only reflect once per day (by design)
- To update, modify API endpoint or delete and recreate

**Can't remember outcomes**
- Show plan first before asking questions
- Add better summary display in shortcut

## Next Steps

After Orient West:
1. Run Daily Review shortcut for full analytics
2. Review patterns in weekly review
3. Adjust tomorrow's Orient East based on learnings
4. Track energy match accuracy over time

## Integration with Daily Review

Orient West provides subjective reflection. Daily Review adds objective metrics:
- Orient West: "Felt productive today"
- Daily Review: "3/3 outcomes (100%), 2.5hrs deep work, 95% efficiency"

Together they give complete picture!
