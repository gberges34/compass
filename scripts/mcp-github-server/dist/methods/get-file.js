import { z } from 'zod';
import { getInstallationOctokit, readFile } from '../github/app-client.js';
import { findRepo, loadConfig } from '../config.js';
import { assertPermission } from '../auth.js';
const schema = z.object({
    repo: z.string(),
    path: z.string(),
    ref: z.string().default('main'),
    role: z.enum(['codex', 'cursor', 'gemini'])
});
export async function handleGetFile(params) {
    const parsed = schema.parse(params);
    const config = loadConfig();
    const repoConfig = findRepo(config, parsed.repo);
    assertPermission(parsed.role, repoConfig, 'read');
    const octokit = await getInstallationOctokit(repoConfig.installationId);
    const content = await readFile(octokit, parsed.repo, parsed.path, parsed.ref);
    return { content, path: parsed.path, ref: parsed.ref };
}
