# Compass Scripts

Utility scripts for the Compass project.

## Git-Local Sync Verification

To verify git and local filesystem are in sync, run:

```bash
cd /Users/gberges/compass
./scripts/verify-git-sync.sh
```

### What It Tests

This script runs 10 verification tests to ensure:

1. **Remote Reachable** - Can connect to GitHub remote repository
2. **Remote State Fetched** - Latest remote state is available locally
3. **On Main Branch** - Currently on the 'main' branch
4. **Working Tree Clean** - No uncommitted changes exist
5. **No Untracked Files** - All files are either tracked or in .gitignore
6. **Tracked Files Exist** - All git-tracked files exist on filesystem
7. **No Merge Conflicts** - No unresolved merge conflicts
8. **.gitignore Working** - Build artifacts properly excluded (node_modules, dist, etc.)
9. **HEAD Matches Origin** - Local HEAD commit matches remote HEAD exactly
10. **No Unpushed Commits** - All local commits have been pushed to remote

### Exit Codes

- `0`: All tests passed - git and local in sync
- `1`: One or more tests failed - requires attention

### Philosophy

**Important:** Local/terminal is the authoritative source. If discrepancies exist between git and local state, update git to match local state, not the other way around.

### Example Output

```
============================================
   Git-Local Sync Verification Tests
============================================

ℹ Running verification tests...
ℹ Working directory: /Users/gberges/compass
ℹ Current branch: main

ℹ Test 6: Checking remote repository is reachable...
✓ PASS: Remote reachable: https://github.com/gberges34/compass.git

ℹ Test 10: Fetching latest remote state...
✓ PASS: Successfully fetched latest remote state

ℹ Test 8: Checking current branch is 'main'...
✓ PASS: On main branch

ℹ Test 1: Checking working tree is clean...
✓ PASS: Working tree is clean - no uncommitted changes

ℹ Test 4: Checking for untracked files...
✓ PASS: No untracked files - all files either tracked or ignored

ℹ Test 5: Checking all tracked files exist on filesystem...
✓ PASS: All tracked files exist on filesystem

ℹ Test 9: Checking for merge conflicts...
✓ PASS: No merge conflicts detected

ℹ Test 7: Checking .gitignore is working correctly...
✓ PASS: .gitignore properly excluding build artifacts

ℹ Test 3: Checking HEAD matches origin/main...
✓ PASS: HEAD matches origin/main: 73d8275f

ℹ Test 2: Checking for unpushed commits...
✓ PASS: No unpushed commits - local and remote in sync

============================================
           Test Summary Report
============================================

Tests Run:    10
Tests Passed: 10
Tests Failed: 0

✓ ALL TESTS PASSED

Git repository and local filesystem are in sync.
Local state is properly captured in git and pushed to remote.
```

### Use Cases

- **Before ending a development session** - Verify all work is committed and pushed
- **Before switching branches** - Ensure clean state
- **In CI/CD pipelines** - Automated verification
- **Pre-push hook** - Prevent pushing incomplete work
- **After major changes** - Confirm repository integrity

### Troubleshooting

If tests fail, the script provides specific fix instructions for each failure. Common fixes:

- **Uncommitted changes**: `git add . && git commit -m "description"`
- **Unpushed commits**: `git push origin main`
- **Diverged from origin**: `git push --force origin main` (if local is authoritative)
- **Untracked files**: Either `git add <file>` or add to `.gitignore`
- **Wrong branch**: `git checkout main`

Remember: Since local/terminal is authoritative, use `git push --force` when needed to make remote match local state.

---

# Compass Development Scripts

Utility scripts for development, deployment, and maintenance.

## Setup & Verification

### `setup.sh`
Initial development environment setup.

```bash
npm run setup
# or directly: bash scripts/setup.sh
```

**What it does:**
- ✓ Verifies Node.js 18+ installed
- ✓ Installs backend and frontend dependencies
- ✓ Copies .env.example to .env if missing
- ✓ Generates Prisma client
- ✓ Provides next steps

**When to use:** First time setup or after pulling major changes

---

### `verify-environment.sh`
Comprehensive environment validation.

```bash
npm run verify
```

**Checks:**
- Node.js and npm versions
- Environment files exist
- Dependencies installed
- Prisma client generated
- Port availability (3000, 3001)
- Database connectivity

**Exit codes:**
- 0: All checks passed
- 1: Critical errors found

**When to use:** Before starting development, after setup, troubleshooting

---

### `health-check.sh`
Runtime health check for running services.

```bash
npm run health
```

**Checks:**
- Backend API responding (http://localhost:3001)
- Frontend serving (http://localhost:3000)
- Database connection active

**Anthropic-only mode:**

```bash
COMPASS_ANTHROPIC_API_KEY=sk-ant-... npm run check:anthropic
```

- Requires `COMPASS_ANTHROPIC_API_KEY` (preferred) or falls back to `ANTHROPIC_API_KEY`.
- Set `CHECK_ANTHROPIC=true` (handled automatically by the npm script) to include the Anthropic connectivity test alongside the other checks.
- The script never echoes the key value, only sanitized status lines.

**When to use:** Verify running application, monitoring, CI/CD, or to validate Anthropic credentials without bespoke scripts.

---

## Development

### `dev.sh`
Start both frontend and backend servers.

```bash
npm run dev
```

**Process:**
1. Runs `verify-environment.sh`
2. Starts backend on port 3001
3. Waits for backend health check
4. Starts frontend on port 3000
5. Logs to `backend.log` and `frontend.log`

**Features:**
- Automatic health checks
- Graceful shutdown with Ctrl+C
- Detailed error messages
- Log file generation

**When to use:** Daily development

---

## Git & Deployment

### `verify-git-sync.sh`
Verify git worktree sync and deployment readiness.

**When to use:** Before merging, pre-deployment

---

## Script Architecture

```
scripts/
├── setup.sh              # One-time setup
├── verify-environment.sh # Pre-flight checks
├── dev.sh               # Development runtime
├── health-check.sh      # Runtime monitoring
└── verify-git-sync.sh   # Git operations
```

## Error Handling

All scripts use:
- Color-coded output (✓ green, ✗ red, ⚠ yellow)
- Descriptive error messages
- Non-zero exit codes on failure
- Automatic cleanup on interruption

## Logs

When running `npm run dev`, logs are written to:
- `backend.log` - Backend server output
- `frontend.log` - Frontend server output

View live logs:
```bash
tail -f backend.log
tail -f frontend.log
```

## Troubleshooting

**Script not executable**
```bash
chmod +x scripts/*.sh
```

**Colors not showing**
Ensure terminal supports ANSI colors.

**Database checks failing**
1. Verify DATABASE_URL in backend/.env
2. Ensure PostgreSQL is running
3. Check network connectivity

## Adding New Scripts

When creating new scripts:

1. **Header template:**
```bash
#!/bin/bash
set -e  # Exit on error

echo "🧭 Script Name"
echo "============"
```

2. **Use color codes:**
```bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
```

3. **Make executable:**
```bash
chmod +x scripts/new-script.sh
```

4. **Add to root package.json:**
```json
"scripts": {
  "new-command": "bash scripts/new-script.sh"
}
```

5. **Document here**
