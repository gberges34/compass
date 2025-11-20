# MCP GitHub Gateway Server

An MCP-compatible service that fronts a shared GitHub App, enabling Codex, Cursor, and Gemini to access repositories through consistent, policy-controlled methods.

## Features

- **Agent Authentication**: Token-based authentication for Codex, Cursor, and Gemini agents
- **Policy Enforcement**: Per-repo, per-agent permission control (read/write)
- **GitHub App Integration**: Uses GitHub App installation tokens for secure API access
- **Structured Logging**: Pino-based logging with audit trail to `logs/audit.log`
- **MCP Methods**: 
  - `repo.listFiles` - List files in a repository
  - `repo.getFile` - Read file contents
  - `repo.createPullRequest` - Create a pull request

## Setup

**📖 For detailed setup instructions, see [SETUP.md](./SETUP.md)**

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate agent tokens:**
   ```bash
   npm run setup:generate-tokens
   ```

3. **Create `.env` file** (see `.env.example` for template):
   - Copy tokens from step 2
   - Add GitHub App credentials
   - Format private key: `cat private-key.pem | npm run setup:format-key`

4. **Configure repositories** in `config/github.yaml`

5. **Validate setup:**
   ```bash
   npm run setup:validate
   ```

6. **Start server:**
   ```bash
   npm run dev
   ```

### Helper Scripts

- `npm run setup:generate-tokens` - Generate secure random tokens for agents
- `npm run setup:format-key` - Format GitHub App private key for `.env` file
- `npm run setup:validate` - Validate configuration before starting server

### Running

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Usage

### Authentication

All requests require a `Bearer` token in the `Authorization` header:
```
Authorization: Bearer <your-agent-token>
```

### MCP Request Format

```json
{
  "id": 1,
  "method": "repo.listFiles",
  "params": {
    "repo": "owner/repo",
    "path": "",
    "ref": "main"
  }
}
```

### Methods

#### `repo.listFiles`

List files in a repository directory.

**Parameters:**
- `repo` (string, required) - Repository in `owner/repo` format
- `path` (string, optional) - Directory path (default: "")
- `ref` (string, optional) - Git reference (default: "main")

**Response:**
```json
{
  "id": 1,
  "result": [
    { "path": "file1.ts", "type": "file" },
    { "path": "dir1", "type": "dir" }
  ]
}
```

#### `repo.getFile`

Read file contents.

**Parameters:**
- `repo` (string, required) - Repository in `owner/repo` format
- `path` (string, required) - File path
- `ref` (string, optional) - Git reference (default: "main")

**Response:**
```json
{
  "id": 1,
  "result": {
    "content": "file contents...",
    "path": "src/index.ts",
    "ref": "main"
  }
}
```

#### `repo.createPullRequest`

Create a pull request (requires write permission).

**Parameters:**
- `repo` (string, required) - Repository in `owner/repo` format
- `title` (string, required) - PR title
- `body` (string, optional) - PR description
- `head` (string, required) - Source branch
- `base` (string, optional) - Target branch (default: "main")

**Response:**
```json
{
  "id": 1,
  "result": {
    "number": 42,
    "url": "https://github.com/owner/repo/pull/42",
    "title": "PR Title",
    "state": "open"
  }
}
```

## Testing

Run tests:
```bash
npm test
```

Run verification:
```bash
npm run verify
```

## Logging

Logs are written to:
- Console (pretty-printed)
- `logs/audit.log` (structured JSON)

Set `LOG_LEVEL` environment variable to control verbosity (trace, debug, info, warn, error).

## License

MIT

