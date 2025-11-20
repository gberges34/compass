import express, { Request, Response } from 'express';
import { loadConfig } from './config.js';
import { authenticate } from './auth.js';
import { McpRequest } from './types/mcp.js';
import { handleListFiles } from './methods/list-files.js';
import { handleGetFile } from './methods/get-file.js';
import { handleCreatePr } from './methods/create-pr.js';
import { logger } from './logger.js';

try {
  const config = loadConfig();
  logger.info({ repoCount: config.repos.length }, 'loaded config');
} catch (error) {
  logger.error({ error }, 'failed to load config');
  process.exit(1);
}

const methods: Record<string, (params: unknown) => Promise<unknown>> = {
  'repo.listFiles': handleListFiles,
  'repo.getFile': handleGetFile,
  'repo.createPullRequest': handleCreatePr
};

async function handleMcp(req: Request, res: Response) {
  const body = req.body as McpRequest;
  logger.info({ 
    method: body.method, 
    repo: body.params?.repo, 
    role: res.locals.role 
  }, 'mcp call');
  
  const handler = methods[body.method];
  if (!handler) {
    logger.warn({ method: body.method }, 'unknown method');
    return res.status(400).json({ id: body.id, error: { code: 400, message: 'unknown method' } });
  }
  try {
    const result = await handler({ ...body.params, role: res.locals.role });
    logger.info({ method: body.method, repo: body.params?.repo }, 'mcp call succeeded');
    res.json({ id: body.id, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ method: body.method, repo: body.params?.repo, error: message }, 'mcp call failed');
    res.status(400).json({ id: body.id, error: { code: 400, message } });
  }
}

const app = express();
app.use(express.json());

app.post('/mcp', authenticate, handleMcp);

const port = Number(process.env.PORT ?? 4040);
app.listen(port, () => logger.info({ port }, 'listening'));

