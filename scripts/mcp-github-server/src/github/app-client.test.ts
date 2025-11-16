import { Octokit } from '@octokit/rest';

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
    } as unknown as Octokit;

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
    } as unknown as Octokit;

    await expect(readFile(mockOctokit, 'owner/repo', 'path/to/dir', 'main')).rejects.toThrow('not a file');
  });
});

