import request from 'supertest';
import express from 'express';
import { authenticate } from './auth.js';
function createServer() {
    const app = express();
    app.use(express.json());
    app.post('/mcp', authenticate, (_req, res) => {
        res.json({ role: res.locals.role });
    });
    return app;
}
test('rejects missing auth', async () => {
    const server = createServer();
    const res = await request(server).post('/mcp').send({});
    expect(res.status).toBe(401);
});
test('rejects invalid token', async () => {
    const server = createServer();
    const res = await request(server)
        .post('/mcp')
        .set('Authorization', 'Bearer invalid-token')
        .send({});
    expect(res.status).toBe(401);
});
test('accepts valid token', async () => {
    process.env.CODEX_TOKEN = 'test-codex-token';
    const server = createServer();
    const res = await request(server)
        .post('/mcp')
        .set('Authorization', 'Bearer test-codex-token')
        .send({});
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('codex');
    delete process.env.CODEX_TOKEN;
});
