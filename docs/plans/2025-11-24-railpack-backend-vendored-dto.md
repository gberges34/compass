# Railpack Backend Vendored DTO Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the backend deployable with Railpack when running from the backend directory by vendoring the shared `@compass/dto/pagination` types and ensuring Railpack recognizes a start command.

**Architecture:** Copy `shared/dto` into `backend/shared/dto` during build, point TypeScript to the vendored copy first (with the monorepo copy as a fallback), and hook the copy step into the backend build script. Expose root-level build/start scripts that delegate into `backend/` so Railpack can detect the start command even if it evaluates the repo root.

**Tech Stack:** Node 22, npm, TypeScript 5, Express, Prisma, Railpack/Nixpacks.

---

### Task 1: Vendor the shared pagination DTO into the backend build context

**Files:**
- Create: `backend/scripts/sync-shared-dto.js`
- Generate (untracked): `backend/shared/dto/index.d.ts`
- Modify: `.gitignore`

**Step 1: Author the copy script**

Add a small Node script that mirrors `../shared/dto` into `backend/shared/dto` (creating folders as needed) and overwrites on each run:

```js
// backend/scripts/sync-shared-dto.js
import fs from 'fs';
import path from 'path';

const src = path.resolve(__dirname, '..', '..', 'shared', 'dto');
const dest = path.resolve(__dirname, '..', 'shared', 'dto');

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}
console.log(`Copied shared DTOs from ${src} -> ${dest}`);
```

**Step 2: Run the script once to materialize the vendored copy**

```bash
node backend/scripts/sync-shared-dto.js
```

Expected: `backend/shared/dto/index.d.ts` exists and the console logs the copy path.

**Step 3: Ignore the generated folder**

Add `backend/shared/` to `.gitignore` so the vendored copy remains build-artifact only.

---

### Task 2: Point backend TypeScript at the vendored copy (with monorepo fallback)

**Files:**
- Modify: `backend/tsconfig.json`

**Step 1: Update path aliases to prefer the vendored DTO**

Set `paths` so `@compass/dto/*` resolves to the vendored folder first, then the monorepo folder as a fallback:

```json
"paths": {
  "@compass/dto/*": ["./shared/dto/*", "../shared/dto/*"],
  "@compass/dto": ["./shared/dto/index.d.ts", "../shared/dto/index.d.ts"]
}
```

**Step 2: Expand includes to watch vendored declarations**

Adjust `include` to cover the vendored copy:

```json
"include": ["src/**/*", "./shared/**/*.d.ts", "../shared/**/*.d.ts"]
```

**Step 3: Verify TypeScript resolution**

```bash
cd backend
npx tsc --noEmit
```

Expected: exits 0 with no `Cannot find module '@compass/dto/pagination'` errors.

---

### Task 3: Hook the copy step into the backend build

**Files:**
- Modify: `backend/package.json`

**Step 1: Add a DTO preparation script and wire it into build**

Add scripts:

```json
"scripts": {
  "prepare:dto": "node scripts/sync-shared-dto.js",
  "build": "npm run prepare:dto && tsc",
  "...existing scripts..."
}
```

**Step 2: Verify build with vendored types**

```bash
cd backend
npm run build
```

Expected: succeeds and generates `backend/shared/dto` before `tsc` runs; no TS2307 errors even if `../shared` were absent.

---

### Task 4: Make Railpack detect the backend start/build commands from the repo root

**Files:**
- Modify: `package.json` (repo root)
- (Deployment settings) Set Railpack env/variables

**Step 1: Add root scripts that delegate to backend**

```json
"scripts": {
  "build:backend": "cd backend && npm ci && npm run build",
  "start": "cd backend && npm run start"
}
```

These give Railpack a `start` script to discover even if it evaluates the repo root.

**Step 2: Point Railpack at the backend build/start**

In Railway variables or service settings, set:
- `RAILPACK_BUILD_CMD` = `npm run build:backend`
- `RAILPACK_START_CMD` = `npm run start`

This ensures backend dependencies are installed and the backend start script is used.

**Step 3: Local sanity check**

```bash
npm run build:backend
npm run start
```

Expected: backend builds successfully and starts on the configured port without missing module errors.

---

Plan complete and saved to `docs/plans/2025-11-24-railpack-backend-vendored-dto.md`. Two execution options:

1. **Subagent-Driven (this session)** – dispatch fresh subagent per task with reviews in between.
2. **Parallel Session (separate)** – open a new session using superpowers:executing-plans to run the plan in batches with checkpoints.

Which approach should we take?
