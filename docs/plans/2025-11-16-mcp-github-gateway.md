# MCP GitHub Gateway Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP-compatible service that fronts a shared GitHub App so Codex, Cursor, and Gemini access repos through consistent, policy-controlled methods.

**Architecture:** TypeScript service exposing MCP JSON-RPC endpoints. Requests pass through agent auth/policy middleware, then use GitHub App installation tokens to call GitHub REST/GraphQL APIs. Structured logging and config files capture repo mappings and audit data.

**Tech Stack:** Node 20+, TypeScript, Express (HTTP transport), MCP protocol helpers, @octokit/app + @octokit/rest, Zod for schemas, Jest for tests.

### Task 1: Bootstrap the MCP server workspace

**Files:**
- Create: `scripts/mcp-github-server/package.json`
- Create: `scripts/mcp-github-server/tsconfig.json`
- Create: `scripts/mcp-github-server/src/index.ts`
- Create: `scripts/mcp-github-server/src/types/mcp.ts`
- Test: `scripts/mcp-github-server/src/index.test.ts`

**Step 1: Initialize package**

`scripts/mcp-github-server/package.json`
```json
{
  "name": "@compass/mcp-github-server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.19.0",
    "@octokit/app": "^13.0.0",
    "@octokit/rest": "^20.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "tsx": "^4.7.0",
    "jest": "^29.7.0",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12"
  }
}
```

**Step 2: Write `tsconfig`**

`tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true
  },
  "include": ["src"]
}
```

**Step 3: Scaffold entry point**

`src/index.ts`
```ts
import express from 'express';

const app = express();
app.use(express.json());

app.post('/mcp', (_req, res) => {
  res.status(501).json({ error: 'MCP not implemented yet' });
});

const port = Number(process.env.PORT ?? 4040);
app.listen(port, () => console.log(`[mcp-github] listening on ${port}`));
```

**Step 4: Add placeholder MCP types**

`src/types/mcp.ts`
```ts
export interface McpRequest {
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpResponse {
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}
```

**Step 5: Write smoke test**

`src/index.test.ts`
```ts
import request from 'supertest';
import { createServer } from './test-utils';

test('POST /mcp returns 501 placeholder', async () => {
  const server = await createServer();
  const res = await request(server).post('/mcp').send({ id: 1, method: 'ping' });
  expect(res.status).toBe(501);
});
```

**Step 6: Run tests**

```bash
cd scripts/mcp-github-server && npm install && npm test
```
Expect failing due to missing helper, then add `src/test-utils.ts` returning Express app; rerun to ensure green. Commit with `feat(mcp): bootstrap github server workspace`.

### Task 2: Implement configuration & environment loading

**Files:**
- Modify: `scripts/mcp-github-server/src/index.ts`
- Create: `scripts/mcp-github-server/src/config.ts`
- Create: `scripts/mcp-github-server/config/github.yaml`
- Test: `scripts/mcp-github-server/src/config.test.ts`

**Step 1: Define config schema**

`src/config.ts`
```ts
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { z } from 'zod';

const repoSchema = z.object({
  repo: z.string(),
  installationId: z.number(),
  permissions: z.record(z.enum(['codex', 'cursor', 'gemini']), z.enum(['read', 'write']))
});

const configSchema = z.object({
  repos: z.array(repoSchema)
});

export type GatewayConfig = z.infer<typeof configSchema>;

export function loadConfig(filePath = path.join(process.cwd(), 'config/github.yaml')): GatewayConfig {
  const raw = fs.readFileSync(filePath, 'utf8');
  return configSchema.parse(yaml.parse(raw));
}
```

**Step 2: Update index to load env + config**

Add:
```ts
import { loadConfig } from './config.js';

const config = loadConfig();
```
Ensure app fails fast if config missing.

**Step 3: Provide sample YAML**

`config/github.yaml`
```yaml
repos:
  - repo: compass/compass
    installationId: 123456
    permissions:
      codex: write
      cursor: write
      gemini: read
```

**Step 4: Add tests validating schema**

`src/config.test.ts`
```ts
import { loadConfig } from './config';
import fs from 'node:fs';

test('loadConfig parses valid file', () => {
  const temp = 'config.temp.yaml';
  fs.writeFileSync(temp, 'repos: []');
  expect(loadConfig(temp).repos).toHaveLength(0);
  fs.unlinkSync(temp);
});
```

**Step 5: Run Jest**

`npm test`
Ensure config parser tested. Commit `feat(mcp): add config loader`.

### Task 3: Add agent authentication and policy enforcement

**Files:**
- Create: `scripts/mcp-github-server/src/auth.ts`
- Modify: `scripts/mcp-github-server/src/index.ts`
- Test: `scripts/mcp-github-server/src/auth.test.ts`

**Step 1: Implement token validation**

`src/auth.ts`
```ts
import { Request, Response, NextFunction } from 'express';

const roles = new Map([
  [process.env.CODEX_TOKEN, 'codex'],
  [process.env.CURSOR_TOKEN, 'cursor'],
  [process.env.GEMINI_TOKEN, 'gemini']
]);

export type AgentRole = 'codex' | 'cursor' | 'gemini';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization?.replace('Bearer ', '');
  const role = roles.get(auth ?? '');
  if (!role) return res.status(401).json({ error: 'unauthorized' });
  res.locals.role = role;
  next();
}
```

**Step 2: Add policy helper**

```ts
export function assertPermission(role: AgentRole, repoConfig, action: 'read'|'write') {
  const perm = repoConfig.permissions[role];
  if (action === 'write' && perm !== 'write') {
    throw new Error('forbidden');
  }
}
```

**Step 3: Wire middleware**

`src/index.ts`:
```ts
app.post('/mcp', authenticate, handleMcp);
```
Inside handler, call `assertPermission` based on requested method.

**Step 4: Add tests**

`src/auth.test.ts`
```ts
import request from 'supertest';
import { createServer } from './test-utils';

test('rejects missing auth', async () => {
  const server = await createServer();
  const res = await request(server).post('/mcp').send({});
  expect(res.status).toBe(401);
});
```

**Step 5: Document required env vars**

Add `.env.example` listing `CODEX_TOKEN`, etc.

Run `npm test` and commit `feat(mcp): add agent auth`.

### Task 4: Build GitHub App connector

**Files:**
- Create: `scripts/mcp-github-server/src/github/app-client.ts`
- Modify: `scripts/mcp-github-server/src/index.ts`
- Test: `scripts/mcp-github-server/src/github/app-client.test.ts`

**Step 1: Implement Octokit client**

`src/github/app-client.ts`
```ts
import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';

const app = new App({
  appId: Number(process.env.GITHUB_APP_ID),
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
  oauth: { clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! }
});

export async function getInstallationOctokit(installationId: number) {
  const { token } = await app.getInstallationAccessToken({ installationId });
  return new Octokit({ auth: token });
}
```

**Step 2: Add helper for file fetch**

```ts
export async function readFile(octokit, repo: string, path: string, ref: string) {
  const [owner, name] = repo.split('/');
  const res = await octokit.repos.getContent({ owner, repo: name, path, ref });
  if (!('content' in res.data)) throw new Error('not a file');
  return Buffer.from(res.data.content, res.data.encoding as BufferEncoding).toString('utf8');
}
```

**Step 3: Unit tests (mock octokit)**

Use `jest.mock('@octokit/app')` and ensure tokens requested per repo.

**Step 4: Update handler to request octokit per repo**

`handleMcp` loads repo config, calls `getInstallationOctokit`.

Run tests, commit `feat(mcp): add GitHub connector`.

### Task 5: Implement MCP methods for repo operations

**Files:**
- Modify: `scripts/mcp-github-server/src/index.ts`
- Create: `scripts/mcp-github-server/src/methods/list-files.ts`
- Create: `scripts/mcp-github-server/src/methods/get-file.ts`
- Create: `scripts/mcp-github-server/src/methods/create-pr.ts`
- Test: `scripts/mcp-github-server/src/methods/*.test.ts`

**Step 1: Define dispatcher**

`src/index.ts`
```ts
import { handleListFiles } from './methods/list-files.js';
import { handleGetFile } from './methods/get-file.js';
import { handleCreatePr } from './methods/create-pr.js';

const methods = {
  'repo.listFiles': handleListFiles,
  'repo.getFile': handleGetFile,
  'repo.createPullRequest': handleCreatePr
};

async function handleMcp(req, res) {
  const body = req.body as McpRequest;
  const handler = methods[body.method];
  if (!handler) return res.status(400).json({ error: 'unknown method' });
  try {
    const result = await handler({ ...body.params, role: res.locals.role });
    res.json({ id: body.id, result });
  } catch (error) {
    res.status(400).json({ id: body.id, error: { code: 400, message: String(error.message) } });
  }
}
```

**Step 2: Implement list files**

`list-files.ts`
```ts
import { z } from 'zod';
import { getInstallationOctokit } from '../github/app-client.js';

const schema = z.object({
  repo: z.string(),
  path: z.string().default(''),
  ref: z.string().default('main'),
  role: z.enum(['codex', 'cursor', 'gemini'])
});

export async function handleListFiles(params) {
  const parsed = schema.parse(params);
  const octokit = await getInstallationOctokit(findRepo(parsed.repo));
  const [owner, name] = parsed.repo.split('/');
  const { data } = await octokit.repos.getContent({ owner, repo: name, path: parsed.path, ref: parsed.ref });
  return Array.isArray(data) ? data.map(item => ({ path: item.path, type: item.type })) : [{ path: data.path, type: data.type }];
}
```

**Step 3: Implement get file + create PR with Zod validation and call `assertPermission` when `write`**

**Step 4: Add Jest tests mocking Octokit, verifying permission enforcement, error mapping**

**Step 5: Document MCP method schema in `README.md`**

Run `npm test`, commit `feat(mcp): expose repo MCP methods`.

### Task 6: Add structured logging and audit trail

**Files:**
- Modify: `scripts/mcp-github-server/src/index.ts`
- Create: `scripts/mcp-github-server/src/logger.ts`
- Configure: `scripts/mcp-github-server/logs/.gitkeep`

**Step 1: Implement logger**

`src/logger.ts`
```ts
import pino from 'pino';
export const logger = pino({ name: 'mcp-github', level: process.env.LOG_LEVEL ?? 'info' });
```

**Step 2: Log each request**

Inside `handleMcp`, before executing:
```ts
logger.info({ method: body.method, repo: body.params?.repo, role: res.locals.role }, 'mcp call');
```
On error, log with `logger.error`.

**Step 3: Add audit file output**

Configure Pino transport writing to `logs/audit.log`. Update README describing location.

**Step 4: Test logger invocation (use jest spies).**

Run tests, commit `feat(mcp): add audit logging`.

### Task 7: Verification scripts and docs

**Files:**
- Create: `scripts/mcp-github-server/README.md`
- Modify: `scripts/mcp-github-server/package.json` (add `verify` script)
- Add: `docs/mcp/github-gateway.md`

**Step 1: Document setup**

`README.md` explains env vars (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `CODEX_TOKEN`, etc.), and usage instructions (`npm run dev`).

**Step 2: Add `npm run verify`**

Script runs `npm run lint && npm test && npm run build`.

**Step 3: Global docs**

`docs/mcp/github-gateway.md`:
```
# MCP GitHub Gateway
- Purpose, endpoints, security model
- Instructions for installing GitHub App (screenshots/links)
- Agent integration steps for Codex/Cursor/Gemini
```

**Step 4: Manual validation checklist**

Add section describing how to use `curl` to hit `/mcp` with sample payloads. Record results in `ANALYSIS_SUMMARY.md` once verified.

Commit `docs: add MCP GitHub gateway docs`.

---

Plan complete and ready for execution. Two options to continue:
**1. Subagent-Driven (this session):** dispatch subagent per task with code reviews.
**2. Parallel Session:** have Cursor open a new session, load this plan, and run superpowers:executing-plans step-by-step.

Let me know which execution path you prefer.***
