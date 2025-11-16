import { handleCreatePr } from './create-pr.js';
import { getInstallationOctokit } from '../github/app-client.js';
import { loadConfig, findRepo } from '../config.js';
jest.mock('../github/app-client.js');
jest.mock('../config.js');
jest.mock('../github/app-client.ts', () => ({
    getInstallationOctokit: jest.fn()
}));
describe('handleCreatePr', () => {
    const mockOctokit = {
        pulls: {
            create: jest.fn()
        }
    };
    beforeEach(() => {
        jest.clearAllMocks();
        getInstallationOctokit.mockResolvedValue(mockOctokit);
        loadConfig.mockReturnValue({
            repos: [{ repo: 'test/repo', installationId: 123, permissions: { codex: 'write' } }]
        });
        findRepo.mockReturnValue({
            repo: 'test/repo',
            installationId: 123,
            permissions: { codex: 'write' }
        });
    });
    test('creates pull request', async () => {
        mockOctokit.pulls.create.mockResolvedValue({
            data: {
                number: 42,
                html_url: 'https://github.com/test/repo/pull/42',
                title: 'Test PR',
                state: 'open'
            }
        });
        const result = await handleCreatePr({
            repo: 'test/repo',
            title: 'Test PR',
            head: 'feature-branch',
            base: 'main',
            role: 'codex'
        });
        expect(result).toEqual({
            number: 42,
            url: 'https://github.com/test/repo/pull/42',
            title: 'Test PR',
            state: 'open'
        });
    });
    test('throws on read-only permission', async () => {
        findRepo.mockReturnValue({
            repo: 'test/repo',
            installationId: 123,
            permissions: { codex: 'read' }
        });
        await expect(handleCreatePr({
            repo: 'test/repo',
            title: 'Test PR',
            head: 'feature-branch',
            role: 'codex'
        })).rejects.toThrow('forbidden');
    });
});
