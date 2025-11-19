# Shared Pagination DTO Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the shared pagination DTO resolvable by TypeScript so both backend and frontend builds (`npx tsc --noEmit`) succeed.

**Architecture:** Treat `shared/dto` as a type package root that exposes an `index.d.ts` module for `@compass/dto/pagination`, and ensure both TS projects include those declarations via `typeRoots`/`include`. No runtime bundling changes are needed because this is compile-time only.

**Tech Stack:** TypeScript 5.x, Node 20+, Yarn/NPM scripts, Express backend, React frontend.

---

### Task 1: Restructure shared DTO types into a proper package

**Files:**
- Delete: `shared/dto/pagination.d.ts`
- Create: `shared/dto/index.d.ts`

**Step 1: Remove the orphaned declaration file**

```bash
rm shared/dto/pagination.d.ts
```

Expected: file deleted; `git status` shows removal staged later.

**Step 2: Author the package-style declaration entry point**

Create `shared/dto/index.d.ts` with the module declarations that TypeScript expects when scanning `typeRoots`:

```ts
// shared/dto/index.d.ts
declare module '@compass/dto/pagination' {
  export interface PaginationResponse<TItem> {
    items: TItem[];
    nextCursor: string | null;
  }
}

declare module '@compass/dto' {
  export * from '@compass/dto/pagination';
}
```

This gives both `@compass/dto/pagination` (current imports) and a future-friendly root namespace.

**Step 3: Stage the new file**

```bash
git add shared/dto/index.d.ts
```

---

### Task 2: Ensure both TypeScript projects load the shared declarations

**Files:**
- Modify: `backend/tsconfig.json`
- Modify: `frontend/tsconfig.json`

**Step 1: Extend backend include paths**

Add `../shared/**/*.d.ts` to the `"include"` array so `tsc` watches the shared declarations in addition to `src`:

```json
{
  "include": ["src/**/*", "../shared/**/*.d.ts"]
}
```

Keep `"typeRoots": ["./node_modules/@types", "../shared"]` as-is so the new package folder is discoverable.

**Step 2: Extend frontend include paths**

Likewise, adjust the frontend config:

```json
{
  "include": [
    "src",
    "../shared/**/*.d.ts"
  ]
}
```

No other compiler options need to change; the existing `typeRoots` entry will now find `dto/index.d.ts`.

**Step 3: Stage the config changes**

```bash
git add backend/tsconfig.json frontend/tsconfig.json
```

---

### Task 3: Verify TypeScript builds and document fix

**Files:**
- (Optional doc note) `docs/plans/2025-11-12-shared-pagination-dto-fix.md`

**Step 1: Reinstall/elide?** *(Skip unless dependencies missing; no code change required.)*

**Step 2: Run backend TypeScript check**

```bash
cd backend
npx tsc --noEmit
```

Expected: command exits 0 with no “Cannot find module '@compass/dto/pagination'” errors.

**Step 3: Run frontend TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: exits 0; the earlier “Cannot find type definition file for 'dto'” message should disappear.

**Step 4: Capture plan execution evidence (optional note)**

Record in `ANALYSIS_SUMMARY.md` if desired:

```md
- 2025-11-12: Shared pagination DTO packaged under shared/dto/index.d.ts so both TypeScript projects compile.
```

**Step 5: Commit**

```bash
git commit -m "fix(shared): expose pagination dto types via shared package"
```

---

Plan complete and saved to `docs/plans/2025-11-12-shared-pagination-dto-fix.md`. Two execution options:

1. **Subagent-Driven (this session)** – I dispatch fresh subagents per task with reviews in between for tight feedback.
2. **Parallel Session (separate)** – You open a new session dedicated to execution using superpowers:executing-plans with checkpointed batches.

Which approach should we take?
