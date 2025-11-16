#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_DIFF_CHARS = parseInt(process.env.CODEX_MAX_DIFF || '40000', 10);
const OUTPUT_PATH = getArgValue('--output');
const prTitle = (process.env.PR_TITLE || '').trim();
const prBody = (process.env.PR_BODY || '').trim();
const baseSha = (process.env.BASE_SHA || 'origin/main').trim();
const headSha = (process.env.HEAD_SHA || 'HEAD').trim();
const repoName = process.env.GITHUB_REPO || '';
const apiKey = process.env.CODEX_API_KEY;
const model = process.env.CODEX_MODEL || 'gpt-4.1-mini';

(async function main() {
  try {
    if (!apiKey) {
      throw new Error('CODEX_API_KEY is required');
    }

    const diff = getDiff(baseSha, headSha);
    const truncatedDiff = truncateDiff(diff, MAX_DIFF_CHARS);
    const prompt = buildPrompt({ diff: truncatedDiff, prBody, prTitle, repoName });
    const review = await requestReview({ apiKey, model, prompt });

    if (!review) {
      throw new Error('Codex response did not contain any content');
    }

    writeOutput(review.trim());
  } catch (error) {
    console.error(`Codex review failed: ${error.message}`);
    process.exit(1);
  }
})();

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return null;
}

function getDiff(base, head) {
  try {
    return execSync(`git diff ${base}...${head}`, { maxBuffer: 1024 * 1024 * 20 }).toString();
  } catch (error) {
    throw new Error(`Unable to compute diff: ${error.message}`);
  }
}

function truncateDiff(diff, limit) {
  if (!diff.trim()) {
    return 'No changes detected in this pull request.';
  }

  if (diff.length <= limit) {
    return diff;
  }

  const entries = splitDiff(diff);
  const prioritizedEntries = entries
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.index - b.index;
    });

  let totalChars = 0;
  const included = [];

  for (const entry of prioritizedEntries) {
    const entryText = entry.lines.join('\n');
    if (totalChars + entryText.length > limit) {
      const remaining = limit - totalChars;
      if (remaining > 0) {
        included.push(entryText.slice(0, remaining));
        totalChars += remaining;
      }
      break;
    }
    included.push(entryText);
    totalChars += entryText.length;
  }

  const truncated = included.join('\n').trim();
  return `${truncated}\n\n[Diff truncated to ${limit.toLocaleString()} of ${diff.length.toLocaleString()} characters. Highest priority files (tests & configs) included first.]`;
}

function splitDiff(diff) {
  const lines = diff.split(/\n/);
  const entries = [];
  let current = null;

  lines.forEach((line) => {
    if (line.startsWith('diff --git')) {
      if (current) {
        entries.push(current);
      }
      const filePath = extractFilePath(line);
      current = {
        filePath,
        lines: [line],
        priority: computePriority(filePath),
      };
    } else if (current) {
      current.lines.push(line);
    }
  });

  if (current) {
    entries.push(current);
  }

  return entries;
}

function extractFilePath(headerLine) {
  const match = headerLine.match(/a\/(.*?) b\//);
  if (match && match[1]) {
    return match[1];
  }
  const parts = headerLine.split(' ');
  return parts[2]?.replace('a/', '') || 'unknown-file';
}

function computePriority(filePath = '') {
  const lower = filePath.toLowerCase();
  if (/(test|spec|__tests__|\.test\.|\.spec\.)/.test(lower)) {
    return 0;
  }
  if (/(package\.json|\.ya?ml|\.toml|\.config|\.github|dockerfile|\.lock)/.test(lower)) {
    return 1;
  }
  return 2;
}

function buildPrompt({ diff, prBody, prTitle, repoName }) {
  const safeBody = prBody || 'No description provided.';
  const safeTitle = prTitle || 'Untitled Pull Request';

  return [
    `Repository: ${repoName}`,
    `PR Title: ${safeTitle}`,
    'PR Description:',
    safeBody,
    '',
    'Unified Diff:',
    diff,
  ].join('\n');
}

async function requestReview({ apiKey, model, prompt }) {
  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert code reviewer. Briefly summarize the intent of the PR, list potential issues (bugs, edge cases, performance, security, maintainability), suggest improvements with concrete snippets, and call out missing tests or docs. Be concise, use bullet points, and reference filenames and line ranges when possible.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 1200,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Codex API error: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content;
}

function writeOutput(review) {
  if (OUTPUT_PATH) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, review, 'utf8');
  } else {
    console.log(review);
  }
}
