import express from 'express';
export function createServer() {
    const app = express();
    app.use(express.json());
    app.post('/mcp', (_req, res) => {
        res.status(501).json({ error: 'MCP not implemented yet' });
    });
    return app;
}
