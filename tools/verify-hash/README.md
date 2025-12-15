# Script used for verify hashes

## Usage

- Create a `message.json` that will match the wanted reading from the sensor. Example is shown in the `message.json`

- Run the script to get the hash

```shell
> node verify-hash.js message.json

SHA256 Hash: 49f6be0eb4a51bb7b4d12da28fef3fb0fd4a67b7510bc81c9c0101a897994d06
```

- Run the peer CLI command to query the hash

```shell
> peer chaincode query -C hashstoragechannel -n hash -c '{"Args":["ReadHash","mosquitto-bridge-01-1145"]}'

{"ID":"mosquitto-bridge-01-1145","HashValue":"49f6be0eb4a51bb7b4d12da28fef3fb0fd4a67b7510bc81c9c0101a897994d06","Timestamp":"2025-08-22T18:24:03.655","DeviceID":"mosquitto-bridge-01"}
```

- The hashes should match.
