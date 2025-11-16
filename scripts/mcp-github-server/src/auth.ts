import { Request, Response, NextFunction } from 'express';

export type AgentRole = 'codex' | 'cursor' | 'gemini';

function getRolesMap(): Map<string, AgentRole> {
  const roleEntries: Array<[string, AgentRole]> = [
    [process.env.CODEX_TOKEN ?? '', 'codex'],
    [process.env.CURSOR_TOKEN ?? '', 'cursor'],
    [process.env.GEMINI_TOKEN ?? '', 'gemini']
  ].filter(([token]) => token !== '') as Array<[string, AgentRole]>;
  return new Map<string, AgentRole>(roleEntries);
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const roles = getRolesMap();
  const auth = req.headers.authorization?.replace('Bearer ', '');
  const role = roles.get(auth ?? '');
  if (!role) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  res.locals.role = role;
  next();
}

export function assertPermission(
  role: AgentRole,
  repoConfig: { permissions: Partial<Record<AgentRole, 'read' | 'write'>> },
  action: 'read' | 'write'
) {
  const perm = repoConfig.permissions[role];
  if (!perm) {
    throw new Error('forbidden: no permission for this agent');
  }
  if (action === 'write' && perm !== 'write') {
    throw new Error('forbidden: write permission required');
  }
}

