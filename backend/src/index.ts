import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tasksRouter from './routes/tasks';
import todoistRouter from './routes/todoist';
import orientRouter from './routes/orient';
import reviewsRouter from './routes/reviews';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Compass API is running' });
});

// Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/todoist', todoistRouter);
app.use('/api/orient', orientRouter);
app.use('/api/reviews', reviewsRouter);

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
