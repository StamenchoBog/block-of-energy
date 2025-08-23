import { app, InvocationContext, Timer } from "@azure/functions";
import { getCosmosContainer } from "../lib/cosmos";
import { readFromLedger } from "../lib/fabric";
import { calculateHash } from "../lib/hash";

interface TelemetryDocument {
    _id: string;
    deviceId: string;
    payload: object;
    processingTimestamp: string;
    cosmosInsertTimestamp: string;
    status: string;
}

export async function continuousTemperAuditor(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log('Continuous temper auditor function executed at:', new Date().toISOString());

    // This is a placeholder for the actual implementation of reading/writing last audit timestamp
    const lastAuditTimestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // Default to 5 minutes ago

    try {
        const container = await getCosmosContainer();
        const documents = await container.find({ cosmosInsertTimestamp: { $gt: lastAuditTimestamp } }).sort({ cosmosInsertTimestamp: 1 }).toArray() as TelemetryDocument[];

        if (documents.length === 0) {
            context.log("No new documents to audit.");
            return;
        }

        let latestTimestamp = lastAuditTimestamp;

        for (const doc of documents) {
            const originalMessage = {
                id: doc._id,
                deviceId: doc.deviceId,
                originalPayload: doc.payload,
                processingTimestamp: doc.processingTimestamp,
                status: doc.status,
                messageSource: 'AzureFunction-IoTHubProcessor'
            };

            const currentHash = calculateHash(originalMessage);

            try {
                const ledgerHashBytes = await readFromLedger(doc._id);
                const ledgerHash = JSON.parse(ledgerHashBytes.toString()).HashValue;

                if (currentHash === ledgerHash) {
                    context.log(`SUCCESS: Hash for document ${doc._id} is valid.`);
                } else {
                    context.log(`TAMPER DETECTED: Hash mismatch for document ${doc._id}`);
                    context.log(`  CosmosDB Hash: ${currentHash}`);
                    context.log(`  Ledger Hash:   ${ledgerHash}`);
                }
            } catch (error) {
                context.log(`ERROR: Could not retrieve hash for document ${doc._id} from ledger.`, error);
            }
            latestTimestamp = doc.cosmosInsertTimestamp > latestTimestamp ? doc.cosmosInsertTimestamp : latestTimestamp;
        }

        // This is a placeholder for writing the new latestTimestamp to blob storage
        context.log(`New latest timestamp to be saved: ${latestTimestamp}`);

    } catch (error) {
        context.log('An error occurred during the continuous audit process:', error);
    }
}

app.timer('continuousTemperAuditor', {
    schedule: '0 */5 * * * *', // Runs every 5 minutes
    handler: continuousTemperAuditor
});
