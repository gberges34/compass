import { handleGetFile } from './get-file.js';
import { getInstallationOctokit, readFile } from '../github/app-client.js';
import { loadConfig, findRepo } from '../config.js';
jest.mock('../github/app-client.js');
jest.mock('../config.js');
jest.mock('../github/app-client.ts', () => ({
    getInstallationOctokit: jest.fn(),
    readFile: jest.fn()
}));
describe('handleGetFile', () => {
    const mockOctokit = {};
    beforeEach(() => {
        jest.clearAllMocks();
        getInstallationOctokit.mockResolvedValue(mockOctokit);
        readFile.mockResolvedValue('file content');
        loadConfig.mockReturnValue({
            repos: [{ repo: 'test/repo', installationId: 123, permissions: { codex: 'read' } }]
        });
        findRepo.mockReturnValue({
            repo: 'test/repo',
            installationId: 123,
            permissions: { codex: 'read' }
        });
    });
    test('returns file content', async () => {
        const result = await handleGetFile({
            repo: 'test/repo',
            path: 'src/index.ts',
            ref: 'main',
            role: 'codex'
        });
        expect(result).toEqual({
            content: 'file content',
            path: 'src/index.ts',
            ref: 'main'
        });
        expect(readFile).toHaveBeenCalledWith(mockOctokit, 'test/repo', 'src/index.ts', 'main');
    });
});
