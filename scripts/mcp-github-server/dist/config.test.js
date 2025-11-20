import { loadConfig } from './config.js';
import fs from 'node:fs';
import path from 'node:path';
test('loadConfig parses valid file', () => {
    const temp = path.join(process.cwd(), 'config.temp.yaml');
    fs.writeFileSync(temp, 'repos: []');
    expect(loadConfig(temp).repos).toHaveLength(0);
    fs.unlinkSync(temp);
});
test('loadConfig throws on invalid file', () => {
    expect(() => loadConfig('nonexistent.yaml')).toThrow();
});
test('loadConfig validates schema', () => {
    const temp = path.join(process.cwd(), 'config.temp.yaml');
    fs.writeFileSync(temp, 'repos: [{ repo: "test/repo", installationId: 123, permissions: { codex: "read" } }]');
    const config = loadConfig(temp);
    expect(config.repos).toHaveLength(1);
    expect(config.repos[0].repo).toBe('test/repo');
    fs.unlinkSync(temp);
});
