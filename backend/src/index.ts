import { app } from './app';
import { env } from './config/env';

const PORT = env.PORT;

// Middleware
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Enable ETags for conditional requests (Express default is 'weak')
app.set('etag', 'strong');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: getCurrentTimestamp(),
    service: 'compass-backend'
  });
});

// Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/todoist', todoistRouter);
app.use('/api/orient', orientRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/postdo', postdoRouter);

// Error handling middleware (MUST be last)
app.use(errorHandler);

// Export app for testing
export { app };

// Only start server if not in test environment
if (env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Compass API server running on port ${PORT}`);
  });
}

export { app };
