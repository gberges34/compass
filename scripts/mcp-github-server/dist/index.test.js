import request from 'supertest';
import { createServer } from './test-utils.js';
test('POST /mcp returns 501 placeholder', async () => {
    const server = createServer();
    const res = await request(server).post('/mcp').send({ id: 1, method: 'ping' });
    expect(res.status).toBe(501);
});
