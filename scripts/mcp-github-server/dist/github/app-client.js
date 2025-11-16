import { App } from '@octokit/app';
const app = new App({
    appId: Number(process.env.GITHUB_APP_ID),
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
    oauth: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET
    }
});
export async function getInstallationOctokit(installationId) {
    const octokit = await app.getInstallationOctokit(installationId);
    return octokit;
}
export async function readFile(octokit, repo, path, ref) {
    const [owner, name] = repo.split('/');
    const res = await octokit.repos.getContent({ owner, repo: name, path, ref });
    if (!('content' in res.data)) {
        throw new Error('not a file');
    }
    return Buffer.from(res.data.content, res.data.encoding).toString('utf8');
}
