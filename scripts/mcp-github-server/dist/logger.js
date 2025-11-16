import pino from 'pino';
import path from 'node:path';
import fs from 'node:fs';
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}
const logger = pino({
    name: 'mcp-github',
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                level: 'info',
                options: {
                    colorize: true
                }
            },
            {
                target: 'pino/file',
                level: 'info',
                options: {
                    destination: path.join(logDir, 'audit.log')
                }
            }
        ]
    }
});
export { logger };
