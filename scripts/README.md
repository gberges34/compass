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
