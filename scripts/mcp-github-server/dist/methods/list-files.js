import { z } from 'zod';
import { getInstallationOctokit } from '../github/app-client.js';
import { findRepo, loadConfig } from '../config.js';
import { assertPermission } from '../auth.js';
const schema = z.object({
    repo: z.string(),
    path: z.string().default(''),
    ref: z.string().default('main'),
    role: z.enum(['codex', 'cursor', 'gemini'])
});
export async function handleListFiles(params) {
    const parsed = schema.parse(params);
    const config = loadConfig();
    const repoConfig = findRepo(config, parsed.repo);
    assertPermission(parsed.role, repoConfig, 'read');
    const octokit = await getInstallationOctokit(repoConfig.installationId);
    const [owner, name] = parsed.repo.split('/');
    const { data } = await octokit.repos.getContent({
        owner,
        repo: name,
        path: parsed.path,
        ref: parsed.ref
    });
    if (Array.isArray(data)) {
        return data.map(item => ({ path: item.path, type: item.type }));
    }
    return [{ path: data.path, type: data.type }];
}
