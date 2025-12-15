import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST, before any other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';
import logger from './config/logger';
import { closeDatabase } from './config/database';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

async function shutdown(signal: string) {
    logger.info(`${signal} received, shutting down gracefully...`);

    server.close(async () => {
        logger.info('HTTP server closed');

        try {
            await closeDatabase();
            logger.info('Database connection closed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    });

    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
