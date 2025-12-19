import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import logger from './logger';

export function loadEnvironment(): void {
    // Determine environment
    const environment = process.env.NODE_ENV || 'development';

    // Base .env file (always loaded)
    const baseEnvPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(baseEnvPath)) {
        dotenv.config({ path: baseEnvPath });
    }

    // Environment-specific .env file (overrides base)
    const envSpecificPath = path.resolve(process.cwd(), `.env.${environment}`);
    if (fs.existsSync(envSpecificPath)) {
        dotenv.config({ path: envSpecificPath, override: true });
    }

    // Local overrides (highest priority, not committed to git)
    const localEnvPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(localEnvPath)) {
        dotenv.config({ path: localEnvPath, override: true });
    }

    // Required environment variables
    const requiredEnvVars = ['PORT', 'MONGODB_URI', 'PREDICTION_SERVICE_URL'];
    const missingEnvVars = requiredEnvVars.filter(name => !process.env[name]);

    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    if (!process.env.PREDICTION_SERVICE_TIMEOUT) {
        process.env.PREDICTION_SERVICE_TIMEOUT = '30000';
    }
    if (!process.env.PREDICTION_CACHE_TTL) {
        process.env.PREDICTION_CACHE_TTL = '300000'; // 5 minutes
    }

    logger.info(`Environment loaded: ${environment}`);
}

export default loadEnvironment;
