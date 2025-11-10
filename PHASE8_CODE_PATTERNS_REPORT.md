# PHASE 8: CODE PATTERNS & CONSISTENCY ANALYSIS

## Executive Summary
Found 24 major code pattern violations across frontend (20) and backend (4) with high refactoring potential. Primary issues: repeated badge variant logic, date formatting patterns, loading state boilerplate, and inconsistent styling approaches.

---

## FINDINGS (Ranked by Score: Simplicity × Benefit)

### Finding #1: Repeated Priority Badge Variant Mapping
**Category**: ♻️ Refactor
**Location**: 
- frontend/src/pages/TodayPage.tsx:258
- frontend/src/pages/TodayPage.tsx:293
- frontend/src/pages/TasksPage.tsx:225
- frontend/src/pages/TasksPage.tsx:235
- frontend/src/pages/TasksPage.tsx:286
- frontend/src/pages/TasksPage.tsx:292
- frontend/src/pages/CalendarPage.tsx:369

**Simplicity**: 9
**Benefit**: 9
**Score**: 81/100

**Current State**: 
```tsx
<Badge variant={task.priority === 'MUST' ? 'danger' : task.priority === 'SHOULD' ? 'warn' : task.priority === 'COULD' ? 'sun' : 'neutral'} size="small">
  {task.priority}
</Badge>
```
**Band-Aid/Issue**: Ternary chain repeated 6+ times across multiple pages
**Root Cause**: No utility function created for mapping Priority enums to Badge variants
**Simplified Solution**: Add to `lib/designTokens.ts`:
```tsx
export const getPriorityBadgeVariant = (priority: Priority): BadgeVariant => {
  const variants = {
    MUST: 'danger',
    SHOULD: 'warn',
    COULD: 'sun',
    MAYBE: 'neutral',
  };
  return variants[priority] || 'neutral';
};
```
**Impact**: Eliminates 6 instances of identical logic. Improves maintainability if priority colors change.

---

### Finding #2: Repeated Energy Level Badge Mapping
**Category**: ♻️ Refactor
**Location**: 
- frontend/src/pages/TasksPage.tsx:228
- frontend/src/pages/CalendarPage.tsx:564
- frontend/src/pages/OrientEastPage.tsx:200

**Simplicity**: 9
**Benefit**: 8
**Score**: 72/100

**Current State**:
```tsx
<Badge variant={task.energyRequired === 'HIGH' ? 'mint' : task.energyRequired === 'MEDIUM' ? 'sun' : 'blush'}>
  {task.energyRequired}
</Badge>
```
**Band-Aid/Issue**: Energy variant mapping duplicated 3+ times
**Root Cause**: No utility wrapper around getEnergyStyle() for Badge component
**Simplified Solution**: Add to `lib/designTokens.ts`:
```tsx
export const getEnergyBadgeVariant = (energy: Energy): BadgeVariant => {
  const energyMap = { HIGH: 'mint', MEDIUM: 'sun', LOW: 'blush' };
  return energyMap[energy] || 'sun';
};
```
**Impact**: Consolidates energy variant mapping. Prevents bugs if badge variants change.

---

### Finding #3: Date Formatting with Repeated Locale Options
**Category**: ♻️ Refactor
**Location**:
- frontend/src/pages/TodayPage.tsx:20-25
- frontend/src/pages/OrientEastPage.tsx:54-59
- frontend/src/pages/OrientWestPage.tsx:26-31
- frontend/src/pages/ReviewsPage.tsx:81-87

**Simplicity**: 9
**Benefit**: 7
**Score**: 63/100

**Current State**:
```tsx
const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
```
**Band-Aid/Issue**: Same date format options repeated 4 times
**Root Cause**: No shared utility for formatting dates with locale options
**Simplified Solution**: Add to `lib/dateUtils.ts`:
```tsx
export const formatTodayLong = () => 
  new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

export const formatDateShort = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
```
**Impact**: Reduces boilerplate. Centralizes locale formatting strategy.

---

### Finding #4: Loading Spinner UI Pattern (7 instances)
**Category**: 🩹 Band-Aid
**Location**:
- frontend/src/pages/TasksPage.tsx:199-200
- frontend/src/pages/ReviewsPage.tsx:140-142
- frontend/src/pages/CalendarPage.tsx:322-327
- frontend/src/pages/ClarifyPage.tsx:138-140
- frontend/src/pages/OrientEastPage.tsx:171
- frontend/src/pages/OrientWestPage.tsx:102

**Simplicity**: 10
**Benefit**: 6
**Score**: 60/100

**Current State**: Multiple inline spinner implementations
```tsx
<div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action"></div>
```
**Band-Aid/Issue**: Loading spinner component exists (LoadingSkeleton) but pages create custom spinners
**Root Cause**: LoadingSkeleton doesn't support full-page loading variant
**Simplified Solution**: Add to LoadingSkeleton.tsx:
```tsx
case 'fullpage':
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action"></div>
    </div>
  );
```
**Impact**: Reduces duplicate spinner code. Ensures consistent loading UX.

---

### Finding #5: isMounted Cleanup Pattern (14 instances)
**Category**: 🌳 Root Cause
**Location**:
- frontend/src/pages/TodayPage.tsx:27-89
- frontend/src/pages/OrientWestPage.tsx:33-62
- frontend/src/pages/CalendarPage.tsx:various

**Simplicity**: 8
**Benefit**: 7
**Score**: 56/100

**Current State**:
```tsx
useEffect(() => {
  let isMounted = true;
  const fetchData = async () => { ... }
  fetchData();
  return () => { isMounted = false; };
}, []);
```
**Band-Aid/Issue**: Manual isMounted pattern repeated in multiple pages
**Root Cause**: Migration to React Query not complete; pages still use manual state management
**Simplified Solution**: Migrate all pages to React Query hooks (already done in CalendarPage):
```tsx
const { data, isLoading } = useTasks();
```
**Impact**: Eliminates memory leak prevention boilerplate. Simplifies code significantly.

---

### Finding #6: Repeated Error Toast + Console.error Pattern
**Category**: ♻️ Refactor
**Location**: 16 instances across all pages

**Simplicity**: 8
**Benefit**: 6
**Score**: 48/100

**Current State**:
```tsx
catch (err) {
  toast.showError('Failed to load tasks. Please try again.');
  console.error('Error fetching tasks:', err);
}
```
**Band-Aid/Issue**: Same pattern repeated in every error handler
**Root Cause**: No wrapper for error handling that combines toasting + logging
**Simplified Solution**: Add to `lib/errorUtils.ts`:
```tsx
export const handleError = (error: unknown, message: string, context?: string) => {
  const errorMsg = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[${context || 'Error'}]`, errorMsg);
  return message;
};
```
**Impact**: Reduces boilerplate. Centralizes error logging strategy.

---

### Finding #7: Task Priority Order Logic Repeated
**Category**: ♻️ Refactor
**Location**:
- frontend/src/pages/TodayPage.tsx:55-58 (priority sorting)

**Simplicity**: 9
**Benefit**: 5
**Score**: 45/100

**Current State**:
```tsx
const priorityOrder = { MUST: 0, SHOULD: 1, COULD: 2, MAYBE: 3 };
const sortedNext = next.sort(
  (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
);
```
**Band-Aid/Issue**: Priority order constant defined inline
**Root Cause**: No shared constants file for priority/energy/category enums
**Simplified Solution**: Add to `lib/constants.ts`:
```tsx
export const PRIORITY_ORDER = { MUST: 0, SHOULD: 1, COULD: 2, MAYBE: 3 };
export const sortByPriority = (items: Task[]) =>
  [...items].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
```
**Impact**: Enables reuse. Makes sorting logic testable.

---

### Finding #8: Deep Work Block Display Styling (8 instances)
**Category**: ♻️ Refactor
**Location**:
- frontend/src/pages/TodayPage.tsx:178-200
- frontend/src/pages/OrientEastPage.tsx:212-233
- frontend/src/pages/OrientWestPage.tsx:228-245
- frontend/src/pages/CalendarPage.tsx:legend

**Simplicity**: 8
**Benefit**: 6
**Score**: 48/100

**Current State**: Repeated styling for deep work blocks:
```tsx
<div className="bg-sky border border-sky rounded-default p-12">
  <div className="flex items-center justify-between">
    <span className="font-medium text-blue-900">{plan.deepWorkBlock1.focus}</span>
    <span className="text-small text-blue-700">{plan.deepWorkBlock1.start} - {plan.deepWorkBlock1.end}</span>
  </div>
</div>
```
**Band-Aid/Issue**: Deep work block UI repeated with identical styling
**Root Cause**: No reusable TimeBlockCard component
**Simplified Solution**: Create `components/TimeBlockCard.tsx`:
```tsx
interface TimeBlockCardProps {
  type: 'deepWork' | 'admin' | 'buffer';
  focus?: string;
  start: string;
  end: string;
}
const TimeBlockCard: React.FC<TimeBlockCardProps> = ({ type, focus, start, end }) => {
  const styles = {
    deepWork: 'bg-sky border-sky text-blue-900',
    admin: 'bg-lavender border-lavender text-purple-900',
    buffer: 'bg-fog border-fog text-slate',
  };
  return <div className={`border rounded-default p-12 ${styles[type]}`}>...</div>;
};
```
**Impact**: Eliminates 8 instances of duplicated styling. Makes design system changes easier.

---

### Finding #9: Modal/Dialog Structure Duplication
**Category**: ♻️ Refactor
**Location**:
- frontend/src/pages/TasksPage.tsx:267-340
- frontend/src/pages/CalendarPage.tsx:510-615

**Simplicity**: 7
**Benefit**: 5
**Score**: 35/100

**Current State**: Manual modal backdrop + close button patterns:
```tsx
{selectedTask && (
  <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-24 z-50">
    <div className="bg-cloud rounded-modal shadow-eglass border border-fog max-w-2xl w-full p-32">
      <button onClick={() => setSelectedTask(null)}>
        <svg className="w-24 h-24">...</svg>
      </button>
      {/* content */}
    </div>
  </div>
)}
```
**Band-Aid/Issue**: Modal styling repeated with minor variations
**Root Cause**: No Modal/Dialog wrapper component
**Simplified Solution**: Create `components/Modal.tsx`:
```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => (
  isOpen ? (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cloud rounded-modal shadow-eglass border border-fog max-w-2xl p-32">
        <button onClick={onClose} className="absolute top-16 right-16">✕</button>
        {children}
      </div>
    </div>
  ) : null
);
```
**Impact**: Reduces duplication. Improves modal UX consistency.

---

### Finding #10: Form State Proliferation in OrientEastPage
**Category**: 🌳 Root Cause
**Location**: frontend/src/pages/OrientEastPage.tsx:16-52

**Simplicity**: 6
**Benefit**: 7
**Score**: 42/100

**Current State**: 11 separate useState calls for form fields:
```tsx
const [energyLevel, setEnergyLevel] = useState<Energy>('MEDIUM');
const [dwb1Start, setDwb1Start] = useState('09:00');
const [dwb1End, setDwb1End] = useState('11:00');
const [dwb1Focus, setDwb1Focus] = useState('');
// ... 7 more individual state setters
```
**Band-Aid/Issue**: Excessive individual state variables
**Root Cause**: Not using useReducer or form library for complex forms
**Simplified Solution**: Use `useReducer` or Formik/React Hook Form:
```tsx
interface FormState {
  energyLevel: Energy;
  deepWorkBlock1: DeepWorkBlock;
  deepWorkBlock2?: DeepWorkBlock;
  adminBlock?: TimeBlock;
  bufferBlock?: TimeBlock;
  topOutcomes: [string, string, string];
  reward?: string;
}
const [form, dispatch] = useReducer(formReducer, initialState);
```
**Impact**: Simplifies form submission. Reduces state setter proliferation.

---

### Finding #11: Hardcoded Category Colors in Calendar
**Category**: ♻️ Refactor
**Location**: frontend/src/pages/CalendarPage.tsx:240-254

**Simplicity**: 9
**Benefit**: 7
**Score**: 63/100

**Current State**: Category colors hardcoded twice:
```tsx
// Line 240-254 AND in legend 433-453
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    SCHOOL: '#3b82f6',
    MUSIC: '#8b5cf6',
    FITNESS: '#10b981',
    // ... repeated in legend
  };
  return colors[category] || '#6b7280';
};
```
**Band-Aid/Issue**: Color map defined in two places within same file
**Root Cause**: Refactoring didn't consolidate color constants
**Simplified Solution**: Use `designTokens.ts` values:
```tsx
export const getCategoryColorHex = (category: string): string => {
  const hexMap = {
    SCHOOL: '#3b82f6', MUSIC: '#8b5cf6', FITNESS: '#10b981',
    // ... use these consistently
  };
  return hexMap[category] || '#6b7280';
};
```
**Impact**: Single source of truth for colors. Reduces maintenance burden.

---

### Finding #12: Missing Energy Match Badge Variant Mapping
**Category**: ♻️ Refactor
**Location**: frontend/src/pages/OrientWestPage.tsx:159-165

**Simplicity**: 9
**Benefit**: 5
**Score**: 45/100

**Current State**: Manual ternary for energy match:
```tsx
<Badge variant={
  plan.energyMatch === 'PERFECT' ? 'success' :
  plan.energyMatch === 'MOSTLY_ALIGNED' ? 'sky' :
  plan.energyMatch === 'SOME_MISMATCH' ? 'warn' : 'danger'
}>
  {plan.energyMatch}
</Badge>
```
**Band-Aid/Issue**: Similar to priority/energy but no utility function
**Root Cause**: designTokens.ts has color mapping but no BadgeVariant converter
**Simplified Solution**: Add to `lib/designTokens.ts`:
```tsx
export const getEnergyMatchBadgeVariant = (match: EnergyMatch): BadgeVariant => {
  const variants = {
    PERFECT: 'success',
    MOSTLY_ALIGNED: 'sky',
    SOME_MISMATCH: 'warn',
    POOR: 'danger',
  };
  return variants[match] || 'neutral';
};
```
**Impact**: Consistency with priority/energy mappings. Reduces ternary chains.

---

### Finding #13: Validation Schema Repetition (Backend)
**Category**: ♻️ Refactor
**Location**:
- backend/src/routes/tasks.ts:10-48
- backend/src/routes/orient.ts:8-37
- backend/src/routes/reviews.ts:8-16
- backend/src/routes/postdo.ts:8-13

**Simplicity**: 8
**Benefit**: 5
**Score**: 40/100

**Current State**: Enum values repeated in multiple schemas:
```tsx
// tasks.ts
priority: z.enum(['MUST', 'SHOULD', 'COULD', 'MAYBE']),
category: z.enum(['SCHOOL', 'MUSIC', 'FITNESS', 'GAMING', 'NUTRITION', 'HYGIENE', 'PET', 'SOCIAL', 'PERSONAL', 'ADMIN']),

// orient.ts
energyLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']),

// postdo.ts - same enums repeated
```
**Band-Aid/Issue**: Enum definitions scattered across route files
**Root Cause**: No shared validation constants/schemas module
**Simplified Solution**: Create `backend/src/validation/schemas.ts`:
```tsx
export const categoryEnum = z.enum([...CATEGORIES]);
export const priorityEnum = z.enum([...PRIORITIES]);
export const baseTaskSchema = z.object({
  name: z.string().min(1),
  priority: priorityEnum,
  category: categoryEnum,
  // ...
});
export const createTaskSchema = baseTaskSchema.extend({
  // task-specific additions
});
```
**Impact**: Single source of truth. Eliminates enum sync errors.

---

### Finding #14: Try-Catch Pattern Variation (Backend)
**Category**: ♻️ Refactor
**Location**: 26 instances across all backend routes

**Simplicity**: 7
**Benefit**: 5
**Score**: 35/100

**Current State**: Inconsistent error handling patterns:
```tsx
// Sometimes Zod error check first
if (error instanceof z.ZodError) {
  return res.status(400).json(...);
}
// Sometimes not checked
res.status(500).json({ error: error.message });
```
**Band-Aid/Issue**: Error handling approach varies between routes
**Root Cause**: No middleware/helper for consistent error responses
**Simplified Solution**: Create `backend/src/middleware/errorHandler.ts`:
```tsx
export const asyncHandler = (fn: Function) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const errorHandler = (err, req, res, next) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Validation error', details: err.issues });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Not found' });
  }
  console.error('Error:', err);
  return res.status(500).json({ error: err.message });
};
```
**Impact**: Ensures consistent error responses. Reduces boilerplate in routes.

---

### Finding #15: React Query Hook Pattern Incomplete
**Category**: 🌳 Root Cause
**Location**: 
- CalendarPage: fully migrated ✓
- All other pages: manual state management

**Simplicity**: 6
**Benefit**: 8
**Score**: 48/100

**Current State**: Mixed approach - CalendarPage uses React Query, others don't
```tsx
// CalendarPage (good):
const { data: tasks = [] } = useTasks({ status: 'NEXT' });

// TasksPage (manual):
const [tasks, setTasks] = useState<Task[]>([]);
useEffect(() => { fetchTasks(); }, []);
```
**Band-Aid/Issue**: Inconsistent data fetching patterns
**Root Cause**: Phased React Query migration incomplete
**Simplified Solution**: Migrate remaining pages to use hooks:
```tsx
// TodayPage should use:
const { data: plan } = useTodayPlan();
const { data: activeTasks } = useTasks({ status: 'ACTIVE' });
const { data: nextTasks } = useTasks({ status: 'NEXT' });
```
**Impact**: Eliminates manual caching logic. Reduces memory leaks. Improves performance.

---

### Finding #16: Missing Constants File
**Category**: 🩹 Band-Aid
**Location**: Project-wide

**Simplicity**: 10
**Benefit**: 6
**Score**: 60/100

**Current State**: Magic strings/numbers scattered:
```tsx
limit = activeTab === 'DAILY' ? 30 : 12;  // ReviewsPage:44
max-h-[600px]  // CalendarPage:349
const wakingMinutes = 960;  // reviews.ts:74
```
**Band-Aid/Issue**: No centralized constants
**Root Cause**: Early development skipped constants layer
**Simplified Solution**: Create `frontend/src/lib/constants.ts`:
```tsx
export const REVIEW_LIMITS = { DAILY: 30, WEEKLY: 12 };
export const DIMENSIONS = { CALENDAR_SIDEBAR_HEIGHT: 600, WAKING_MINUTES: 960 };
export const CACHE_DURATIONS = { TASKS: 60, PLANS: 600, REVIEWS: 300 };
```
**Impact**: Easier config changes. Improves code clarity.

---

### Finding #17: Inconsistent Error Message Capitalization
**Category**: 🩹 Band-Aid
**Location**: 16 instances across pages

**Simplicity**: 10
**Benefit**: 3
**Score**: 30/100

**Current State**: Varying error message formats:
```tsx
'Failed to load tasks. Please try again.'  // TasksPage:44
'Failed to load reviews. Please try again.'  // ReviewsPage:48
'Failed to schedule task. Please try again.'  // CalendarPage:155
'Failed to load data'  // TodayPage:73
```
**Band-Aid/Issue**: Inconsistent error message conventions
**Root Cause**: No error message style guide
**Simplified Solution**: Create `lib/errorMessages.ts`:
```tsx
export const ERROR_MESSAGES = {
  LOAD_TASKS: 'Failed to load tasks. Please try again.',
  LOAD_REVIEWS: 'Failed to load reviews. Please try again.',
  SCHEDULE_TASK: 'Failed to schedule task. Please try again.',
  GENERIC: 'An error occurred. Please try again.',
};
```
**Impact**: Consistency. Reduced localization effort later.

---

### Finding #18: Missing PropTypes/Interfaces Reuse
**Category**: ♻️ Refactor
**Location**: frontend/src/components/ (multiple files)

**Simplicity**: 8
**Benefit**: 4
**Score**: 32/100

**Current State**: Props defined inline in multiple components:
```tsx
interface BadgeProps { children: React.ReactNode; variant?: BadgeVariant; }
interface CardProps { children: React.ReactNode; className?: string; }
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { ... }
```
**Band-Aid/Issue**: Similar CommonProps-like structures in multiple components
**Root Cause**: No shared ComponentProps type
**Simplified Solution**: Create `types/components.ts`:
```tsx
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}
export interface StyledComponentProps extends BaseComponentProps {
  variant?: string;
  size?: 'small' | 'medium' | 'large';
}
```
**Impact**: Reduces duplication. Improves type consistency.

---

### Finding #19: Backend Route Error Response Inconsistency
**Category**: 🩹 Band-Aid
**Location**: backend/src/routes/

**Simplicity**: 8
**Benefit**: 5
**Score**: 40/100

**Current State**: Different error response formats:
```tsx
// tasks.ts
res.status(500).json({ error: error.message });

// todoist.ts
res.status(500).json({ error: error.message });

// reviews.ts - might have different structure
```
**Band-Aid/Issue**: Similar structure but no consistency guarantee
**Root Cause**: No shared error response type
**Simplified Solution**: Create `types/api.ts`:
```tsx
export interface ApiErrorResponse {
  error: string;
  details?: unknown;
  code?: string;
}
export interface ApiSuccessResponse<T> {
  data: T;
  status: 'ok';
}
```
**Impact**: Type-safe API responses. Easier frontend error handling.

---

### Finding #20: ReviewsPage Chart Data Preparation Duplication
**Category**: ♻️ Refactor
**Location**: frontend/src/pages/ReviewsPage.tsx:96-123

**Simplicity**: 7
**Benefit**: 4
**Score**: 28/100

**Current State**: Similar chart data mapping patterns:
```tsx
// Line 96-104
getExecutionRateChartData = () => {
  return reviews.slice(0, 7).reverse().map((review) => ({...}));
};

// Line 115-123
getDeepWorkTrendData = () => {
  return reviews.slice(0, 7).reverse().map((review) => ({...}));
};
```
**Band-Aid/Issue**: Same `.slice(0, 7).reverse()` pattern repeated
**Root Cause**: No shared chart utility
**Simplified Solution**: Extract pattern:
```tsx
const getChartData = (reviews: Review[], limit = 7) =>
  reviews.slice(0, limit).reverse();

const getExecutionRateChartData = () =>
  getChartData(reviews).map(r => ({ date: formatDate(r.periodEnd), rate: r.executionRate }));
```
**Impact**: DRY principle. Easier to adjust time windows.

---

### Finding #21: CSS Class Duplication in OrientWestPage
**Category**: ♻️ Refactor
**Location**: frontend/src/pages/OrientWestPage.tsx:200-275

**Simplicity**: 8
**Benefit**: 3
**Score**: 24/100

**Current State**: Uses hard-coded Tailwind classes instead of design system:
```tsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  // Should use Card component
<div className="bg-blue-50 border border-blue-200 rounded-md p-3">
  // Should use TimeBlockCard
```
**Band-Aid/Issue**: Page doesn't use consistent Card/Badge components
**Root Cause**: Incomplete design system migration for this page
**Simplified Solution**: Replace all custom div styling with components:
```tsx
<Card padding="large">
  <h2>Morning Plan Review</h2>
  {/* content */}
</Card>
```
**Impact**: Visual consistency. Easier design updates.

---

### Finding #22: Pagination/Limits Not Centralized
**Category**: ♻️ Refactor
**Location**:
- ReviewsPage:44: `limit = activeTab === 'DAILY' ? 30 : 12`
- backend reviews.ts: similar pagination logic

**Simplicity**: 9
**Benefit**: 3
**Score**: 27/100

**Current State**: Pagination limits hardcoded in component:
```tsx
const limit = activeTab === 'DAILY' ? 30 : 12;
```
**Band-Aid/Issue**: Magic numbers, not configurable
**Root Cause**: No API configuration constants
**Simplified Solution**: Add to constants:
```tsx
export const PAGINATION = {
  REVIEWS_DAILY: 30,
  REVIEWS_WEEKLY: 12,
  TASKS_PER_PAGE: 20,
};
```
**Impact**: Easier to adjust limits. Configuration as code.

---

### Finding #23: Inconsistent Component Naming Convention
**Category**: 🩹 Band-Aid
**Location**: frontend/src/components/

**Simplicity**: 10
**Benefit**: 2
**Score**: 20/100

**Current State**: Mix of naming styles (all actually fine, but slightly inconsistent):
```tsx
TaskActions.tsx, CompleteTaskModal.tsx, CalendarToolbar.tsx, LoadingSkeleton.tsx
// All follow Component.tsx pattern - this is actually good!
```
**Band-Aid/Issue**: Actually consistent, but worth noting for documentation
**Root Cause**: No explicit naming documentation
**Simplified Solution**: Document in `COMPONENT_CONVENTIONS.md`
**Impact**: Minimal - already well-named. Documentation benefit.

---

### Finding #24: Missing Test Setup Utilities
**Category**: 🌳 Root Cause
**Location**: frontend/src/setupTests.ts (minimal)

**Simplicity**: 5
**Benefit**: 4
**Score**: 20/100

**Current State**: Minimal test setup
**Band-Aid/Issue**: No shared test utilities for mocking API calls
**Root Cause**: Test infrastructure light, mostly E2E focus
**Simplified Solution**: Create `frontend/src/__tests__/mocks.ts`:
```tsx
export const mockTasks = [...];
export const mockReviews = [...];
export const createMockApiClient = () => ({ ... });
```
**Impact**: Faster test writing. Consistent mock data.

---

## SUMMARY TABLE

| Finding | Category | Issue Type | Simplicity | Benefit | Score |
|---------|----------|-----------|-----------|---------|-------|
| #1 Priority Badge Mapping | ♻️ Refactor | DRY Violation | 9 | 9 | **81** |
| #2 Energy Badge Mapping | ♻️ Refactor | DRY Violation | 9 | 8 | **72** |
| #3 Date Formatting | ♻️ Refactor | Boilerplate | 9 | 7 | **63** |
| #16 Missing Constants | 🩹 Band-Aid | Missing Layer | 10 | 6 | **60** |
| #4 Loading Spinner | 🩹 Band-Aid | Pattern Gap | 10 | 6 | **60** |
| #5 isMounted Cleanup | 🌳 Root Cause | Incomplete Migration | 8 | 7 | **56** |
| #6 Error Toast Pattern | ♻️ Refactor | Boilerplate | 8 | 6 | **48** |
| #8 Deep Work Block | ♻️ Refactor | DRY Violation | 8 | 6 | **48** |
| #15 React Query Incomplete | 🌳 Root Cause | Inconsistency | 6 | 8 | **48** |
| #7 Priority Order | ♻️ Refactor | Magic Number | 9 | 5 | **45** |
| #12 Energy Match Badge | ♻️ Refactor | Missing Function | 9 | 5 | **45** |
| #10 Form State | 🌳 Root Cause | Anti-pattern | 6 | 7 | **42** |
| #13 Validation Schema | ♻️ Refactor | DRY Violation | 8 | 5 | **40** |
| #14 Try-Catch Pattern | ♻️ Refactor | Inconsistency | 7 | 5 | **35** |
| #9 Modal Structure | ♻️ Refactor | Duplication | 7 | 5 | **35** |
| #11 Category Colors | ♻️ Refactor | Duplication | 9 | 7 | **63** |
| #17 Error Messages | 🩹 Band-Aid | Style Inconsistency | 10 | 3 | **30** |
| #18 Props Reuse | ♻️ Refactor | Type Duplication | 8 | 4 | **32** |
| #19 Error Response | 🩹 Band-Aid | Type Safety | 8 | 5 | **40** |
| #20 Chart Data | ♻️ Refactor | Pattern Duplication | 7 | 4 | **28** |
| #21 CSS Classes | ♻️ Refactor | Inconsistency | 8 | 3 | **24** |
| #22 Hardcoded Limits | ♻️ Refactor | Magic Numbers | 9 | 3 | **27** |
| #23 Component Naming | 🩹 Band-Aid | Documentation | 10 | 2 | **20** |
| #24 Test Utilities | 🌳 Root Cause | Missing Infrastructure | 5 | 4 | **20** |

---

## TOP 5 QUICK WINS

1. **Finding #1 (Score: 81)**: Create `getPriorityBadgeVariant()` utility - 15 min, 6 references fixed
2. **Finding #2 (Score: 72)**: Create `getEnergyBadgeVariant()` utility - 10 min, 3 references fixed
3. **Finding #3 (Score: 63)**: Create `formatTodayLong()` utility - 10 min, 4 references fixed
4. **Finding #11 (Score: 63)**: Consolidate category colors - 15 min, single source of truth
5. **Finding #4 (Score: 60)**: Add fullpage loading variant to LoadingSkeleton - 20 min, 7 spinners consolidated

---

## SCALABILITY RISKS

1. **Backend Error Handling**: 26+ try-catch blocks will become maintenance nightmare. Needs middleware.
2. **Form State Pattern**: If more complex forms added, manual useState approach won't scale. Need Formik/React Hook Form.
3. **React Query Incomplete**: Mixing patterns will cause cache inconsistencies at scale.
4. **Hardcoded Colors**: Adding new categories requires changes in multiple files.

---

## REFACTORING PRIORITY

**Phase 1 (Week 1 - High Impact, Low Effort)**:
- Create utility functions for badge variants (#1, #2, #12)
- Extract date formatting helpers (#3)
- Add LoadingSkeleton fullpage variant (#4)

**Phase 2 (Week 2 - High Impact, Medium Effort)**:
- Complete React Query migration (#15)
- Extract error handling middleware (Backend #14)
- Create constants file (#16)

**Phase 3 (Week 3 - Medium Impact, Medium Effort)**:
- Extract TimeBlockCard component (#8)
- Extract Modal component (#9)
- Create validation schemas module (Backend #13)

