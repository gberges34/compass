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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass_test() {
  TESTS_PASSED=$((TESTS_PASSED + 1))
  echo -e "${GREEN}✓ PASS:${NC} $1"
}

fail_test() {
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo -e "${RED}✗ FAIL:${NC} $1"
}

info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Test 1: Working Tree Clean Check
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
  echo ""
}

# Test 2: No Unpushed Commits Check
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
  echo ""
}

# Test 3: HEAD Matches Origin Check
test_head_matches_origin() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 3: Checking HEAD matches origin/main..."

  LOCAL_HEAD=$(git rev-parse HEAD)
  REMOTE_HEAD=$(git rev-parse origin/main)

  if [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
    pass_test "HEAD matches origin/main: ${LOCAL_HEAD:0:8}"
  else
    fail_test "HEAD diverged from origin/main:"
    echo "  Local HEAD:  $LOCAL_HEAD"
    echo "  Remote HEAD: $REMOTE_HEAD"
    echo ""
    echo "Fix: Run 'git push --force origin main' if local is authoritative"
  fi
  echo ""
}

# Test 4: No Untracked Files Check
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
  echo ""
}

# Test 5: Tracked Files Exist Check
test_tracked_files_exist() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 5: Checking all tracked files exist on filesystem..."

  MISSING_FILES=""
  MISSING_COUNT=0

  # Get all tracked files
  while IFS= read -r file; do
    if [ ! -e "$file" ]; then
      MISSING_FILES="${MISSING_FILES}${file}\n"
      MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
  done < <(git ls-files)

  if [ -z "$MISSING_FILES" ]; then
    pass_test "All tracked files exist on filesystem"
  else
    fail_test "Tracked files missing from filesystem ($MISSING_COUNT files):"
    echo -e "$MISSING_FILES" | head -20
    if [ $MISSING_COUNT -gt 20 ]; then
      echo "... and $((MISSING_COUNT - 20)) more"
    fi
    echo ""
    echo "Fix: Restore files or run 'git rm <file>' to remove from tracking"
  fi
  echo ""
}

# Test 6: Remote Reachability Check
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
  echo ""
}

# Test 7: .gitignore Effectiveness Check
test_gitignore_effectiveness() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 7: Checking .gitignore is working correctly..."

  IGNORED_FAILURES=""

  # Check common build artifacts that should be ignored
  SHOULD_BE_IGNORED=(
    "frontend/node_modules"
    "backend/node_modules"
    "frontend/build"
    "backend/dist"
    ".DS_Store"
  )

  for pattern in "${SHOULD_BE_IGNORED[@]}"; do
    # Check if pattern exists and is tracked
    if [ -e "$pattern" ]; then
      if git ls-files --error-unmatch "$pattern" &>/dev/null; then
        IGNORED_FAILURES="${IGNORED_FAILURES}${pattern}\n"
      fi
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
  echo ""
}

# Test 8: Branch Consistency Check
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
  echo ""
}

# Test 9: No Merge Conflicts Check
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
    [ -n "$CONFLICTS" ] && echo "$CONFLICTS"
    [ -n "$CONFLICTED_FILES" ] && echo "$CONFLICTED_FILES"
    echo ""
    echo "Fix: Resolve conflicts and commit changes"
  fi
  echo ""
}

# Test 10: Fetch Latest Remote State
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
  echo ""
}

# Test 11: Forbidden Files Check (REQ-SEC-001)
test_forbidden_files_absent() {
  TESTS_RUN=$((TESTS_RUN + 1))
  info "Test 11: Checking forbidden files do not exist..."

  set +e
  output=$(bash "$REPO_ROOT/scripts/check-forbidden-files.sh" 2>&1)
  status=$?
  set -e

  if [ $status -eq 0 ]; then
    pass_test "No forbidden files detected"
  else
    fail_test "Forbidden files detected (see REQ-SEC-001)"
    echo "$output"
    echo ""
    echo "Fix: Remove the files listed above before continuing."
  fi
  echo ""
}

# Print summary report
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

# Main execution flow
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
  test_forbidden_files_absent     # Test 11

  # Print summary
  print_summary
}

# Execute main function
main
