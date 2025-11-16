#!/usr/bin/env node

/**
 * Helper script to format GitHub App private key for .env file
 * Reads from stdin or a file and outputs the escaped version
 * 
 * Usage:
 *   cat private-key.pem | node scripts/format-private-key.js
 *   node scripts/format-private-key.js < private-key.pem
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to read from file argument, otherwise stdin
let keyContent;
if (process.argv[2]) {
  const keyPath = resolve(process.argv[2]);
  keyContent = readFileSync(keyPath, 'utf8');
} else {
  // Read from stdin
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  keyContent = Buffer.concat(chunks).toString('utf8');
}

if (!keyContent || !keyContent.trim()) {
  console.error('Error: No private key content provided');
  console.error('Usage: cat private-key.pem | node scripts/format-private-key.js');
  console.error('   OR: node scripts/format-private-key.js < private-key.pem');
  process.exit(1);
}

// Escape newlines and trim
const formatted = keyContent.trim().replace(/\n/g, '\\n');

console.log('\nAdd this to your .env file:\n');
console.log(`GITHUB_APP_PRIVATE_KEY="${formatted}"\n`);

