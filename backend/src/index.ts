import { app } from './app';
import { env } from './config/env';
import { disconnect } from './prisma';

const PORT = env.PORT;

// Only start server if not in test environment
if (env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Compass API server running on port ${PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    try {
      // Close the server first (stops accepting new connections)
      // Wrap server.close() in a Promise to properly await it
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('HTTP server closed.');
          resolve();
        });
      });

      // Then disconnect database connections
      await disconnect();
      console.log('Database connections closed.');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
