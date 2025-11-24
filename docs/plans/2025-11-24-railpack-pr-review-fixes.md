# Railpack PR Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address PR review feedback by making the DTO sync script recursive, fixing TypeScript path resolution to prefer vendored DTOs with monorepo fallback, and aligning the plan documentation with the implemented scripts.

**Architecture:** Keep vendoring as a build-time copy of shared DTOs into `backend/shared/dto`, ensure `tsconfig` paths point to the vendored copy (then monorepo) relative to `baseUrl: ./src`, and update docs to reflect CommonJS usage and the `prisma generate` step in `build:backend`.

**Tech Stack:** Node 22, npm, TypeScript 5, CommonJS backend scripts, Railpack/Nixpacks.

---

### Task 1: Make DTO sync recursive

**Files:**
- Modify: `backend/scripts/sync-shared-dto.js`

**Step 1: Update the copy logic to fs.cpSync**

Replace manual readdir/copy with recursive `fs.cpSync`:

```js
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', '..', 'shared', 'dto');
const dest = path.resolve(__dirname, '..', 'shared', 'dto');

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

console.log(`Copied shared DTOs from ${src} -> ${dest}`);
```

**Step 2: Smoke-check the copy**

```bash
node backend/scripts/sync-shared-dto.js
ls backend/shared/dto
```

Expected: DTO files present; command logs copy message.

---

### Task 2: Fix TypeScript path resolution for vendored DTOs

**Files:**
- Modify: `backend/tsconfig.json`

**Step 1: Correct paths to prefer vendored copy, then monorepo fallback**

Set paths (remember `baseUrl` is `./src`, so vendored path is `../shared/...`):

```json
"paths": {
  "@compass/dto/*": ["../shared/dto/*", "../../shared/dto/*"],
  "@compass/dto": ["../shared/dto/index.d.ts", "../../shared/dto/index.d.ts"]
}
```

**Step 2: Keep includes covering vendored declarations**

Ensure include has `./shared/**/*.d.ts` and `../shared/**/*.d.ts`.

**Step 3: Verify TypeScript**

```bash
cd backend
npx tsc --noEmit
```

Expected: exits 0; no `@compass/dto/pagination` resolution errors.

---

### Task 3: Align plan documentation with implementation

**Files:**
- Modify: `docs/plans/2025-11-24-railpack-backend-vendored-dto.md`

**Step 1: Update sync script snippet to CommonJS**

Change the snippet to use `require` (matching the script).

**Step 2: Update build:backend snippet to include prisma generate**

Document the actual script: `"build:backend": "cd backend && npm ci && npx prisma generate && npm run build"`.

**Step 3: Proofread for consistency**

Ensure the doc states vendored path (`../shared/dto`) and the recursive copy behavior.

---

### Task 4: Commit and push

**Files:**
- Stage: `backend/scripts/sync-shared-dto.js`, `backend/tsconfig.json`, `docs/plans/2025-11-24-railpack-backend-vendored-dto.md`

**Step 1: Commit**

```bash
git add backend/scripts/sync-shared-dto.js backend/tsconfig.json docs/plans/2025-11-24-railpack-backend-vendored-dto.md
git commit -m "fix(railpack): recursive dto sync and tsconfig paths"
```

**Step 2: Push**

```bash
git push
```

---

Plan complete and saved to `docs/plans/2025-11-24-railpack-pr-review-fixes.md`. Two execution options:

1. **Subagent-Driven (this session)** – dispatch fresh subagent per task with reviews in between.
2. **Parallel Session (separate)** – open a new session using superpowers:executing-plans to run the plan in batches with checkpoints.

Which approach should we take?
