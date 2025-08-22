### Deployment of Hyperledger Fabric

## Local Development

### Pre-requisites

- Kind
- Kubectl
- Kubectx
- K9s


#### 1. Create the cluster

```shell
kind create cluster --config kind-config.yaml --name bkp-of-energy-cluster

kubectx bkp-of-energy-cluster
```

##### Using Bevel

###### (Optional) HA and Fault Tolerance
Provision more orderer(s) and peer(s) nodes to make the Hyperledger Fabric network better HA (High-available) and Fault Tolerance. 
Also, make the affinity better to place them on separate physical nodes (VMs).

The docs are present [here](https://github.com/hyperledger-bevel/bevel/blob/main/platforms/hyperledger-fabric/charts/README.md).

```shell
### Without Proxy or Vault ###
# Fabric CA Server
helm upgrade --install supplychain-ca ./charts/fabric-ca-server \
  --namespace supplychain-net \
  --create-namespace \
  --values ./values/no-proxy-and-novault/ca-orderer.yaml

# Fabric Orderer(s)
helm upgrade --install orderer1 ./charts/fabric-orderernode \
  --namespace supplychain-net \
  --values ./values/no-proxy-and-novault/orderer.yaml

helm upgrade --install orderer2 ./charts/fabric-orderernode \
  --namespace supplychain-net \
  --values ./values/no-proxy-and-novault/orderer.yaml \
  --set certs.settings.createConfigMaps=false

# ...more orderer(s) if needed 

# Fabric Peer(s)
helm upgrade --install peer0 ./charts/fabric-peernode \
  --namespace supplychain-net \
  --values ./values/no-proxy-and-novault/peer.yaml

helm upgrade --install peer1 ./charts/fabric-peernode \
  --namespace supplychain-net \
  --values ./values/no-proxy-and-novault/peer.yaml \
  --set peer.gossipPeerAddress=peer0.supplychain-net:7051 \
  --set peer.cliEnabled=true

# ...more peer(s) if needed

# Generate the genesis block
helm install genesis ./charts/fabric-genesis \
  --namespace supplychain-net \
  --values ./values/no-proxy-and-novault/genesis.yaml

# Fabric Channel(s)
helm install allchannel ./charts/fabric-osnadmin-channel-create \
  --namespace supplychain-net \
  --values ./values/no-proxy-and-novault/osnadmin-channel-create.yaml

# Join other Peer(s) to Channel(s)
helm install peer1-allchannel ./charts/fabric-channel-join \
  --namespace supplychain-net \
  --set global.vault.type=kubernetes \
  --set peer.name=peer1 \
  --set peer.address=peer1.supplychain-net:7051
```
```shell
### With Proxy or Vault ###

kubectl create namespace supplychain-net
kubectl -n supplychain-net create secret generic roottoken --from-literal=token=<VAULT_ROOT_TOKEN>

# CA
helm upgrade --install supplychain-ca ./fabric-ca-server --namespace supplychain-net --values ./values/proxy-and-vault/ca-orderer.yaml
# Orderer(s)
helm upgrade --install orderer1 ./fabric-orderernode --namespace supplychain-net --values ./values/proxy-and-vault/orderer.yaml
# helm upgrade --install orderer2 ./fabric-orderernode --namespace supplychain-net --values ./values/proxy-and-vault/orderer.yaml --set certs.settings.createConfigMaps=false
# Peer(s)
helm upgrade --install peer0 ./fabric-peernode --namespace supplychain-net --values ./values/proxy-and-vault/peer.yaml
helm upgrade --install peer1 ./fabric-peernode --namespace supplychain-net --values ./values/proxy-and-vault/peer.yaml --set peer.gossipPeerAddress=peer0.supplychain-net.hlf.blockchaincloudpoc-develop.com:443 --set peer.cliEnabled=true
# Genesis block
helm install genesis ./fabric-genesis --namespace supplychain-net --values ./values/proxy-and-vault/genesis.yaml

# Create channel
helm install allchannel ./fabric-osnadmin-channel-create --namespace supplychain-net --values ./values/proxy-and-vault/osn-create-channel.yaml

# Join peer to channel and make it an anchor peer
helm install peer0-allchannel ./fabric-channel-join --namespace supplychain-net --values ./values/proxy-and-vault/join-channel.yaml
helm install peer1-allchannel ./fabric-channel-join --namespace supplychain-net --values ./values/proxy-and-vault/join-channel.yaml --set peer.name=peer1 --set peer.address=peer1.supplychain-net.test.yourdomain.com:443
```

### Cleanup

```shell
helm uninstall --namespace supplychain-net peer1-allchannel peer0-allchannel
helm uninstall --namespace supplychain-net peer0 peer1
helm uninstall --namespace supplychain-net orderer1 orderer2 orderer3
helm uninstall --namespace supplychain-net genesis allchannel
helm uninstall --namespace supplychain-net supplychain-ca

helm uninstall --namespace carrier-net peer0 peer0-allchannel allchannel
helm uninstall --namespace carrier-net carrier-ca
```