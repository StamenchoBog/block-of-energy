import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import reportRoutes from './routes/reportRoutes';
import dashboardRoutes from "./routes/dashboardRoutes";
import predictionRoutes from "./routes/predictionRoutes";
import { logStream } from './config/logger';
import logger from './config/logger';

const app: express.Application = express();

const REQUEST_TIMEOUT = 30000; // 30 seconds

// Middleware configuration
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.use((req, res, next) => {
    req.setTimeout(REQUEST_TIMEOUT);
    res.setTimeout(REQUEST_TIMEOUT, () => {
        res.status(503).json({ error: 'Request timeout' });
    });
    next();
});

app.use(morgan('combined', {
    stream: logStream,
    skip: (req) => req.url === '/health'
}));

// Set up scheduled tasks
setInterval(() => {
  const cacheService = require('./services/cacheService').default;
  cacheService.cleanup();
}, 60 * 60 * 1000);

// Apply routes
app.use('/api', dashboardRoutes);
app.use('/api', reportRoutes);
app.use('/api', predictionRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
