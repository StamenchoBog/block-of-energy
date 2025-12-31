# Hash Verification Tool

Utility to verify blockchain-stored energy reading hashes against original sensor data.

## Usage

1. Create a `message.json` with the sensor reading (example provided):

```json
{
  "deviceId": "tasmota_dishwasher_001",
  "payload": {
    "ENERGY": {
      "Power": 1850,
      "Voltage": 230,
      "Current": 8.04
    }
  }
}
```

2. Generate the hash:

```bash
node verify-hash.js message.json
```

Output:

```text
SHA256 Hash: 49f6be0eb4a51bb7b4d12da28fef3fb0fd4a67b7510bc81c9c0101a897994d06
```

3. Query the blockchain for comparison:

```bash
peer chaincode query -C hashstoragechannel -n hash \
  -c '{"Args":["ReadHash","mosquitto-bridge-01-1145"]}'
```

4. Compare hashes—they should match for data integrity verification.

## How It Works

- Reads JSON sensor data from file
- Computes SHA256 hash of the serialized payload
- Hash can be compared against blockchain-stored hash to verify data hasn't been tampered with
