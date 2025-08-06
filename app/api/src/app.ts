import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import reportRoutes from './routes/reportRoutes';
import dashboardRoutes from "./routes/dashboardRoutes";
import { logStream } from './config/logger';
import logger from './config/logger';

const app: express.Application = express();

// Middleware configuration
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: logStream }));

// Set up scheduled tasks
setInterval(() => {
  const cacheService = require('./services/cacheService').default;
  cacheService.cleanup();
}, 60 * 60 * 1000);

// Apply routes
app.use('/api', dashboardRoutes);
app.use('/api', reportRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
