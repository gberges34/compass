import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tasksRouter from './routes/tasks';
import todoistRouter from './routes/todoist';
import orientRouter from './routes/orient';
import reviewsRouter from './routes/reviews';
import postdoRouter from './routes/postdo';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Enable ETags for conditional requests (Express default is 'weak')
app.set('etag', 'strong');

/**
 * Cache Control Middleware
 *
 * Adds appropriate Cache-Control headers to API responses:
 * - GET requests: Cacheable with stale-while-revalidate strategy
 * - Mutations (POST/PUT/DELETE): No caching to prevent stale data
 *
 * Cache durations are optimized per endpoint:
 * - Tasks: 60s cache, 120s stale-while-revalidate (frequently changing)
 * - Plans: 600s cache, 1200s stale-while-revalidate (changes less often)
 * - Reviews: 300s cache, 600s stale-while-revalidate (moderate frequency)
 * - Todoist: 120s cache, 240s stale-while-revalidate (external API)
 * - Post-do logs: 300s cache, 600s stale-while-revalidate (analytics)
 */
app.use((req, res, next) => {
  if (req.method === 'GET') {
    // Set cache headers based on route
    if (req.path.includes('/api/tasks')) {
      // Tasks change frequently - shorter cache
      res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    } else if (req.path.includes('/api/orient')) {
      // Daily plans change less often - longer cache
      res.set('Cache-Control', 'private, max-age=600, stale-while-revalidate=1200');
    } else if (req.path.includes('/api/reviews')) {
      // Reviews moderate frequency
      res.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    } else if (req.path.includes('/api/todoist')) {
      // External API - moderate cache
      res.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=240');
    } else if (req.path.includes('/api/postdo')) {
      // Analytics data - moderate cache
      res.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    } else {
      // Default GET cache
      res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    }
  } else {
    // Mutations should never be cached
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Compass API is running' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'compass-backend'
  });
});

// Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/todoist', todoistRouter);
app.use('/api/orient', orientRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/postdo', postdoRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Compass API server running on port ${PORT}`);
});
