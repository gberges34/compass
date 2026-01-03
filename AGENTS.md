# Repository Guidelines

## Project Structure & Module Organization
- `backend/` runs the Express + Prisma API; see `src/routes` for endpoints and `prisma/schema.prisma` for the data model.
- `frontend/` is the React 19 client (`src/components`, `pages`, `hooks`, `contexts`) styled with Tailwind tokens in `src/index.css`.
- `shared/` holds runtime-agnostic TypeScript helpers consumed by both layers.
- `scripts/` centralizes automation (`dev.sh`, `setup.sh`, verification scripts); extend these instead of adding ad-hoc shell files elsewhere.
- `shortcuts/` and `ios-shortcuts/` store automation blueprints; mirror changes in `docs/` so payloads stay discoverable.

## Build, Test, and Development Commands
- `npm run setup` bootstraps dependencies, runs `prisma generate`, and seeds starter data.
- `npm run dev` launches both servers via `scripts/dev.sh` with health probes; use `npm run start:backend` or `npm run start:frontend` for isolated work.
- Database tasks live behind workspace scripts: `npm run db:migrate`, `db:generate`, `db:reset`, `db:studio`.
- Testing entry points: `cd frontend && npm test -- --watch=false` for React suites, and `npm run health` (plus `scripts/health-check.sh`) to exercise backend endpoints.

## Coding Style & Naming Conventions
- TypeScript everywhere with 2-space indentation, single quotes, and descriptive camelCase identifiers.
- React files stay functional with hooks; co-locate tiny utilities beside each page or component.
- Backend files mirror routes (`src/routes/tasks.ts` → `src/services/tasks.ts`) and pair handlers with Zod validation.
- Run Prettier before committing: `npx prettier --write frontend/src/**/*.tsx backend/src/**/*.ts`.

## Testing Guidelines
- Frontend specs live beside components or under `frontend/src/__tests__` using Testing Library (`*.test.tsx`).
- Backend coverage favors integration—expand `backend/test-api.js` or create new suites that hit the Express server.
- Prioritize flows that span layers (task lifecycle, Orient planning, Todoist import) and record tricky edge cases in `ANALYSIS_SUMMARY.md`.
- Always run `npm run verify` prior to a PR; it confirms env vars, ports, and Prisma connectivity.

## Commit & Pull Request Guidelines
- Commit subjects follow the existing conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`) with optional scopes (`feat(frontend): ...`).
- Reference issues or task IDs in commits/PRs and attach UI screenshots or sample API payloads for behavioral changes.
- PR descriptions should state motivation, summarize key changes, and list test evidence (`npm test`, `npm run health`, manual QA if relevant).
- Keep diffs atomic; if both layers change, describe the shared DTO/Zod/Prisma contracts so reviewers can trace the impact.

## Rules
- Always use Context7 MCP (use library: gberges34/compass) when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask. 
