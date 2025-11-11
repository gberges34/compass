# Testing Claude Code Hooks

This document describes how to test the notification hooks configured for Compass.

## Prerequisites

- macOS with terminal-notifier installed (`brew install terminal-notifier`)
- `.claude/settings.local.json` configured with Notification hook
- Active Claude Code session

## Test Methods

### Method 1: Direct Script Test

Test the notification script directly:

```bash
# Test specific script
./scripts/notify-with-fallback.sh

# Test terminal-notifier directly
terminal-notifier -message "Test" -sound Basso
```

Expected: Notification appears with sound.

### Method 2: Trigger via Claude

Ask Claude to prompt for user input:

```
Prompt: "Please ask me a question using AskUserQuestion tool."
```

Expected:
1. Claude uses AskUserQuestion tool
2. Notification sound plays
3. macOS notification appears

### Method 3: Idle Prompt Test

Leave Claude idle (no response for 60+ seconds):

Expected: Idle notification appears after 60 seconds with sound.

## Troubleshooting

### Hook Not Firing

**Check hook configuration:**
```bash
cat .claude/settings.local.json | jq '.hooks'
```

**Restart Claude Code session** to reload configuration.

### No Sound

**Test terminal-notifier sound:**
```bash
terminal-notifier -message "Test" -sound Basso
```

**Check system sound settings** - ensure system volume is up and "Do Not Disturb" is off.

### Notification Not Appearing

**Check macOS notification settings:**
1. System Preferences → Notifications
2. Find "terminal-notifier" in app list
3. Ensure notifications are enabled

**Test with different notification style:**
```bash
terminal-notifier -message "Test" -sound Basso -contentImage "https://via.placeholder.com/150"
```

### Hook Errors

**Check Claude Code output** for hook error messages. Common issues:
- Invalid JSON syntax in settings
- Script not executable (`chmod +x script.sh`)
- Command not in PATH
- Hook timeout (default 60s)

## Testing Checklist

- [ ] terminal-notifier installed
- [ ] Hook configuration valid JSON
- [ ] Script executable (`ls -l scripts/*.sh`)
- [ ] Direct script test successful
- [ ] Claude AskUserQuestion test successful
- [ ] Sound plays on notification
- [ ] Notification appears in macOS notification center
- [ ] Clicking notification focuses Terminal
