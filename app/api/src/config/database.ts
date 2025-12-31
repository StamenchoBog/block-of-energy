import { MongoClient, Db } from 'mongodb';
import logger from './logger';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('Please define the DATABASE_URL environment variable');
}

const db_name = process.env.DATABASE_NAME;
if (!db_name) {
    throw new Error('Missing DATABASE_NAME environment variable');
}

const client = new MongoClient(connectionString, {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
});

let database: Db | null = null;
let isConnected = false;

async function connectToDatabase(): Promise<Db> {
    try {
        await client.connect();
        isConnected = true;
        const db = client.db(db_name);

        await createIndexes(db);

        return db;
    } catch (error) {
        logger.error('Database connection error:', error);
        throw error;
    }
}

async function createIndexes(db: Db): Promise<void> {
    const collection = db.collection('sensor-measurements');

    try {
        await collection.createIndex(
            { processingTimestamp: -1 },
            { background: true, name: 'idx_processingTimestamp' }
        );
        await collection.createIndex(
            { 'payload.ENERGY': 1, processingTimestamp: -1 },
            { background: true, name: 'idx_energy_timestamp' }
        );
        await collection.createIndex(
            { 'payload.timestamp': -1 },
            { background: true, name: 'idx_payload_timestamp' }
        );
        await collection.createIndex(
            { deviceId: 1, processingTimestamp: -1 },
            { background: true, name: 'idx_deviceId_timestamp' }
        );

        logger.info('Database indexes created successfully');
    } catch (error) {
        logger.debug('Index creation skipped (may already exist):', error);
    }
}

export async function getDatabase(): Promise<Db> {
    if (!database) {
        database = await connectToDatabase();
    }
    return database;
}

export async function closeDatabase(): Promise<void> {
    if (isConnected) {
        await client.close();
        isConnected = false;
        database = null;
        logger.info('Database connection closed');
    }
}

export { client };
