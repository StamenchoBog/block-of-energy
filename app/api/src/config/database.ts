import { MongoClient } from 'mongodb';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('Please define the DATABASE_URL environment variable');
}

const db_name = process.env.DATABASE_NAME;
if (!db_name) {
    throw new Error('Missing DATABASE_NAME environment variable');
}

const client = new MongoClient(connectionString);

async function connectToDatabase() {
    try {
        const connection = await client.connect();
        return connection.db(db_name);
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
}

let database: any = null;

export async function getDatabase() {
    if (!database) {
        database = await connectToDatabase();
    }
    return database;
}
