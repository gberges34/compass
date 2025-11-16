# Quick Start Checklist

Use this checklist to quickly set up the MCP GitHub Gateway.

## Prerequisites
- [ ] Node.js 20+ installed
- [ ] GitHub account/organization with admin access
- [ ] Repository(ies) you want to access

## Setup Steps

### 1. GitHub App Setup (5-10 minutes)
- [ ] Create GitHub App at https://github.com/settings/apps
  - [ ] Name: `MCP Gateway`
  - [ ] Permissions: Repository contents (Read/Write), Pull requests (Write)
  - [ ] Save **App ID**
  - [ ] Generate and save **private key** (.pem file)

- [ ] Install GitHub App on your repository(ies)
  - [ ] Go to App settings → Install App
  - [ ] Select repository(ies)
  - [ ] Save **Installation ID** from URL

### 2. Local Configuration (5 minutes)
- [ ] Run `npm install`
- [ ] Generate tokens: `npm run setup:generate-tokens`
- [ ] Create `.env` file with:
  - [ ] Agent tokens (from step above)
  - [ ] GitHub App ID
  - [ ] GitHub App private key (format with `cat key.pem | npm run setup:format-key`)
- [ ] Update `config/github.yaml` with:
  - [ ] Repository name (e.g., `your-org/your-repo`)
  - [ ] Installation ID
  - [ ] Agent permissions

### 3. Validation & Testing (2 minutes)
- [ ] Run `npm run setup:validate` (fix any errors)
- [ ] Start server: `npm run dev`
- [ ] Test with curl (see SETUP.md for examples)

## Helper Commands

```bash
# Generate tokens
npm run setup:generate-tokens

# Format private key for .env
cat private-key.pem | npm run setup:format-key

# Validate configuration
npm run setup:validate

# Start development server
npm run dev

# Run tests
npm test
```

## Need Help?

- Detailed instructions: See [SETUP.md](./SETUP.md)
- API documentation: See [README.md](./README.md)
- Integration guide: See [docs/mcp/github-gateway.md](../../docs/mcp/github-gateway.md)

