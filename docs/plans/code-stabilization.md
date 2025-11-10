# Implementation Plan: Code Stabilization

**Objective:** Stabilize the codebase by stopping services, running formatters/linters, running tests, and verifying database migrations.

**Current State:**
- Multiple npm start processes running (backend, frontend, prisma studio)
- Background bash shells: 8 active
- Frontend: React app on port 3000
- Backend: Express API on port 3001
- Prisma: Database schema with migrations
- No explicit formatters/linters configured in package.json scripts
- Frontend has built-in eslint via react-scripts
- Test command available: `npm test` (frontend)

**Testing Philosophy:**
- Stop all running services cleanly
- Run formatters and linters to ensure code quality
- Run test suites and capture any failures
- Verify database migration integrity (up and down paths)
- Document any failing tests with seeds/inputs

---

## Task 1: Stop all running services

**Objective:** Cleanly shut down all background services and processes

**Current Running Processes:**
- Frontend dev server (npm start - multiple instances)
- Backend dev server (npm start)
- Prisma Studio (port 5555)
- TypeScript type checkers (fork-ts-checker-webpack-plugin)
- Multiple background bash shells

**Steps:**
1. Kill all background bash shells using KillShell tool:
   - Shell 204441 (backend npm start)
   - Shell 1aede6 (npm start)
   - Shell 3d5d3a (npm start)
   - Shell 919a3c (npm start)
   - Shell 5926d6 (npm start)
   - Shell 7f1a5d (npm start)
   - Shell ec0e64 (npm start)
   - Shell 84844c (npm start)

2. Verify all processes stopped: `ps aux | grep -E "(npm start|node.*compass)" | grep -v grep`

3. Kill any remaining Prisma Studio processes: `pkill -f "prisma studio"`

4. Verify ports are free:
   - Frontend port 3000: `lsof -ti:3000`
   - Backend port 3001: `lsof -ti:3001`
   - Prisma port 5555: `lsof -ti:5555`

**Expected Result:** All services stopped, ports free, clean slate

**Verification:** Run `ps aux | grep compass` and verify no processes

---

## Task 2: Check for formatter/linter configuration

**Objective:** Determine what formatters and linters are configured

**Files to check:**
- `/Users/gberges/compass/frontend/package.json` - Check for lint/format scripts
- `/Users/gberges/compass/backend/package.json` - Check for lint/format scripts
- `.eslintrc*`, `.prettierrc*`, `.editorconfig` files

**Current Findings:**
- Frontend: ESLint configured via react-app (package.json line 37-41)
- Backend: No explicit linter/formatter scripts
- No Prettier configuration at project root
- ESLint embedded in react-scripts

**Steps:**
1. Check if prettier is installed:
   - Frontend: `cd frontend && npm list prettier`
   - Backend: `cd backend && npm list prettier`

2. Check if eslint CLI is available:
   - Frontend: `cd frontend && npm list eslint`
   - Backend: `cd backend && npm list eslint`

3. Determine what commands to run based on available tools

**Expected Result:** List of available formatter/linter commands

**Verification:** Know which commands to execute in next tasks

---

## Task 3: Run TypeScript compiler checks

**Objective:** Verify TypeScript code compiles without errors

**Why:** Catch type errors before they become runtime bugs

**Frontend TypeScript Check:**
```bash
cd /Users/gberges/compass/frontend
npx tsc --noEmit
```

**Backend TypeScript Check:**
```bash
cd /Users/gberges/compass/backend
npm run build
```

**Steps:**
1. Run frontend TypeScript check and capture output
2. Run backend build (which runs tsc)
3. Document any type errors with file:line references
4. Count total errors in each project

**Expected Result:**
- TypeScript compilation succeeds or
- Clear list of type errors to fix

**Verification:** Exit code 0 = success, non-zero = errors present

---

## Task 4: Run ESLint on frontend

**Objective:** Check frontend code quality and style

**Command:**
```bash
cd /Users/gberges/compass/frontend
npm run build 2>&1 | grep -E "(Warning|Error|Failed)"
```

**Alternative (if available):**
```bash
npx eslint src/**/*.{ts,tsx}
```

**Steps:**
1. Run ESLint check via build command (includes linting)
2. Capture all warnings and errors
3. Categorize by severity (warning vs error)
4. Document most common issues

**Expected Result:** List of lint warnings/errors with file locations

**Verification:** Build succeeds or fails with specific lint errors

---

## Task 5: Run frontend tests

**Objective:** Execute frontend test suite and capture failures

**Command:**
```bash
cd /Users/gberges/compass/frontend
CI=true npm test -- --watchAll=false --coverage
```

**Steps:**
1. Run tests in CI mode (non-interactive)
2. Capture test results:
   - Total tests run
   - Tests passed
   - Tests failed
   - Test coverage percentage
3. For each failing test, capture:
   - Test name
   - Test file
   - Failure message
   - Input data/seeds that caused failure
4. Save failing test details to file

**Expected Result:** Test results summary with failure details

**Verification:** Exit code 0 = all pass, non-zero = failures present

**Output File:** `/Users/gberges/compass/docs/test-results-frontend-$(date +%Y%m%d).md`

---

## Task 6: Check if backend has tests

**Objective:** Determine if backend test infrastructure exists

**Steps:**
1. Check for test files: `find backend -name "*.test.ts" -o -name "*.test.js" -o -name "*.spec.ts"`
2. Check package.json for test script
3. Check for test frameworks (jest, mocha, vitest):
   ```bash
   cd backend
   npm list jest mocha vitest
   ```

**Expected Result:** Know if backend tests exist and how to run them

**Verification:** List of test files or confirmation no tests exist

---

## Task 7: Verify Prisma schema validity

**Objective:** Ensure database schema is valid and can be generated

**Command:**
```bash
cd /Users/gberges/compass/backend
npx prisma validate
```

**Steps:**
1. Run Prisma validate command
2. Check for schema syntax errors
3. Verify all models are properly defined
4. Check for relation errors

**Expected Result:** Schema validation passes or specific errors

**Verification:** Exit code 0 = valid schema

---

## Task 8: Verify Prisma migration history

**Objective:** Check migration history and ensure it's clean

**Steps:**
1. List all migrations: `ls -la /Users/gberges/compass/backend/prisma/migrations/`
2. Check migration status: `cd backend && npx prisma migrate status`
3. Verify migrations applied:
   - Check database connection
   - List applied migrations
   - Check for pending migrations
4. Document migration history

**Expected Result:** Clean migration history, all migrations applied

**Verification:** `prisma migrate status` shows no pending migrations

---

## Task 9: Test migration rollback (if applicable)

**Objective:** Verify migrations can be rolled back (down path)

**Important:** This is a dangerous operation in production. Only test if:
- We have a development database
- We can restore from backup
- User explicitly requests it

**Steps (if safe to proceed):**
1. Create database backup first
2. Note current migration state
3. **Skip actual rollback testing** - Prisma doesn't support down migrations
4. Document that Prisma uses forward-only migrations
5. Verify we can reset and re-apply: `npx prisma migrate reset --skip-seed`

**Expected Result:** Understanding of migration safety

**Verification:** Documentation of migration approach

**Note:** Prisma uses forward-only migrations, no "down" path exists

---

## Task 10: Format code with available tools

**Objective:** Auto-format code for consistency

**If Prettier available:**
```bash
# Frontend
cd frontend
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css}"

# Backend
cd backend
npx prettier --write "src/**/*.{ts,js,json}"
```

**If only ESLint:**
```bash
# Frontend (ESLint can auto-fix some issues)
cd frontend
npx eslint src/**/*.{ts,tsx} --fix
```

**Steps:**
1. Check if prettier is installed
2. If yes, run prettier with --write flag
3. If no, run eslint with --fix flag
4. Review which files were modified
5. Commit formatting changes if any

**Expected Result:** Code formatted consistently

**Verification:** `git status` shows modified files (or none if already formatted)

---

## Task 11: Create test results summary

**Objective:** Document all test results and issues found

**Summary Document:** `/Users/gberges/compass/docs/stabilization-report-$(date +%Y%m%d).md`

**Contents:**
```markdown
# Code Stabilization Report - [DATE]

## Services Stopped
- [x] Frontend dev server (port 3000)
- [x] Backend API server (port 3001)
- [x] Prisma Studio (port 5555)
- [x] Background processes cleaned up

## TypeScript Compilation
### Frontend
- Status: [PASS/FAIL]
- Errors: [COUNT]
- Details: [FILE:LINE REFERENCES]

### Backend
- Status: [PASS/FAIL]
- Errors: [COUNT]
- Details: [FILE:LINE REFERENCES]

## Linting
### Frontend ESLint
- Warnings: [COUNT]
- Errors: [COUNT]
- Common issues: [LIST]

### Backend
- Linting: [CONFIGURED/NOT CONFIGURED]

## Tests
### Frontend Tests
- Total: [COUNT]
- Passed: [COUNT]
- Failed: [COUNT]
- Coverage: [PERCENTAGE]

#### Failing Tests
[List each failing test with:
- Test name
- File location
- Failure reason
- Input data/seeds
]

### Backend Tests
- Tests exist: [YES/NO]
- Results: [IF RUN]

## Database Migrations
- Schema valid: [YES/NO]
- Migration status: [CLEAN/PENDING/ISSUES]
- Latest migration: [NAME]
- Rollback capability: [Prisma uses forward-only migrations]

## Code Formatting
- Formatter used: [PRETTIER/ESLINT/NONE]
- Files modified: [COUNT]
- Status: [COMPLETE]

## Action Items
1. [Issue 1 - Priority: HIGH/MEDIUM/LOW]
2. [Issue 2 - Priority: HIGH/MEDIUM/LOW]
...

## Conclusion
[Overall assessment of code stability]
```

**Expected Result:** Comprehensive report of stabilization efforts

**Verification:** Report exists and is complete

---

## Task 12: Restart services (if requested)

**Objective:** Restart services after stabilization

**Only if user requests or after all issues resolved**

**Steps:**
1. Start backend: `cd backend && npm start` (in background)
2. Start frontend: `cd frontend && npm start` (in background)
3. Verify services running:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001/health
4. Check console for startup errors

**Expected Result:** Services running cleanly

**Verification:** Both servers respond to requests

---

## Summary

**Total Tasks:** 12
**Estimated Time:** 30-45 minutes
**Risk Level:** LOW (mostly read-only checks, controlled service stops)

**Services to Stop:**
- 8 background bash shells
- Frontend dev server
- Backend API server
- Prisma Studio
- TypeScript checkers

**Checks to Perform:**
- ✅ TypeScript compilation (frontend + backend)
- ✅ ESLint checks (frontend)
- ✅ Frontend test suite
- ✅ Backend test check (if exists)
- ✅ Prisma schema validation
- ✅ Migration history verification
- ✅ Code formatting

**Success Criteria:**
- ✅ All services stopped cleanly
- ✅ TypeScript compiles without errors (or errors documented)
- ✅ Lint checks pass (or issues documented)
- ✅ Tests run (failures documented with seeds/inputs)
- ✅ Database schema valid
- ✅ Migration history clean
- ✅ Code formatted consistently
- ✅ Comprehensive stabilization report created

**Note on Migrations:**
Prisma uses forward-only migrations. There is no "down" migration path. To rollback:
- Use `prisma migrate reset` (drops DB and re-applies all migrations)
- Or manually write SQL to reverse changes
- Or restore from database backup

**Output Files:**
- `/Users/gberges/compass/docs/test-results-frontend-[DATE].md`
- `/Users/gberges/compass/docs/stabilization-report-[DATE].md`
