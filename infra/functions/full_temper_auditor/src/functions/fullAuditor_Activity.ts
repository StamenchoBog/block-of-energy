import * as df from "durable-functions";
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

df.app.activity('fullAuditor_GetDocuments', {
    handler: async (): Promise<TelemetryDocument[]> => {
        const container = await getCosmosContainer();
        // In a real-world scenario, this should be paginated.
        const documents = await container.find().toArray() as TelemetryDocument[];
        return documents;
    },
});

df.app.activity('fullAuditor_AuditDocument', {
    handler: async (document: TelemetryDocument): Promise<string> => {
        const originalMessage = {
            id: document._id,
            deviceId: document.deviceId,
            originalPayload: document.payload,
            processingTimestamp: document.processingTimestamp,
            status: document.status,
            messageSource: 'AzureFunction-IoTHubProcessor'
        };

        const currentHash = calculateHash(originalMessage);

        try {
            const ledgerHashBytes = await readFromLedger(document._id);
            const ledgerHash = JSON.parse(ledgerHashBytes.toString()).HashValue;

            if (currentHash === ledgerHash) {
                return `SUCCESS: Hash for document ${document._id} is valid.`;
            } else {
                return `TAMPER DETECTED: Hash mismatch for document ${document._id}`;
            }
        } catch (error) {
            return `ERROR: Could not retrieve hash for document ${document._id} from ledger.`;
        }
    },
});
