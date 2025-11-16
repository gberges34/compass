import { handleListFiles } from './list-files.js';
import { getInstallationOctokit } from '../github/app-client.js';
import { loadConfig, findRepo } from '../config.js';

jest.mock('../github/app-client.js');
jest.mock('../config.js');
jest.mock('../github/app-client.ts', () => ({
  getInstallationOctokit: jest.fn()
}));

describe('handleListFiles', () => {
  const mockOctokit = {
    repos: {
      getContent: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getInstallationOctokit as jest.Mock).mockResolvedValue(mockOctokit);
    (loadConfig as jest.Mock).mockReturnValue({
      repos: [{ repo: 'test/repo', installationId: 123, permissions: { codex: 'read' } }]
    });
    (findRepo as jest.Mock).mockReturnValue({
      repo: 'test/repo',
      installationId: 123,
      permissions: { codex: 'read' }
    });
  });

  test('returns file list', async () => {
    mockOctokit.repos.getContent.mockResolvedValue({
      data: [
        { path: 'file1.ts', type: 'file' },
        { path: 'file2.ts', type: 'file' }
      ]
    });

    const result = await handleListFiles({
      repo: 'test/repo',
      path: '',
      ref: 'main',
      role: 'codex'
    });

    expect(result).toEqual([
      { path: 'file1.ts', type: 'file' },
      { path: 'file2.ts', type: 'file' }
    ]);
  });

  test('throws on permission error', async () => {
    (findRepo as jest.Mock).mockReturnValue({
      repo: 'test/repo',
      installationId: 123,
      permissions: { codex: 'read' }
    });

    await expect(
      handleListFiles({
        repo: 'test/repo',
        path: '',
        ref: 'main',
        role: 'gemini' // no permission
      })
    ).rejects.toThrow('forbidden');
  });
});

