# MCP GitHub Gateway Setup Guide

This guide walks you through setting up the MCP GitHub Gateway step by step.

## Quick Start Checklist

- [ ] Create GitHub App
- [ ] Install GitHub App on repositories
- [ ] Generate agent tokens
- [ ] Create `.env` file with credentials
- [ ] Update `config/github.yaml` with repository details
- [ ] Run `npm run setup:validate` to check configuration
- [ ] Start server with `npm run dev`
- [ ] Test with curl commands

## Step-by-Step Instructions

### Step 1: Create GitHub App

1. Navigate to GitHub App settings:
   - Personal account: https://github.com/settings/apps
   - Organization: https://github.com/organizations/YOUR-ORG/settings/apps

2. Click **"New GitHub App"**

3. Fill in the form:
   - **Name**: `MCP Gateway` (or your preferred name)
   - **Homepage URL**: `https://github.com/YOUR-ORG/compass` (your repository URL)
   - **Webhook**: Leave **unchecked** (not needed)
   - **Permissions**:
     - Repository contents: **Read and write**
     - Pull requests: **Write**
     - Metadata: **Read-only** (automatic)
   - **Where can this GitHub App be installed?**: Choose based on your needs

4. Click **"Create GitHub App"**

5. **Save the App ID** (displayed on the app page)

6. **Generate and save the private key**:
   - Click **"Generate a private key"**
   - Save the `.pem` file securely
   - You'll need to format this for the `.env` file (see Step 3)

### Step 2: Install GitHub App

1. In your GitHub App settings, click **"Install App"** in the left sidebar

2. Select the account/organization

3. Choose installation scope:
   - **Only select repositories** (recommended)
   - Select the repository(ies) you want to access

4. Click **"Install"**

5. **Capture the Installation ID** from the URL:
   - URL format: `https://github.com/settings/installations/12345678`
   - The number (`12345678`) is your Installation ID
   - Save this for Step 4

### Step 3: Generate Agent Tokens

Run the token generator script:

```bash
npm run setup:generate-tokens
```

This will output three secure random tokens. Copy these values - you'll need them for the `.env` file.

Alternatively, generate manually:
```bash
openssl rand -hex 32  # Run three times, once for each agent
```

### Step 4: Create `.env` File

1. Create a `.env` file in `scripts/mcp-github-server/`:

```bash
cd scripts/mcp-github-server
touch .env
```

2. Add the following content (replace placeholder values):

```env
# Agent Authentication Tokens (from Step 3)
CODEX_TOKEN=<generated-codex-token>
CURSOR_TOKEN=<generated-cursor-token>
GEMINI_TOKEN=<generated-gemini-token>

# GitHub App Credentials (from Step 1)
GITHUB_APP_ID=<your-app-id>
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n"

# GitHub OAuth (optional - only if using OAuth)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Server Configuration
PORT=4040
LOG_LEVEL=info
```

**Important Notes:**
- Replace `<generated-codex-token>` etc. with tokens from Step 3
- Replace `<your-app-id>` with the App ID from Step 1
- For `GITHUB_APP_PRIVATE_KEY`: Copy the entire private key from the `.pem` file and escape newlines as `\n`
  - Example: If your key has newlines, replace each newline with `\n`
  - The entire key should be on one line, wrapped in quotes

### Step 5: Update Repository Configuration

Edit `config/github.yaml`:

```yaml
repos:
  - repo: YOUR-ORG/YOUR-REPO-NAME
    installationId: <INSTALLATION_ID_FROM_STEP_2>
    permissions:
      codex: write
      cursor: write
      gemini: read
```

Replace:
- `YOUR-ORG/YOUR-REPO-NAME` with your actual repository (e.g., `compass/compass`)
- `<INSTALLATION_ID_FROM_STEP_2>` with the Installation ID from Step 2

### Step 6: Validate Setup

Run the validation script to check your configuration:

```bash
npm run setup:validate
```

This will check:
- ✅ `.env` file exists and has required variables
- ✅ `config/github.yaml` is valid
- ✅ Repository configurations are set up
- ⚠️  Warns about placeholder values

Fix any errors before proceeding.

### Step 7: Install Dependencies (if not done)

```bash
npm install
```

### Step 8: Test the Server

1. Start the server:
```bash
npm run dev
```

2. You should see:
```
[mcp-github] loaded config with X repo(s)
[mcp-github] listening on 4040
```

3. Test authentication (should fail without token):
```bash
curl -X POST http://localhost:4040/mcp \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "method": "repo.listFiles", "params": {"repo": "YOUR-ORG/YOUR-REPO"}}'
```

Expected: `{"error":"unauthorized"}`

4. Test with valid token (replace `$CODEX_TOKEN` with actual token or export it):
```bash
export CODEX_TOKEN=<your-codex-token>
curl -X POST http://localhost:4040/mcp \
  -H "Authorization: Bearer $CODEX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "method": "repo.listFiles", "params": {"repo": "YOUR-ORG/YOUR-REPO", "path": "", "ref": "main"}}'
```

Expected: JSON response with file list

### Step 9: Verify Logging

1. Check that `logs/audit.log` exists and contains log entries
2. Check console output for pretty-printed logs

## Troubleshooting

### Server won't start

- Check that `.env` file exists and has all required variables
- Verify `config/github.yaml` is valid YAML
- Run `npm run setup:validate` to check for issues

### 401 Unauthorized

- Verify token matches the one in `.env`
- Check that you're using `Bearer` prefix: `Authorization: Bearer <token>`
- Ensure token doesn't have extra spaces or newlines

### 403 Forbidden

- Check repository permissions in `config/github.yaml`
- Verify the agent has the required permission (read/write) for the operation
- Ensure repository name matches exactly: `owner/repo-name`

### Repo not found

- Verify repository is in `config/github.yaml`
- Check Installation ID matches the GitHub App installation
- Ensure GitHub App is installed on the repository

### GitHub API errors

- Verify GitHub App has correct permissions
- Check that App is installed on the repository
- Ensure `GITHUB_APP_PRIVATE_KEY` is correctly formatted (escaped newlines)

## Next Steps

Once setup is complete and tested:

1. **Deploy** the server (if running in production)
2. **Configure agents** to use the gateway:
   - Codex: Use `CODEX_TOKEN` in agent configuration
   - Cursor: Add MCP server config pointing to gateway endpoint
   - Gemini: Use `GEMINI_TOKEN` in agent configuration

See `docs/mcp/github-gateway.md` for integration details.

