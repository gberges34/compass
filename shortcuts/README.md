# Compass iOS Shortcuts

Complete iOS Shortcuts integration for the Compass productivity system. These shortcuts connect your iPhone to the Compass backend, enabling a fully functional productivity workflow.

## 🎯 System Overview

Compass is an 8-phase productivity operating system that helps you capture, clarify, plan, execute, and reflect on your work. These iOS Shortcuts implement the core workflows:

### The 8 Compass Phases

1. **Orient** (Morning/Evening) - Daily planning and reflection
2. **Capture** (Continuous) - Voice capture via Todoist Ramble
3. **Clarify** (As needed) - LLM-powered task enrichment
4. **Commit** (Daily) - Task prioritization and scheduling
5. **Execute** (Continuous) - Deep work with focus modes
6. **Close** (Per task) - Task completion and logging
7. **Reflect** (Evening) - Daily analytics review
8. **Regenerate** (Weekly) - Energy restoration

## 📱 Available Shortcuts

| Shortcut | Phase | Purpose | Frequency |
|----------|-------|---------|-----------|
| **Northbound** | Clarify | Enrich captured tasks with Claude AI | As needed |
| **Navigate** | Execute | Start task, set focus, begin timer | Per task |
| **Portside** | Close | Complete task, log analytics | Per task |
| **Orient East** | Orient | Morning planning | Once/day (AM) |
| **Orient West** | Orient | Evening reflection | Once/day (PM) |
| **Daily Review** | Reflect | Analytics & insights | Once/day (PM) |

## 🚀 Quick Start

### Prerequisites

1. **iPhone** with iOS 15+ and Shortcuts app
2. **Todoist Ramble** for voice capture
3. **Timery** for time tracking (connected to Toggl Track)
4. **Backend API** running and accessible

### Step 1: Backend Setup

Choose one deployment option:

#### Option A: Deploy to Railway (Recommended)
```bash
cd ~/compass/backend

# Install Railway CLI
brew install railway

# Login and deploy
railway login
railway up

# Get your public URL
railway domain
# Example output: https://compass-api-production.up.railway.app
```

Set this as your `BACKEND_URL` for all shortcuts.

#### Option B: Local with ngrok (Testing)
```bash
# Terminal 1: Start backend
cd ~/compass/backend
npm run dev

# Terminal 2: Expose with ngrok
ngrok http 3001
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

**Note**: ngrok URLs change each session. Railway is better for daily use.

### Step 2: Configure Environment

Make sure backend `.env` has:
```env
DATABASE_URL=your_railway_postgres_url
ANTHROPIC_API_KEY=your_claude_api_key
TOGGL_API_TOKEN=your_toggl_token  # Optional, for automatic Timery integration
```

### Step 3: Set Up iOS Focus Modes

Create these Focus Modes on your iPhone (Settings → Focus):

1. **School** - Study and coursework
2. **Music Practice** - Music sessions
3. **Workout** - Fitness activities
4. **Gaming** - Gaming time
5. **Meal Prep** - Nutrition tasks
6. **Hygiene** - Personal care
7. **Pet Care** - Pet tasks
8. **Social** - Social activities
9. **Personal** - Personal projects
10. **Admin** - Administrative work
11. **Deep Work** - Default for intense focus

### Step 4: Install Shortcuts

Build each shortcut using the guides:

1. **Start with Northbound** ([guide](./01-northbound-clarify.md))
   - Clarify and enrich captured tasks
   - Test with sample tasks first

2. **Then Navigate** ([guide](./02-navigate-start-task.md))
   - Activate tasks and start timers
   - Integrates Focus Modes + Timery

3. **Then Portside** ([guide](./03-portside-complete-task.md))
   - Complete tasks and log analytics
   - Captures reflection and metrics

4. **Then Orient East** ([guide](./04-orient-east-morning.md))
   - Morning daily planning
   - Set energy and outcomes

5. **Then Orient West** ([guide](./05-orient-west-evening.md))
   - Evening reflection
   - Compare planned vs actual

6. **Finally Daily Review** ([guide](./06-daily-review.md))
   - Comprehensive analytics
   - Extract learnings and patterns

### Step 5: Test the Flow

Test the complete workflow:

```bash
# 1. Add test tasks via Todoist import
curl -X POST http://YOUR_BACKEND_URL/api/todoist/import \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"name": "Write project proposal", "due": "2025-11-10T17:00:00Z"},
      {"name": "Review code changes"},
      {"name": "Call dentist for appointment"}
    ]
  }'

# 2. On iPhone:
# - Run "Northbound" → Clarify one task
# - Run "Navigate" → Start the task
# - Work on it for a few minutes
# - Run "Portside" → Complete the task

# 3. Verify data:
curl http://YOUR_BACKEND_URL/api/tasks?status=DONE
```

## 📅 Daily Workflow

### Morning Routine (7-8 AM)
1. **Orient East** - Plan your day
   - Set energy level
   - Schedule deep work blocks
   - Define top 3 outcomes

### During Work Day
2. **Capture** - Use Todoist Ramble for quick voice capture
3. **Northbound** - Clarify captured tasks when convenient
4. **Navigate** → Work → **Portside** - Execute tasks in cycles

### Evening Routine (7-9 PM)
5. **Orient West** - Quick reflection (3-5 min)
6. **Daily Review** - Deep analytics (5-10 min)

### Weekly (Sunday Evening)
7. Create Weekly Review shortcut (similar to Daily Review)

## 🔧 Configuration Tips

### Timery Integration

Timery provides three integration methods:

1. **Built-in Shortcuts Actions** (Best)
   - Open Shortcuts → Add Action → Apps → Timery
   - Use "Start Timer" and "Stop Timer" actions

2. **URL Scheme** (Good)
   ```
   timery://start?description=TASK_NAME&project=PROJECT
   timery://stop
   ```

3. **Direct Toggl API** (Advanced)
   - Set `TOGGL_API_TOKEN` in backend `.env`
   - Backend handles timer via Toggl API

### Backend URL Management

Store backend URL in a global variable:

1. Create "Compass Config" shortcut
2. Set Dictionary with `baseURL` key
3. Import in each shortcut:
   ```
   Run Shortcut: "Compass Config"
   Get Dictionary Value: "baseURL"
   ```

### Notification Settings

Enable notifications for Compass shortcuts:
- Settings → Notifications → Shortcuts
- Allow Notifications: ON
- Show Previews: Always

## 🎨 Customization

### Modifying Time Blocks

Edit Orient East shortcut to change default times:
- Default deep work: 9-11:30 AM, 2-4 PM
- Default admin: 11:30 AM-12:30 PM
- Adjust to your schedule

### Adding Custom Categories

Current categories:
- School, Music, Fitness, Gaming
- Nutrition, Hygiene, Pet, Social
- Personal, Admin

To add more:
1. Update Prisma schema enum
2. Run migration
3. Add to Focus Mode mapping in Navigate

### Custom Metrics

Add custom metrics to Daily Review:
- Sleep quality (manual input)
- Exercise (from Apple Health)
- Mood rating
- Specific goal tracking

## 📊 Data & Privacy

### What Gets Tracked

- Task details (name, duration, category, etc.)
- Completion times and durations
- Reflections and insights
- Daily plans and outcomes
- Performance metrics

### Where Data Lives

- **Backend**: Your PostgreSQL database (Railway or self-hosted)
- **Todoist**: Temporary task captures (processed then available to delete)
- **Timery/Toggl**: Time tracking data
- **iPhone**: Shortcuts are local, no data stored

### Data Ownership

You own all data:
- Full database access via Prisma Studio
- Export capability via API
- Can migrate to self-hosted setup anytime

## 🆘 Troubleshooting

### "Could not connect to server"

**Check backend is running:**
```bash
curl https://YOUR_BACKEND_URL/health
```

**Should return:**
```json
{"status":"ok","message":"Compass API is running"}
```

**If not:**
- Check Railway deployment status
- Verify ngrok is running (if local)
- Check firewall settings

### "No pending tasks"

**Verify tasks exist:**
```bash
curl https://YOUR_BACKEND_URL/api/todoist/pending
```

**If empty, add test tasks:**
```bash
curl -X POST https://YOUR_BACKEND_URL/api/todoist/import \
  -H "Content-Type: application/json" \
  -d '{"tasks": [{"name": "Test task"}]}'
```

### "Enrichment failed"

**Check Claude API key:**
```bash
# In backend directory
grep ANTHROPIC_API_KEY .env
```

**Verify credits:**
- Go to https://console.anthropic.com/
- Check credit balance
- Add credits if needed

### Focus Mode not switching

**Enable Shortcuts permissions:**
- Settings → Shortcuts
- Scroll down to "Focus"
- Enable "Set Focus"

### Timery not starting/stopping

**Test URL scheme:**
```
Open: timery://
```

**Should open Timery app.**

**Alternative:** Use direct Toggl API integration in backend

## 🔮 Advanced Usage

### Automation Triggers

Create automations in Shortcuts app:

**Morning Planning:**
```
Trigger: Time of Day (7:00 AM)
+ Location: At Home
Action: Run "Orient East"
```

**Evening Review:**
```
Trigger: Time of Day (8:00 PM)
Condition: Orient West is complete
Action: Run "Daily Review"
```

**Auto-Start Task:**
```
Trigger: Leave Home
Time: After 8:00 AM
Action: Show menu of NEXT tasks
Action: Run "Navigate" with selection
```

### Siri Integration

Enable Siri for each shortcut:
- "Hey Siri, Northbound"
- "Hey Siri, Navigate"
- "Hey Siri, Portside"
- "Hey Siri, Orient East"

### Widget Setup

Add Shortcuts widget to home screen:
1. Long press home screen
2. Tap "+" → Shortcuts
3. Choose widget size
4. Add: Northbound, Navigate, Portside

### Apple Watch

Select shortcuts sync to Apple Watch:
- Navigate (quick task start)
- Portside (quick completion)
- Daily standup variant

## 📈 Metrics Dashboard (Future)

Planned web dashboard features:
- Weekly/monthly execution trends
- Category time breakdowns
- Energy accuracy over time
- Task estimation improvement
- Deep work patterns
- Context switch analysis

For now, query directly:
```bash
# Last 7 days of reviews
curl https://YOUR_BACKEND_URL/api/reviews?type=DAILY&limit=7 | jq

# Weekly summary
curl https://YOUR_BACKEND_URL/api/reviews?type=WEEKLY&limit=4 | jq
```

## 🤝 Contributing

Improvements to shortcuts:
1. Export your modified shortcut
2. Document changes
3. Submit via GitHub issue
4. Share iCloud link

## 📚 Additional Resources

- **Compass Vision**: See `~/compass/docs/CompassVision.md`
- **Backend API**: See `~/compass/backend/README.md` (future)
- **8 Phases**: See `~/compass/docs/*.md` phase documentation

## 🎯 Next Steps

After setting up shortcuts:

1. **Week 1**: Use system, collect data
2. **Week 2**: Review patterns, adjust schedules
3. **Week 3**: Optimize categories and time blocks
4. **Week 4**: Fine-tune estimates based on variance data
5. **Month 2**: Build custom analytics dashboards

## 📞 Support

For issues:
1. Check troubleshooting section above
2. Review individual shortcut guides
3. Check backend logs: `railway logs`
4. Verify database: `railway run prisma studio`

---

Built with ❤️ for focused, intentional productivity.

**Remember**: The system serves you, not the other way around. Adjust and iterate based on what works for YOUR life and workflow.
