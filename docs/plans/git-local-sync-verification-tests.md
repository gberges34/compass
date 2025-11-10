# Implementation Plan: Git-Local Sync Verification Tests

**Objective:** Create automated verification tests to ensure git repository state and local filesystem accurately reflect each other, with local/terminal as the authoritative source.

**Current State:**
- Local HEAD: 73d8275f6cdf94b3844c0a75716655a416b2ebb3
- Origin/main: 73d8275f6cdf94b3844c0a75716655a416b2ebb3
- Working tree: Clean (git status --porcelain returns empty)
- Repository: /Users/gberges/compass/frontend (inside larger compass repo)

**Testing Philosophy:**
- Local filesystem is the single source of truth
- Git state should always match local state
- Any discrepancies indicate git needs updating, NOT filesystem
- Tests should catch: uncommitted changes, unpushed commits, diverged branches

---

## Task 1: Create test script infrastructure

**Objective:** Set up a bash script for running git-local verification tests

**File to create:** `/Users/gberges/compass/scripts/verify-git-sync.sh`

**Steps:**
1. Create scripts directory: `mkdir -p /Users/gberges/compass/scripts`
2. Create the verification script file
3. Add shebang and script header with description
4. Set up exit code tracking (0 = all tests pass, 1+ = failures)
5. Add color output functions for better readability:
   - GREEN for passing tests
   - RED for failing tests
   - YELLOW for warnings
   - BLUE for info

**Script structure:**
```bash
#!/bin/bash
# Git-Local Sync Verification Tests
# Verifies that git repository state matches local filesystem
# Local/terminal is authoritative - any discrepancies mean git needs updating

set -e  # Exit on error (we'll handle test failures explicitly)

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass_test() { ... }
fail_test() { ... }
info() { ... }
```

**Expected Result:** Executable script file at `/Users/gberges/compass/scripts/verify-git-sync.sh`

**Verification:** Run `ls -la /Users/gberges/compass/scripts/verify-git-sync.sh` and verify file exists with execute permissions

---

## Task 2: Implement Test 1 - Working Tree Clean Check

**Objective:** Verify no uncommitted changes exist in working directory

**Why:** Uncommitted changes mean local state hasn't been captured in git

**Test Logic:**
```bash
test_working_tree_clean() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 1: Checking working tree is clean..."

  # Get porcelain status (empty if clean)
  STATUS=$(git status --porcelain)

  if [ -z "$STATUS" ]; then
    pass_test "Working tree is clean - no uncommitted changes"
  else
    fail_test "Working tree has uncommitted changes:"
    echo "$STATUS"
    echo ""
    echo "Fix: Run 'git add <files>' and 'git commit -m \"message\"' to commit changes"
  fi
}
```

**Expected Result:** Test passes if `git status --porcelain` returns empty string

**Verification:** Run test and confirm it passes with current clean state

---

## Task 3: Implement Test 2 - Local Ahead of Remote Check

**Objective:** Verify no unpushed commits exist (local should be synced with remote)

**Why:** Unpushed commits mean remote doesn't reflect current local state

**Test Logic:**
```bash
test_no_unpushed_commits() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 2: Checking for unpushed commits..."

  # Get list of commits in local that aren't in origin/main
  UNPUSHED=$(git log origin/main..HEAD --oneline)

  if [ -z "$UNPUSHED" ]; then
    pass_test "No unpushed commits - local and remote in sync"
  else
    fail_test "Local has unpushed commits:"
    echo "$UNPUSHED"
    echo ""
    echo "Fix: Run 'git push origin main' to push commits"
  fi
}
```

**Expected Result:** Test passes if `git log origin/main..HEAD` returns empty

**Verification:** Run test and confirm it passes after recent push

---

## Task 4: Implement Test 3 - HEAD Matches Origin Check

**Objective:** Verify local HEAD commit matches origin/main commit exactly

**Why:** Different commits mean local and remote have diverged

**Test Logic:**
```bash
test_head_matches_origin() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 3: Checking HEAD matches origin/main..."

  LOCAL_HEAD=$(git rev-parse HEAD)
  REMOTE_HEAD=$(git rev-parse origin/main)

  if [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
    pass_test "HEAD matches origin/main: $LOCAL_HEAD"
  else
    fail_test "HEAD diverged from origin/main:"
    echo "  Local HEAD:  $LOCAL_HEAD"
    echo "  Remote HEAD: $REMOTE_HEAD"
    echo ""
    echo "Fix: Run 'git push --force origin main' if local is authoritative"
  fi
}
```

**Expected Result:** Test passes if both commit hashes are identical (73d8275...)

**Verification:** Run test and verify both hashes match

---

## Task 5: Implement Test 4 - No Untracked Files Check

**Objective:** Verify no untracked files exist that should be in git

**Why:** Untracked files might be important code/config not captured in repo

**Test Logic:**
```bash
test_no_untracked_files() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 4: Checking for untracked files..."

  # Get untracked files (excluding .gitignore patterns)
  UNTRACKED=$(git ls-files --others --exclude-standard)

  if [ -z "$UNTRACKED" ]; then
    pass_test "No untracked files - all files either tracked or ignored"
  else
    fail_test "Untracked files found (may need to be added or ignored):"
    echo "$UNTRACKED"
    echo ""
    echo "Fix: Either add to git with 'git add <file>' or add to .gitignore"
  fi
}
```

**Expected Result:** Test passes if no untracked files (all tracked or in .gitignore)

**Verification:** Run test and check untracked files count

---

## Task 6: Implement Test 5 - Tracked Files Exist Check

**Objective:** Verify all git-tracked files actually exist in filesystem

**Why:** Missing tracked files indicate filesystem corruption or deletion

**Test Logic:**
```bash
test_tracked_files_exist() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 5: Checking all tracked files exist on filesystem..."

  MISSING_FILES=""

  # Get all tracked files
  while IFS= read -r file; do
    if [ ! -e "$file" ]; then
      MISSING_FILES="${MISSING_FILES}${file}\n"
    fi
  done < <(git ls-files)

  if [ -z "$MISSING_FILES" ]; then
    pass_test "All tracked files exist on filesystem"
  else
    fail_test "Tracked files missing from filesystem:"
    echo -e "$MISSING_FILES"
    echo ""
    echo "Fix: Restore files or run 'git rm <file>' to remove from tracking"
  fi
}
```

**Expected Result:** Test passes if all tracked files exist

**Verification:** Run test and confirm all files present

---

## Task 7: Implement Test 6 - Remote Reachability Check

**Objective:** Verify we can reach origin remote to check sync status

**Why:** Can't verify sync if we can't reach remote repository

**Test Logic:**
```bash
test_remote_reachable() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 6: Checking remote repository is reachable..."

  if git ls-remote origin HEAD &>/dev/null; then
    REMOTE_URL=$(git remote get-url origin)
    pass_test "Remote reachable: $REMOTE_URL"
  else
    fail_test "Cannot reach remote repository"
    echo ""
    echo "Fix: Check network connection and remote URL"
  fi
}
```

**Expected Result:** Test passes if remote responds to ls-remote

**Verification:** Run test and confirm remote connectivity

---

## Task 8: Implement Test 7 - .gitignore Effectiveness Check

**Objective:** Verify .gitignore is properly excluding build artifacts

**Why:** Build artifacts in git bloat repository unnecessarily

**Test Logic:**
```bash
test_gitignore_effectiveness() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 7: Checking .gitignore is working correctly..."

  IGNORED_FAILURES=""

  # Check common build artifacts that should be ignored
  SHOULD_BE_IGNORED=(
    "node_modules"
    "build"
    "dist"
    "backend/dist"
    ".DS_Store"
    ".env"
  )

  for pattern in "${SHOULD_BE_IGNORED[@]}"; do
    # Check if pattern exists and is tracked
    if [ -e "$pattern" ] && git ls-files --error-unmatch "$pattern" &>/dev/null; then
      IGNORED_FAILURES="${IGNORED_FAILURES}${pattern}\n"
    fi
  done

  if [ -z "$IGNORED_FAILURES" ]; then
    pass_test ".gitignore properly excluding build artifacts"
  else
    fail_test "Build artifacts are being tracked (should be ignored):"
    echo -e "$IGNORED_FAILURES"
    echo ""
    echo "Fix: Add patterns to .gitignore and run 'git rm --cached <file>'"
  fi
}
```

**Expected Result:** Test passes if all build artifacts are ignored

**Verification:** Check that backend/dist, node_modules, etc. are not tracked

---

## Task 9: Implement Test 8 - Branch Consistency Check

**Objective:** Verify we're on the correct branch (main) for development

**Why:** Working on wrong branch could cause confusion and merge issues

**Test Logic:**
```bash
test_on_main_branch() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 8: Checking current branch is 'main'..."

  CURRENT_BRANCH=$(git branch --show-current)

  if [ "$CURRENT_BRANCH" = "main" ]; then
    pass_test "On main branch"
  else
    fail_test "Not on main branch - currently on: $CURRENT_BRANCH"
    echo ""
    echo "Fix: Run 'git checkout main' to switch to main branch"
  fi
}
```

**Expected Result:** Test passes if current branch is 'main'

**Verification:** Run test and verify we're on main

---

## Task 10: Implement Test 9 - No Merge Conflicts Check

**Objective:** Verify no unresolved merge conflicts exist

**Why:** Merge conflicts indicate incomplete merge that needs resolution

**Test Logic:**
```bash
test_no_merge_conflicts() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 9: Checking for merge conflicts..."

  # Check for conflict markers in tracked files
  CONFLICTS=$(git diff --check 2>&1 | grep "conflict" || true)

  # Also check git status for "both modified" files
  CONFLICTED_FILES=$(git status --porcelain | grep "^UU" || true)

  if [ -z "$CONFLICTS" ] && [ -z "$CONFLICTED_FILES" ]; then
    pass_test "No merge conflicts detected"
  else
    fail_test "Merge conflicts detected:"
    echo "$CONFLICTS"
    echo "$CONFLICTED_FILES"
    echo ""
    echo "Fix: Resolve conflicts and commit changes"
  fi
}
```

**Expected Result:** Test passes if no conflict markers or unmerged files

**Verification:** Run test and confirm no conflicts

---

## Task 11: Implement Test 10 - Fetch Latest Remote State

**Objective:** Fetch latest remote state before running comparison tests

**Why:** Need current remote state to accurately compare with local

**Test Logic:**
```bash
test_fetch_remote_state() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 10: Fetching latest remote state..."

  if git fetch origin main &>/dev/null; then
    pass_test "Successfully fetched latest remote state"
  else
    fail_test "Failed to fetch remote state"
    echo ""
    echo "Fix: Check network connection and authentication"
  fi
}
```

**Expected Result:** Test passes if fetch succeeds

**Verification:** Run test and verify fetch completes

---

## Task 12: Add Test Summary Report

**Objective:** Display comprehensive test results summary at end

**Steps:**
1. Calculate pass rate percentage
2. Display total tests run, passed, failed
3. Show overall status (PASS/FAIL)
4. Exit with appropriate code (0 = pass, 1 = fail)

**Summary Logic:**
```bash
print_summary() {
  echo ""
  echo "============================================"
  echo "           Test Summary Report"
  echo "============================================"
  echo ""
  echo "Tests Run:    $TESTS_RUN"
  echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
  echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
  echo ""

  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo ""
    echo "Git repository and local filesystem are in sync."
    echo "Local state is properly captured in git and pushed to remote."
    exit 0
  else
    echo -e "${RED}✗ TESTS FAILED${NC}"
    echo ""
    echo "Git and local are out of sync. Review failures above."
    echo "Remember: Local/terminal is authoritative - update git accordingly."
    exit 1
  fi
}
```

**Expected Result:** Clear pass/fail summary with actionable information

**Verification:** Run full test suite and check summary output

---

## Task 13: Add main test execution flow

**Objective:** Create main function that runs all tests in sequence

**Steps:**
1. Create main() function
2. Call all test functions in logical order
3. Call summary report
4. Handle script execution

**Main function:**
```bash
main() {
  echo "============================================"
  echo "   Git-Local Sync Verification Tests"
  echo "============================================"
  echo ""
  info "Running verification tests..."
  info "Working directory: $(pwd)"
  info "Current branch: $(git branch --show-current)"
  echo ""

  # Run tests in logical order
  test_remote_reachable           # Test 6 - must pass first
  test_fetch_remote_state         # Test 10 - get latest remote
  test_on_main_branch             # Test 8
  test_working_tree_clean         # Test 1
  test_no_untracked_files         # Test 4
  test_tracked_files_exist        # Test 5
  test_no_merge_conflicts         # Test 9
  test_gitignore_effectiveness    # Test 7
  test_head_matches_origin        # Test 3
  test_no_unpushed_commits        # Test 2

  # Print summary
  print_summary
}

# Execute main function
main
```

**Expected Result:** All tests run in sequence with clear output

**Verification:** Execute script and observe test flow

---

## Task 14: Make script executable and add to documentation

**Objective:** Set proper permissions and document usage

**Steps:**
1. Make script executable: `chmod +x /Users/gberges/compass/scripts/verify-git-sync.sh`
2. Create usage documentation
3. Add script to README or docs

**Usage Documentation:**
```markdown
## Git-Local Sync Verification

To verify git and local filesystem are in sync, run:

```bash
cd /Users/gberges/compass
./scripts/verify-git-sync.sh
```

This script runs 10 verification tests to ensure:
- Working tree is clean (no uncommitted changes)
- No unpushed commits exist
- Local HEAD matches remote HEAD exactly
- No untracked files (except .gitignore patterns)
- All tracked files exist on filesystem
- Remote repository is reachable
- .gitignore is working correctly
- Currently on 'main' branch
- No merge conflicts
- Latest remote state is fetched

Exit codes:
- 0: All tests passed - git and local in sync
- 1: One or more tests failed - requires attention

**Remember:** Local/terminal is the authoritative source. If discrepancies exist, update git to match local state.
```

**Expected Result:** Executable script with clear documentation

**Verification:** Run `./scripts/verify-git-sync.sh` and confirm it works

---

## Task 15: Test the verification script

**Objective:** Run the complete verification script and ensure all tests pass

**Steps:**
1. Navigate to compass root: `cd /Users/gberges/compass`
2. Run script: `./scripts/verify-git-sync.sh`
3. Verify all 10 tests pass
4. Check exit code: `echo $?` (should be 0)

**Expected Results:**
- ✓ Test 1: Working tree clean
- ✓ Test 2: No unpushed commits
- ✓ Test 3: HEAD matches origin
- ✓ Test 4: No untracked files
- ✓ Test 5: All tracked files exist
- ✓ Test 6: Remote reachable
- ✓ Test 7: .gitignore working
- ✓ Test 8: On main branch
- ✓ Test 9: No merge conflicts
- ✓ Test 10: Remote state fetched
- Exit code: 0

**Verification:** All tests green, exit code 0, summary shows "ALL TESTS PASSED"

---

## Summary

**Total Tasks:** 15
**Estimated Time:** 30-45 minutes
**Risk Level:** VERY LOW (read-only verification tests)

**Files to Create:**
- `/Users/gberges/compass/scripts/verify-git-sync.sh` - Main verification script
- Documentation in README or separate doc file

**Tests Implemented:** 10 verification tests covering all aspects of git-local sync

**Success Criteria:**
- ✅ Script created and executable
- ✅ All 10 tests implemented
- ✅ Tests pass with current state
- ✅ Clear error messages with fix instructions
- ✅ Proper exit codes
- ✅ Usage documented

**Usage After Implementation:**
```bash
# Run verification anytime
cd /Users/gberges/compass
./scripts/verify-git-sync.sh

# Use in CI/CD or pre-push hooks
git config core.hooksPath ./scripts/hooks
```

**Benefits:**
- Automated verification of git-local sync
- Catches issues before they become problems
- Clear actionable error messages
- Single source of truth enforcement (local is authoritative)
- Can be integrated into CI/CD pipeline
