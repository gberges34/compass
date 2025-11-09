# Daily Review Shortcut - Analytics & Reflection

**Purpose**: Comprehensive end-of-day review with automatic metrics calculation, wins/misses capture, and insights extraction.

## Prerequisites

1. iOS Shortcuts app
2. Backend API accessible
3. Orient West completed (recommended)
4. At least one task completed with Portside

## When to Use

**Best Time**: End of day, after Orient West, before bed

**Frequency**: Once per day (evening/night)

**Duration**: 5-10 minutes

**Relationship to Orient West**:
- Orient West = Quick subjective reflection on the plan
- Daily Review = Deep analytics + learning extraction + forward planning

## Shortcut Instructions

### 1. Create New Shortcut
Open iOS Shortcuts app → Create new shortcut → Name it "Daily Review"

### 2. Add Actions (in order)

#### Step 1: Welcome
```
Action: Show Notification
Title: 📊 Daily Review
Body: Let's analyze today's performance
```

#### Step 2: Ask for Wins
```
Action: Ask for Input
Prompt: What were your TOP 3 WINS today?
Input Type: Text (multiline)
Placeholder: One per line. Be specific!
Set Variable: WinsText

Action: Split Text
Text: WinsText
Separator: New Line
Set Variable: WinsArray

Action: If (Count of WinsArray) > 3
Then:
  Action: Get Items from List
  List: WinsArray
  First: 1
  Last: 3
  Set Variable: Wins
Else:
  Set Variable "Wins" to WinsArray
```

#### Step 3: Ask for Misses
```
Action: Ask for Input
Prompt: What were your TOP 3 MISSES today?
Input Type: Text (multiline)
Placeholder: What didn't go well? What would you do differently?
Set Variable: MissesText

Action: Split Text
Text: MissesText
Separator: New Line
Set Variable: MissesArray

Action: If (Count of MissesArray) > 3
Then:
  Action: Get Items from List
  List: MissesArray
  First: 1
  Last: 3
  Set Variable: Misses
Else:
  Set Variable "Misses" to MissesArray
```

#### Step 4: Ask for Lessons
```
Action: Ask for Input
Prompt: What did you LEARN today?
Input Type: Text (multiline)
Placeholder: Key insights, realizations, or patterns discovered
Set Variable: LessonsText

Action: Split Text
Text: LessonsText
Separator: New Line
Set Variable: LessonsArray

Action: If (Count of LessonsArray) > 3
Then:
  Action: Get Items from List
  List: LessonsArray
  First: 1
  Last: 3
  Set Variable: Lessons
Else:
  Set Variable "Lessons" to LessonsArray
```

#### Step 5: Ask for Next Goals
```
Action: Ask for Input
Prompt: What are your TOP 3 GOALS for tomorrow?
Input Type: Text (multiline)
Placeholder: Concrete, actionable goals
Set Variable: GoalsText

Action: Split Text
Text: GoalsText
Separator: New Line
Set Variable: GoalsArray

Action: If (Count of GoalsArray) > 3
Then:
  Action: Get Items from List
  List: GoalsArray
  First: 1
  Last: 3
  Set Variable: NextGoals
Else:
  Set Variable "NextGoals" to GoalsArray
```

#### Step 6: Ask for Energy Assessment
```
Action: Choose from Menu
Prompt: Overall energy today?
Menu Items:
  - ⚡ HIGH - Great energy all day
  - 🔋 MEDIUM - Balanced, normal energy
  - 🪫 LOW - Tired, low motivation

Case "HIGH": Set Variable "EnergyAssessment" to "HIGH"
Case "MEDIUM": Set Variable "EnergyAssessment" to "MEDIUM"
Case "LOW": Set Variable "EnergyAssessment" to "LOW"
```

#### Step 7: Build Review Dictionary
```
Action: Dictionary
{
  "wins": Wins,
  "misses": Misses,
  "lessons": Lessons,
  "nextGoals": NextGoals,
  "energyAssessment": EnergyAssessment
}
```

#### Step 8: Show Processing
```
Action: Show Notification
Title: Calculating Metrics...
Body: Analyzing your day's data
```

#### Step 9: Create Daily Review
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/reviews/daily
Method: POST
Headers:
  Content-Type: application/json
Body: Dictionary (from Step 7)
```

#### Step 10: Check for Errors
```
Action: If Contents of URL | contains | "error"
Then:
  Action: Show Alert
  Title: Error Creating Review
  Message: Contents of URL
  Action: Exit Shortcut
```

#### Step 11: Parse Review Response
```
Action: Get Dictionary from Contents of URL
```

#### Step 12: Extract Metrics
```
Action: Get Dictionary Value
  - "executionRate" → Set Variable "ExecutionRate"
  - "tasksCompleted" → Set Variable "TasksCompleted"
  - "deepWorkHours" → Set Variable "DeepWorkHours"
  - "totalTrackedTime" → Set Variable "TotalTrackedTime"
  - "timeCoverage" → Set Variable "TimeCoverage"
  - "contextSwitches" → Set Variable "ContextSwitches"
  - "categoryBalance" → Set Variable "CategoryBalance"
```

#### Step 13: Format Category Balance
```
Action: Get Dictionary Keys from CategoryBalance
Set Variable: Categories

Action: Text
Content: (empty)

Action: Repeat with Each (Categories)
  Action: Get Dictionary Value
  Key: Repeat Item
  Dictionary: CategoryBalance
  → Set Variable "Minutes"

  Action: Calculate (Minutes / 60)
  → Set Variable "Hours"

  Action: Text
  [Repeat Item]: Hours hrs

  Action: Add to Variable "CategoryText"
```

#### Step 14: Calculate Performance Grade
```
Action: If ExecutionRate >= 100
Then: Set Variable "Grade" to "A+ 🏆"

Action: If ExecutionRate >= 80 AND < 100
Then: Set Variable "Grade" to "A 🌟"

Action: If ExecutionRate >= 60 AND < 80
Then: Set Variable "Grade" to "B 👍"

Action: If ExecutionRate >= 40 AND < 60
Then: Set Variable "Grade" to "C 📈"

Action: If ExecutionRate < 40
Then: Set Variable "Grade" to "D 💪"
```

#### Step 15: Build Comprehensive Report
```
Action: Text
Content:
📊 DAILY REVIEW REPORT
════════════════════

🎯 EXECUTION METRICS
────────────────────
Grade: Grade
Execution Rate: ExecutionRate%
Tasks Completed: TasksCompleted
Deep Work: DeepWorkHours hours
Total Tracked: TotalTrackedTime minutes
Time Coverage: TimeCoverage%
Context Switches: ContextSwitches

📂 CATEGORY BREAKDOWN
────────────────────
CategoryText

✅ WINS
────────────────────
[List each win from Wins array]

❌ MISSES
────────────────────
[List each miss from Misses array]

💡 LESSONS
────────────────────
[List each lesson from Lessons array]

🎯 TOMORROW'S GOALS
────────────────────
[List each goal from NextGoals array]

⚡ ENERGY: EnergyAssessment
════════════════════
```

#### Step 16: Show Report
```
Action: Show Alert
Title: Daily Review Complete! ✅
Message: Text (from Step 15)
```

#### Step 17: Provide Insights
```
Action: If ExecutionRate >= 100
Then:
  Action: Show Notification
  Title: 🏆 Perfect Execution!
  Body: You completed all planned outcomes. Incredible!

Action: If DeepWorkHours < 1 AND EnergyAssessment = "HIGH"
Then:
  Action: Show Notification
  Title: ⚠️ High Energy, Low Deep Work
  Body: You had energy but didn't do deep work. Why? Review tomorrow's plan.

Action: If ContextSwitches > 10
Then:
  Action: Show Notification
  Title: ⚠️ High Context Switches
  Body: ContextSwitches switches may be hurting focus. Try batching similar tasks.

Action: If TimeCoverage < 30
Then:
  Action: Show Notification
  Title: ℹ️ Low Time Tracking
  Body: Only TimeCoverage% of day tracked. Use Portside more consistently.
```

#### Step 18: Save to Notes (Optional)
```
Action: Create Note
Title: Daily Review - [Current Date]
Body: Text (from Step 15)
Folder: Compass Reviews
```

#### Step 19: Streak Tracking (Optional)
```
Action: Get Contents of URL
URL: [YOUR_BACKEND_URL]/api/reviews?type=DAILY&limit=7
Method: GET

Action: Count Items in Response
Set Variable: RecentReviews

Action: If RecentReviews >= 7
Then:
  Action: Show Notification
  Title: 🔥 7-Day Streak!
  Body: You've reviewed daily for a full week. Keep it up!
```

## Wins/Misses/Lessons Guidelines

### Excellent Wins
✅ "Shipped feature X to production 2 days ahead of schedule"
✅ "Completed deep work block without any interruptions for first time"
✅ "Resolved conflict with coworker through direct conversation"

### Vague Wins (Avoid)
❌ "Got stuff done"
❌ "Productive day"
❌ "Felt good"

### Excellent Misses
✅ "Underestimated database task by 2 hours - need to account for edge cases"
✅ "Skipped morning exercise, felt sluggish all day"
✅ "Procrastinated on difficult task - broke momentum"

### Vague Misses (Avoid)
❌ "Didn't do enough"
❌ "Wasted time"
❌ "Bad day"

### Excellent Lessons
✅ "Tasks with HIGH energy need minimum 90-minute blocks, not 60"
✅ "Eating heavy lunch reduces afternoon productivity by ~30%"
✅ "Morning deep work consistently 2x more efficient than afternoon"

### Vague Lessons (Avoid)
❌ "Need to be better"
❌ "Time management important"
❌ "Should focus more"

## Understanding Metrics

### Execution Rate
- **100%+**: All outcomes completed (may have done extra)
- **80-99%**: Strong execution, minor gaps
- **60-79%**: Decent progress, room for improvement
- **40-59%**: Significant gaps, review planning
- **<40%**: Major disconnect, investigate root cause

### Deep Work Hours
- **2.5-4 hrs**: Excellent (most people's limit)
- **1.5-2.5 hrs**: Good, solid focus work
- **0.5-1.5 hrs**: Minimal, may need protection
- **<0.5 hrs**: Concerning if HIGH energy tasks exist

### Time Coverage
- **60-80%**: Excellent tracking
- **40-60%**: Good tracking
- **20-40%**: Partial tracking, increase usage
- **<20%**: Low tracking, many unlogged activities

### Context Switches
- **0-3**: Excellent focus
- **4-7**: Good, some variety
- **8-12**: Moderate, consider batching
- **13+**: High, hurting deep work

## Pattern Recognition

Run Daily Review consistently for 7+ days, then analyze:

### Weekly Patterns
```bash
curl http://localhost:3001/api/reviews?type=DAILY&limit=7 | jq
```

Look for:
- **Day of week trends**: Are Mondays always low execution?
- **Energy accuracy**: Is your morning prediction usually right?
- **Variance patterns**: Do you consistently underestimate certain categories?
- **Deep work trends**: Which days have best focus?

### Monthly Patterns
- Execution rate trends (improving/declining?)
- Deep work hour averages
- Category balance shifts
- Most common lessons (recurring issues)

## Testing the Shortcut

1. Make sure you have some completed tasks:
```bash
curl http://localhost:3001/api/tasks?status=DONE
```

2. Run Daily Review
3. Fill in all prompts
4. Verify review created:
```bash
curl http://localhost:3001/api/reviews?type=DAILY&limit=1 | jq
```

## Automation Ideas

### End-of-Day Automation
```
Trigger: Time of Day (9:00 PM)
+ Conditional: Orient West is completed
Action: Run "Daily Review" shortcut
```

### Reminder Chain
```
Orient East (7 AM)
→ Work day
→ Orient West (7 PM)
→ Daily Review (9 PM)
```

### Monthly Review Prep
```
Trigger: Last day of month
Action: Get all daily reviews for month
Action: Summarize trends
Action: Create monthly review note
```

## Advanced: Weekly Review

Create a similar shortcut for weekly reviews:

```
POST [YOUR_BACKEND_URL]/api/reviews/weekly
{
  "wins": [...],
  "misses": [...],
  "lessons": [...],
  "nextGoals": [...]
}
```

Weekly metrics automatically aggregate 7 days of data:
- Total execution rate
- Total deep work hours
- Full category breakdown
- Context switch totals

## Troubleshooting

**Metrics are all zeros**
- Make sure tasks are completed with Portside
- Check Post-Do logs exist: `curl http://localhost:3001/api/tasks`
- Verify tasks have correct timestamps

**Can't split wins/misses**
- Ensure one item per line
- Check for empty lines
- Verify separator is "New Line"

**Review creation fails**
- Check required fields (wins, misses, lessons, nextGoals)
- Verify arrays are properly formatted
- Look at backend error logs

## Next Steps

After Daily Review:
1. Use insights to inform tomorrow's Orient East
2. Track patterns over multiple days
3. Run Weekly Review on Sundays
4. Export data for deeper analysis (future feature)

## Integration with Other Shortcuts

Daily Review completes the full cycle:

**Morning:**
1. Orient East → Plan the day

**During Day:**
2. Northbound → Clarify tasks
3. Navigate → Start tasks
4. Portside → Complete tasks

**Evening:**
5. Orient West → Quick reflection
6. Daily Review → Deep analytics + learning

This creates a closed feedback loop for continuous improvement!
