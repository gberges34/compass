#!/usr/bin/env node

/**
 * Helper script to generate secure random tokens for agent authentication
 * Usage: node scripts/generate-tokens.js
 */

import crypto from 'crypto';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

console.log('Generated tokens for agent authentication:\n');
console.log(`CODEX_TOKEN=${generateToken()}`);
console.log(`CURSOR_TOKEN=${generateToken()}`);
console.log(`GEMINI_TOKEN=${generateToken()}`);
console.log('\nCopy these values to your .env file.');

