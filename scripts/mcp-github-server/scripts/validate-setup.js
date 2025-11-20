#!/usr/bin/env node

/**
 * Validation script to check MCP Gateway setup
 * Usage: node scripts/validate-setup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let errors = [];
let warnings = [];

// Check .env file exists
const envPath = path.join(rootDir, '.env');
if (!fs.existsSync(envPath)) {
  errors.push('❌ .env file not found. Copy .env.example to .env and fill in values.');
} else {
  console.log('✅ .env file exists');
  
  // Check required env vars (basic check - just existence)
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'CODEX_TOKEN',
    'CURSOR_TOKEN',
    'GEMINI_TOKEN',
    'GITHUB_APP_ID',
    'GITHUB_APP_PRIVATE_KEY'
  ];
  
  requiredVars.forEach(varName => {
    if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=your-`)) {
      errors.push(`❌ ${varName} not set or still has placeholder value`);
    } else {
      console.log(`✅ ${varName} is set`);
    }
  });
}

// Check config file exists and is valid
const configPath = path.join(rootDir, 'config', 'github.yaml');
if (!fs.existsSync(configPath)) {
  errors.push('❌ config/github.yaml not found');
} else {
  console.log('✅ config/github.yaml exists');
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = parse(configContent);
    
    if (!config.repos || !Array.isArray(config.repos)) {
      errors.push('❌ config/github.yaml missing or invalid repos array');
    } else {
      console.log(`✅ Found ${config.repos.length} repository configuration(s)`);
      
      config.repos.forEach((repo, index) => {
        if (!repo.repo) {
          errors.push(`❌ Repository ${index + 1} missing 'repo' field`);
        } else if (repo.repo.includes('YOUR-ORG') || repo.repo.includes('compass/compass')) {
          warnings.push(`⚠️  Repository ${index + 1} appears to have placeholder value: ${repo.repo}`);
        }
        
        if (!repo.installationId || repo.installationId === 123456) {
          warnings.push(`⚠️  Repository ${index + 1} has placeholder installationId: ${repo.installationId}`);
        }
        
        if (!repo.permissions) {
          errors.push(`❌ Repository ${index + 1} missing 'permissions' field`);
        }
      });
    }
  } catch (error) {
    errors.push(`❌ Failed to parse config/github.yaml: ${error.message}`);
  }
}

// Check logs directory exists
const logsDir = path.join(rootDir, 'logs');
if (!fs.existsSync(logsDir)) {
  warnings.push('⚠️  logs directory does not exist (will be created on first run)');
} else {
  console.log('✅ logs directory exists');
}

// Check node_modules
const nodeModulesPath = path.join(rootDir, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  warnings.push('⚠️  node_modules not found. Run: npm install');
} else {
  console.log('✅ node_modules exists');
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Setup validation passed!');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('\n❌ ERRORS (must fix):');
    errors.forEach(err => console.log(`  ${err}`));
  }
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(warn => console.log(`  ${warn}`));
  }
  console.log('\nPlease fix the errors above before starting the server.');
  process.exit(errors.length > 0 ? 1 : 0);
}

