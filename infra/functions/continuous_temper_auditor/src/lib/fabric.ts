import { connect, Contract, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as grpc from '@grpc/grpc-js';
import { promises as fs } from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

const mspId = process.env.FABRIC_MSP_ID!;
const channelName = process.env.FABRIC_CHANNEL_NAME!;
const chaincodeName = process.env.FABRIC_CHAINCODE_NAME!;
const gatewayEndpoint = process.env.FABRIC_GATEWAY_ENDPOINT!;

// Paths to crypto material.
const certPath = path.resolve(process.env.FABRIC_CERT_PATH!);
const keyPath = path.resolve(process.env.FABRIC_KEY_PATH!);
const tlsCertPath = path.resolve(process.env.FABRIC_TLS_CERT_PATH!);


async function newGrpcConnection(): Promise<grpc.Client> {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(gatewayEndpoint, tlsCredentials);
}

async function newIdentity(): Promise<Identity> {
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function newSigner(): Promise<Signer> {
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

export async function readFromLedger(id: string): Promise<Uint8Array> {
    const client = await newGrpcConnection();
    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
    });

    try {
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        console.log(`--> Evaluate Transaction: ReadHash, ID: ${id}`);
        const result = await contract.evaluateTransaction('ReadHash', id);
        console.log('*** Transaction evaluated successfully');
        return result;
    } finally {
        gateway.close();
        client.close();
    }
}
