import { app } from './app';
import { env } from './config/env';

const PORT = env.PORT;

// Only start server if not in test environment
if (env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Compass API server running on port ${PORT}`);
  });
}
