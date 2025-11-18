import { Octokit } from '@octokit/rest';
import type { InstallationOctokit } from './app-client.js';

const mockGetInstallationOctokit = jest.fn();

jest.mock('@octokit/app', () => {
  return {
    App: jest.fn().mockImplementation(() => ({
      getInstallationOctokit: mockGetInstallationOctokit
    }))
  };
});

describe('app-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GITHUB_APP_ID = '123';
    process.env.GITHUB_APP_PRIVATE_KEY = 'mock-key';
    process.env.GITHUB_CLIENT_ID = 'client-id';
    process.env.GITHUB_CLIENT_SECRET = 'client-secret';
  });

  test('getInstallationOctokit requests token and returns Octokit', async () => {
    // Need to import after mock is set up
    const { getInstallationOctokit } = await import('./app-client.js');
    const mockOctokit = new Octokit({ auth: 'mock-token' });
    mockGetInstallationOctokit.mockResolvedValue(mockOctokit);

    const octokit = await getInstallationOctokit(456);
    
    expect(mockGetInstallationOctokit).toHaveBeenCalledWith(456);
    expect(octokit).toBeInstanceOf(Octokit);
  });

  test('readFile decodes file content', async () => {
    const { readFile } = await import('./app-client.js');
    const mockOctokit = {
      repos: {
        getContent: jest.fn().mockResolvedValue({
          data: {
            content: Buffer.from('test content').toString('base64'),
            encoding: 'base64'
          }
        })
      }
    } as unknown as InstallationOctokit;

    const content = await readFile(mockOctokit, 'owner/repo', 'path/to/file', 'main');
    expect(content).toBe('test content');
    expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      path: 'path/to/file',
      ref: 'main'
    });
  });

  test('readFile throws on directory', async () => {
    const { readFile } = await import('./app-client.js');
    const mockOctokit = {
      repos: {
        getContent: jest.fn().mockResolvedValue({
          data: {
            type: 'dir'
          }
        })
      }
    } as unknown as InstallationOctokit;

    await expect(readFile(mockOctokit, 'owner/repo', 'path/to/dir', 'main')).rejects.toThrow('not a file');
  });

  describe('readFile repo format validation', () => {
    test('throws on repo without slash', async () => {
      const { readFile } = await import('./app-client.js');
      const mockOctokit = {
        repos: {
          getContent: jest.fn()
        }
      } as unknown as InstallationOctokit;

      await expect(readFile(mockOctokit, 'invalid-repo', 'path/to/file', 'main')).rejects.toThrow(
        'Invalid repo format: "invalid-repo". Expected \'owner/name\'.'
      );
      expect(mockOctokit.repos.getContent).not.toHaveBeenCalled();
    });

    test('throws on repo with only owner', async () => {
      const { readFile } = await import('./app-client.js');
      const mockOctokit = {
        repos: {
          getContent: jest.fn()
        }
      } as unknown as InstallationOctokit;

      await expect(readFile(mockOctokit, 'owner/', 'path/to/file', 'main')).rejects.toThrow(
        'Invalid repo format: "owner/". Expected \'owner/name\'.'
      );
      expect(mockOctokit.repos.getContent).not.toHaveBeenCalled();
    });

    test('throws on repo with only name', async () => {
      const { readFile } = await import('./app-client.js');
      const mockOctokit = {
        repos: {
          getContent: jest.fn()
        }
      } as unknown as InstallationOctokit;

      await expect(readFile(mockOctokit, '/name', 'path/to/file', 'main')).rejects.toThrow(
        'Invalid repo format: "/name". Expected \'owner/name\'.'
      );
      expect(mockOctokit.repos.getContent).not.toHaveBeenCalled();
    });

    test('throws on repo with multiple slashes', async () => {
      const { readFile } = await import('./app-client.js');
      const mockOctokit = {
        repos: {
          getContent: jest.fn()
        }
      } as unknown as InstallationOctokit;

      await expect(readFile(mockOctokit, 'owner/repo/path', 'path/to/file', 'main')).rejects.toThrow(
        'Invalid repo format: "owner/repo/path". Expected \'owner/name\'.'
      );
      expect(mockOctokit.repos.getContent).not.toHaveBeenCalled();
    });

    test('throws on empty repo string', async () => {
      const { readFile } = await import('./app-client.js');
      const mockOctokit = {
        repos: {
          getContent: jest.fn()
        }
      } as unknown as InstallationOctokit;

      await expect(readFile(mockOctokit, '', 'path/to/file', 'main')).rejects.toThrow(
        'Invalid repo format: "". Expected \'owner/name\'.'
      );
      expect(mockOctokit.repos.getContent).not.toHaveBeenCalled();
    });
  });
});

