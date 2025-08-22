```shell
export CHAINCODE_IMAGE="bkofenergy07373262.azurecr.io/hashstorage:1.0" 
docker build -t $CHAINCODE_IMAGE .
```

```shell
kubectl port-forward svc/peer0 7051:7051 --namespace supplychain-net

export FABRIC_CFG_PATH=/Users/stamencho.bogdanovski/git_projects/personal/finki/block-of-energy/hyperledger-fabric/k8s/bevel/
peer lifecycle chaincode package hash-chaincode.tar.gz --path . --lang golang --label hashstorage_1.0 

kubectl cp hash-chaincode.tar.gz supplychain-net/fabric-peernode-peer0-0:/tmp/hash-chaincode.tar.gz -c peer0

kubectl exec -it -n supplychain-net fabric-peernode-peer0-0 -c peer0 -- bash

`
export CORE_PEER_LOCALMSPID="supplychain-net"
export CORE_PEER_MSPCONFIGPATH=/var/hyperledger/fabric/config/msp
export CORE_PEER_ADDRESS=peer0.supplychain-net:7051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/crypto/tls/ca.crt
peer lifecycle chaincode install /tmp/hash-chaincode.tar.gz
`

# Run this on peer0
peer lifecycle chaincode install hash-chaincode.tar.gz

# Then configure your CLI for peer1 and run it again
peer lifecycle chaincode install hash-chaincode.tar.gz

peer lifecycle chaincode approveformyorg -o orderer1.supplychain-net:7050 --channelID allchannel --name hashstorage --version 1.0 --sequence 1 --package-id <PASTE_PACKAGE_ID_HERE>

peer lifecycle chaincode commit -o orderer1.supplychain-net:7050 --channelID allchannel --name hashstorage --version 1.0 --sequence 1

```
