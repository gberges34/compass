# MCP GitHub Gateway

## Purpose

The MCP GitHub Gateway provides a centralized, policy-controlled interface for AI agents (Codex, Cursor, Gemini) to interact with GitHub repositories. It uses a shared GitHub App installation to manage authentication and enforce fine-grained permissions per repository and per agent.

## Architecture

- **TypeScript Express Server**: HTTP-based MCP JSON-RPC endpoint
- **Agent Authentication**: Token-based authentication middleware
- **Policy Enforcement**: Per-repo, per-agent permission checks (read/write)
- **GitHub App Integration**: Uses `@octokit/app` for installation token management
- **Structured Logging**: Pino-based logging with audit trail

## Endpoints

### POST `/mcp`

Main MCP JSON-RPC endpoint. Requires `Authorization: Bearer <token>` header.

**Request Format:**
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

**Response Format:**
```json
{
  "id": 1,
  "result": { ... }
}
```

Or on error:
```json
{
  "id": 1,
  "error": {
    "code": 400,
    "message": "error message"
  }
}
```

## Security Model

1. **Agent Authentication**: Each agent (Codex, Cursor, Gemini) has a unique token set via environment variables
2. **Repository Permissions**: Configured in `config/github.yaml` per repository:
   - `read` - Can list files and read file contents
   - `write` - Can also create pull requests
3. **GitHub App**: Uses GitHub App installation tokens, scoped to configured repositories

## GitHub App Setup

### 1. Create GitHub App

1. Go to your organization/account settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Configure:
   - **Name**: MCP Gateway (or your preferred name)
   - **Homepage URL**: Your service URL
   - **Webhook**: Optional (not required for this gateway)
   - **Permissions**:
     - Repository contents: Read/Write (as needed)
     - Pull requests: Write (if creating PRs)
   - **Where can this GitHub App be installed?**: Only on this account (or your choice)
4. Generate a private key and save it
5. Note the App ID

### 2. Install GitHub App

1. Go to your GitHub App settings → Install App
2. Select the organization/account
3. Select repositories (or all repositories)
4. Note the Installation ID from the URL: `https://github.com/settings/installations/<INSTALLATION_ID>`

### 3. Configure OAuth (Optional)

If you need OAuth flows, configure:
- Client ID
- Client Secret

## Agent Integration

### Codex

Set `CODEX_TOKEN` environment variable and use it in the `Authorization` header:
```bash
curl -X POST http://localhost:4040/mcp \
  -H "Authorization: Bearer $CODEX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "method": "repo.listFiles", "params": {"repo": "owner/repo"}}'
```

### Cursor

Configure Cursor to use the gateway endpoint with `CURSOR_TOKEN`:
```json
{
  "mcpServers": {
    "github": {
      "url": "http://localhost:4040/mcp",
      "headers": {
        "Authorization": "Bearer <CURSOR_TOKEN>"
      }
    }
  }
}
```

### Gemini

Similar configuration using `GEMINI_TOKEN`.

## Configuration

### Environment Variables

See `scripts/mcp-github-server/.env.example` for all required variables.

### Repository Configuration

Edit `scripts/mcp-github-server/config/github.yaml`:

```yaml
repos:
  - repo: compass/compass
    installationId: 123456
    permissions:
      codex: write
      cursor: write
      gemini: read
  - repo: another-org/another-repo
    installationId: 789012
    permissions:
      codex: read
      cursor: read
      gemini: read
```

## Manual Validation

### Test List Files

```bash
curl -X POST http://localhost:4040/mcp \
  -H "Authorization: Bearer $CODEX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "method": "repo.listFiles",
    "params": {
      "repo": "compass/compass",
      "path": "src",
      "ref": "main"
    }
  }'
```

### Test Get File

```bash
curl -X POST http://localhost:4040/mcp \
  -H "Authorization: Bearer $CODEX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 2,
    "method": "repo.getFile",
    "params": {
      "repo": "compass/compass",
      "path": "README.md",
      "ref": "main"
    }
  }'
```

### Test Create PR (requires write permission)

```bash
curl -X POST http://localhost:4040/mcp \
  -H "Authorization: Bearer $CODEX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 3,
    "method": "repo.createPullRequest",
    "params": {
      "repo": "compass/compass",
      "title": "Test PR",
      "body": "This is a test",
      "head": "feature-branch",
      "base": "main"
    }
  }'
```

## Troubleshooting

- **401 Unauthorized**: Check that the token matches the configured `CODEX_TOKEN`, `CURSOR_TOKEN`, or `GEMINI_TOKEN`
- **403 Forbidden**: Verify the agent has the required permission (read/write) for the repository in `config/github.yaml`
- **Repo not found**: Ensure the repository is configured in `config/github.yaml` with the correct installation ID
- **GitHub API errors**: Check that the GitHub App has the required permissions and is installed on the repository

## Audit Trail

All requests are logged to `logs/audit.log` with structured JSON including:
- Method called
- Repository accessed
- Agent role
- Success/failure status
- Error messages (if any)

