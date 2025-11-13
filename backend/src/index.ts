import { app } from './app';
import { env } from './config/env';

const PORT = env.PORT;

if (env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Compass API server running on port ${PORT}`);
  });
}

export { app };
