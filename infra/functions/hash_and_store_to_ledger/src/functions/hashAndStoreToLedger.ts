import { app, InvocationContext } from "@azure/functions";
import { submitToLedger } from "../fabric";
import * as crypto from "crypto";

// Updated interface to reflect the full message structure
interface TelemetryMessage {
    id: string;
    deviceId: string;
    originalPayload: object;
    processingTimestamp: string;
    status: string;
    messageSource: string;
}

// Helper function for canonical JSON stringification
const getCanonicalString = (obj: any): string => {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return `[${obj.map(item => getCanonicalString(item)).join(',')}]`;
    }
    const sortedKeys = Object.keys(obj).sort();
    const keyValuePairs = sortedKeys.map(key => `"${key}":${getCanonicalString(obj[key])}`);
    return `{${keyValuePairs.join(',')}}`;
};


export async function hashAndStoreToLedger(message: unknown, context: InvocationContext): Promise<void> {
    context.log('Service Bus topic trigger function processed message', message);
    try {
        const telemetryMessage = message as TelemetryMessage;

        // Validate the structure of the incoming message
        if (!telemetryMessage.id || !telemetryMessage.deviceId || !telemetryMessage.processingTimestamp || !telemetryMessage.originalPayload) {
            throw new Error('Invalid message format. Missing required properties.');
        }

        // Use a canonical string representation for hashing to ensure consistency
        const canonicalString = getCanonicalString(telemetryMessage);
        const hash = crypto.createHash('sha256').update(canonicalString).digest('hex');

        await submitToLedger(telemetryMessage.id, hash, telemetryMessage.processingTimestamp, telemetryMessage.deviceId);
        context.log(`Successfully stored hash for ID ${telemetryMessage.id} in the ledger.`);

    } catch (error) {
        if (error instanceof Error) {
            context.log('Error processing message:', error.message);
        } else {
            context.log('An unknown error occurred:', error);
        }
        // For consumption by a dead-letter queue
        throw error;
    }
}

app.serviceBusTopic('hashAndStoreToLedger', {
    connection: 'SERVICE_BUS_CONNECTION_STRING',
    topicName: 'telemetry-topic',
    subscriptionName: 'ledger-func-subscription',
    handler: hashAndStoreToLedger
});