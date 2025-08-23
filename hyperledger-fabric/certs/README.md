# Certificate Directory

## Description

Once the AKS provisions the Hyperledger Fabric network, certificates are needed in order for us to communicate with the
ledger.

## Test network

Create 3 files `ca.pem`, `cert.pem` and `key.pem`.

- Content for `cert.pem` from `organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/cert.pem`.

```text
-----BEGIN CERTIFICATE-----
Placeholder for the user certificate.
Replace with the content of crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/cert.pem
-----END CERTIFICATE-----
```

- Content for `key.pem` from `organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/priv_sk`

```text
-----BEGIN CERTIFICATE-----
Placeholder for the user certificate.
Replace with the content of organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/priv_sk
-----END CERTIFICATE-----
```

- Content for `ca.pem` from `organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/tlscacerts/tlsca.org1.example.com-cert.pem`.

```text
-----BEGIN CERTIFICATE-----
Placeholder for the user certificate.
Replace with the content of organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/tlscacerts/tlsca.org1.example.com-cert.pem
-----END CERTIFICATE-----
```
