import { z } from 'zod';
import { getInstallationOctokit } from '../github/app-client.js';
import { findRepo, loadConfig } from '../config.js';
import { assertPermission } from '../auth.js';
const schema = z.object({
    repo: z.string(),
    title: z.string(),
    body: z.string().optional(),
    head: z.string(),
    base: z.string().default('main'),
    role: z.enum(['codex', 'cursor', 'gemini'])
});
export async function handleCreatePr(params) {
    const parsed = schema.parse(params);
    const config = loadConfig();
    const repoConfig = findRepo(config, parsed.repo);
    assertPermission(parsed.role, repoConfig, 'write');
    const octokit = await getInstallationOctokit(repoConfig.installationId);
    const [owner, name] = parsed.repo.split('/');
    const { data } = await octokit.pulls.create({
        owner,
        repo: name,
        title: parsed.title,
        body: parsed.body ?? '',
        head: parsed.head,
        base: parsed.base
    });
    return {
        number: data.number,
        url: data.html_url,
        title: data.title,
        state: data.state
    };
}
