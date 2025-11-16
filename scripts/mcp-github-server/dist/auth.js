function getRolesMap() {
    const roleEntries = [
        [process.env.CODEX_TOKEN ?? '', 'codex'],
        [process.env.CURSOR_TOKEN ?? '', 'cursor'],
        [process.env.GEMINI_TOKEN ?? '', 'gemini']
    ].filter(([token]) => token !== '');
    return new Map(roleEntries);
}
export function authenticate(req, res, next) {
    const roles = getRolesMap();
    const auth = req.headers.authorization?.replace('Bearer ', '');
    const role = roles.get(auth ?? '');
    if (!role) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    res.locals.role = role;
    next();
}
export function assertPermission(role, repoConfig, action) {
    const perm = repoConfig.permissions[role];
    if (!perm) {
        throw new Error('forbidden: no permission for this agent');
    }
    if (action === 'write' && perm !== 'write') {
        throw new Error('forbidden: write permission required');
    }
}
