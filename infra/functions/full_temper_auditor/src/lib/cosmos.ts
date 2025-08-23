import { MongoClient } from 'mongodb';

const connectionString = process.env.COSMOSDB_CONNECTION;
if (!connectionString) {
    throw new Error('Please define the COSMOSDB_CONNECTION environment variable');
}

const dbName = process.env.COSMOS_DB_NAME;
if (!dbName) {
    throw new Error('Missing COSMOS_DB_NAME environment variable');
}

const containerName = process.env.COSMOS_CONTAINER_NAME;
if (!containerName) {
    throw new Error('Missing COSMOS_CONTAINER_NAME environment variable');
}

const client = new MongoClient(connectionString);

let db: any = null;

async function connectToDatabase() {
    if (db) {
        return db;
    }
    try {
        await client.connect();
        db = client.db(dbName);
        return db;
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
}

export async function getCosmosContainer() {
    const database = await connectToDatabase();
    return database.collection(containerName);
}
