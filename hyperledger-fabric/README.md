# Hyperledger Fabric for Energy Consumption Data

This setup deploys a Hyperledger Fabric blockchain network specifically designed for storing and verifying energy consumption data hashes.

## Local Deployment on KinD

### Prerequisites

- Docker
- kubectl
- Helm
- KinD (Kubernetes in Docker)
- Krew

### Step 1: Create KinD Cluster

```bash
kind create cluster --config=./k8s/kind-config.yaml
```

### Step 2: Install Hyperledger Fabric Operator

```bash
helm repo add kfs https://kfsoftware.github.io/hlf-helm-charts --force-update
helm install hlf-operator --version=1.13.0 kfs/hlf-operator

kubectl krew install hlf
```

### Step 3: Install Istio Service Mesh

```bash
# Install Istio binaries on the machine
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.23.3 sh -

# Install Istio on the Kubernetes cluster:
kubectl create namespace istio-system
export ISTIO_PATH=$(echo $PWD/istio-*/bin)
export PATH="$PATH:$ISTIO_PATH"
istioctl operator init
kubectl apply -f k8s/istio-gateway.yaml
```

### Step 4: Set Environment Variables

```bash
export PEER_IMAGE=hyperledger/fabric-peer
export PEER_VERSION=3.1.0

export ORDERER_IMAGE=hyperledger/fabric-orderer
export ORDERER_VERSION=3.1.0

export CA_IMAGE=hyperledger/fabric-ca
export CA_VERSION=1.5.15

export SC_NAME=standard
```

#### Configure Internal DNS

```bash
kubectl apply -f k8s/internal-core-dns.yaml
```

### Step 5: Deploy Energy Provider Organization

#### Create Energy Provider Certificate Authority

```bash
kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$SC_NAME --capacity=1Gi --name=energy-provider-ca \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=energy-provider-ca.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
```

Check if the CA is deployed and works:

```bash
curl -k https://energy-provider-ca.localho.st:443/cainfo
```

#### Register Energy Provider Peer User

```bash
kubectl hlf ca register --name=energy-provider-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid EnergyProviderMSP
```

#### Deploy Energy Provider Peer

```bash
kubectl hlf peer create --statedb=leveldb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=$SC_NAME --enroll-id=peer --mspid=EnergyProviderMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=energy-provider-peer0 --ca-name=energy-provider-ca.default \
        --hosts=peer0-energy-provider.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabricpeers.hlf.kungfusoftware.es --all
```

Check if Peer is deployed and works:

```bash
openssl s_client -connect peer0-energy-provider.localho.st:443
```

### Step 6: Deploy Energy Network Orderer Organization

To deploy the Orderer organization for the energy network:

1. Create a `certification authority`
2. Register user `orderer` with password `ordererpw`
3. Create `orderer` nodes

#### Create Energy Network Orderer Certificate Authority

```bash
kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$SC_NAME --capacity=1Gi --name=energy-orderer-ca \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=energy-orderer-ca.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
```

Check if it is working:

```bash
curl -vik https://energy-orderer-ca.localho.st:443/cainfo
```

#### Register Orderer User

```bash
kubectl hlf ca register --name=energy-orderer-ca --user=orderer --secret=ordererpw \
    --type=orderer --enroll-id enroll --enroll-secret=enrollpw --mspid=EnergyOrdererMSP --ca-url="https://energy-orderer-ca.localho.st:443"
```

#### Deploy Energy Network Orderer Nodes

```bash
kubectl hlf ordnode create --image=$ORDERER_IMAGE --version=$ORDERER_VERSION \
    --storage-class=$SC_NAME --enroll-id=orderer --mspid=EnergyOrdererMSP \
    --enroll-pw=ordererpw --capacity=2Gi --name=energy-ord-node1 --ca-name=energy-orderer-ca.default \
    --hosts=orderer0-energy.localho.st --admin-hosts=admin-orderer0-energy.localho.st --istio-port=443

kubectl hlf ordnode create --image=$ORDERER_IMAGE --version=$ORDERER_VERSION \
    --storage-class=$SC_NAME --enroll-id=orderer --mspid=EnergyOrdererMSP \
    --enroll-pw=ordererpw --capacity=2Gi --name=energy-ord-node2 --ca-name=energy-orderer-ca.default \
    --hosts=orderer1-energy.localho.st --admin-hosts=admin-orderer1-energy.localho.st --istio-port=443

kubectl hlf ordnode create --image=$ORDERER_IMAGE --version=$ORDERER_VERSION \
    --storage-class=$SC_NAME --enroll-id=orderer --mspid=EnergyOrdererMSP \
    --enroll-pw=ordererpw --capacity=2Gi --name=energy-ord-node3 --ca-name=energy-orderer-ca.default \
    --hosts=orderer2-energy.localho.st --admin-hosts=admin-orderer2-energy.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabricorderernodes.hlf.kungfusoftware.es --all
```

Check that the orderers are running:

```bash
kubectl get pods
```

```bash
openssl s_client -connect orderer0-energy.localho.st:443
openssl s_client -connect orderer1-energy.localho.st:443
openssl s_client -connect orderer2-energy.localho.st:443
```

### Step 7: Create Energy Data Channel

To create the energy data channel, we need to first create the wallet secret, which will contain the identities used by the operator to manage the channel.

#### Register and Enroll EnergyOrdererMSP Identity

```bash
# register admin
kubectl hlf ca register --name=energy-orderer-ca --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=EnergyOrdererMSP

# enroll for TLS
kubectl hlf ca enroll --name=energy-orderer-ca --namespace=default \
    --user=admin --secret=adminpw --mspid EnergyOrdererMSP \
    --ca-name tlsca --output energy-orderermsp.yaml
    
# enroll for signing
kubectl hlf ca enroll --name=energy-orderer-ca --namespace=default \
    --user=admin --secret=adminpw --mspid EnergyOrdererMSP \
    --ca-name ca --output energy-orderermspsign.yaml
```

#### Register and Enroll EnergyProviderMSP Identity

```bash
# register admin
kubectl hlf ca register --name=energy-provider-ca --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=EnergyProviderMSP

# enroll for TLS
kubectl hlf ca enroll --name=energy-provider-ca --namespace=default \
    --user=admin --secret=adminpw --mspid EnergyProviderMSP \
    --ca-name tlsca --output energy-providermsp-tlsca.yaml

# enroll for signing
kubectl hlf ca enroll --name=energy-provider-ca --namespace=default \
    --user=admin --secret=adminpw --mspid EnergyProviderMSP \
    --ca-name ca --output energy-providermsp.yaml

# create identity
kubectl hlf identity create --name energy-provider-admin --namespace default \
    --ca-name energy-provider-ca --ca-namespace default \
    --ca ca --mspid EnergyProviderMSP --enroll-id admin --enroll-secret adminpw
```

#### Create Wallet Secret

```bash
kubectl create secret generic energy-wallet --namespace=default \
        --from-file=energy-providermsp.yaml=$PWD/energy-providermsp.yaml \
        --from-file=energy-orderermsp.yaml=$PWD/energy-orderermsp.yaml \
        --from-file=energy-orderermspsign.yaml=$PWD/energy-orderermspsign.yaml
```

#### Create Energy Data Channel

```bash
export PEER_ORG_SIGN_CERT=$(kubectl get fabriccas energy-provider-ca -o=jsonpath='{.status.ca_cert}')
export PEER_ORG_TLS_CERT=$(kubectl get fabriccas energy-provider-ca -o=jsonpath='{.status.tlsca_cert}')

export IDENT_8=$(printf "%8s" "")
export ORDERER_TLS_CERT=$(kubectl get fabriccas energy-orderer-ca -o=jsonpath='{.status.tlsca_cert}' | sed -e "s/^/${IDENT_8}/" )
export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes energy-ord-node1 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )
export ORDERER1_TLS_CERT=$(kubectl get fabricorderernodes energy-ord-node2 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )
export ORDERER2_TLS_CERT=$(kubectl get fabricorderernodes energy-ord-node3 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )

envsubst < k8s/energy-channel-template.yaml | kubectl apply -f -
```

#### Join Energy Provider Peer to Channel

```bash
export IDENT_8=$(printf "%8s" "")
export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes energy-ord-node1 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )

envsubst < k8s/energy-channel-join-template.yaml | kubectl apply -f -
```

### Step 8: Install Energy Data Hash Chaincode

#### Prepare Connection String

To prepare the connection string, we need to:

1. Get connection string for EnergyProviderMSP and EnergyOrdererMSP
2. Register admin user for signing
3. Get certificates and attach to connection string

```bash
kubectl hlf inspect --output energy-network.yaml -o EnergyProviderMSP -o EnergyOrdererMSP
```

The admin user should already be registered from previous steps, but let's ensure certificates are available:

```bash
kubectl hlf ca enroll --name=energy-provider-ca --user=admin --secret=adminpw --mspid EnergyProviderMSP \
        --ca-name ca --output peer-energy-provider.yaml
```

Attach the user to the connection string:

```bash
kubectl hlf utils adduser --userPath=peer-energy-provider.yaml --config=energy-network.yaml --username=admin --mspid=EnergyProviderMSP
```

#### Build Energy Data Hash Chaincode Container

First, build your custom chaincode container and load it into KinD cluster:

```bash
cd data-hash

# Set chaincode image name and version
export CHAINCODE_IMAGE=energy-data-hash:1.0

# Build the Docker image locally
docker build -t $CHAINCODE_IMAGE .

# Verify the image was built successfully
docker images | grep energy-data-hash

# Load the image into KinD cluster (CRITICAL: Must be done to avoid ImagePullBackOff)
kind load docker-image $CHAINCODE_IMAGE --name block-of-energy-dev-cluster

# Verify the image was loaded into the cluster
docker exec -it block-of-energy-dev-cluster-control-plane crictl images | grep energy-data-hash

cd ..
```

**Important Notes:**

- The `kind load docker-image` command is REQUIRED to make the locally built image available inside the KinD cluster
- Without this step, Kubernetes will try to pull from Docker Hub and fail with "ImagePullBackOff"
- The cluster name must match the one created in Step 1 (`block-of-energy-dev-cluster`)

#### Create Chaincode Package

```bash
# Clean up any existing files
rm -f code.tar.gz chaincode.tgz

export CHAINCODE_NAME=energy-data-hash
export CHAINCODE_LABEL=energy-data-hash
cat << METADATA-EOF > "metadata.json"
{
    "type": "ccaas",
    "label": "${CHAINCODE_LABEL}"
}
METADATA-EOF
```

#### Prepare Connection File

```bash
cat > "connection.json" <<CONN_EOF
{
  "address": "${CHAINCODE_NAME}:7052",
  "dial_timeout": "10s",
  "tls_required": false
}
CONN_EOF

tar cfz code.tar.gz connection.json
tar cfz chaincode.tgz metadata.json code.tar.gz
export PACKAGE_ID=$(kubectl hlf chaincode calculatepackageid --path=chaincode.tgz --language=golang --label=$CHAINCODE_LABEL)
echo "PACKAGE_ID=$PACKAGE_ID"

kubectl hlf chaincode install --path=./chaincode.tgz \
    --config=energy-network.yaml --language=golang --label=$CHAINCODE_LABEL --user=admin --peer=energy-provider-peer0.default
```

#### Deploy Energy Chaincode Container

```bash
# Deploy the chaincode container using the local image
kubectl hlf externalchaincode sync --image=$CHAINCODE_IMAGE \
    --name=$CHAINCODE_NAME \
    --namespace=default \
    --package-id=$PACKAGE_ID \
    --tls-required=false \
    --replicas=1

# Patch the deployment to:
# 1. Add the required CORE_CHAINCODE_ID_NAME environment variable
# 2. Set imagePullPolicy to Never (to use local image only)
kubectl patch deployment $CHAINCODE_NAME -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "chaincode",
          "imagePullPolicy": "Never",
          "env": [{
            "name": "CORE_CHAINCODE_ID_NAME",
            "value": "'$PACKAGE_ID'"
          }]
        }]
      }
    }
  }
}'

# Wait for the rollout to complete
kubectl rollout status deployment/$CHAINCODE_NAME
```

**Important Notes:**

- `imagePullPolicy: Never` ensures Kubernetes uses the locally loaded image and doesn't try to pull from Docker Hub
- The `CORE_CHAINCODE_ID_NAME` environment variable is set to the package ID for proper chaincode initialization
- Always verify the pod logs after deployment to ensure the chaincode starts successfully

Check installed chaincodes:

```bash
kubectl hlf chaincode queryinstalled --config=energy-network.yaml --user=admin --peer=energy-provider-peer0.default
```

#### Approve Energy Data Hash Chaincode

```bash
export SEQUENCE=1
export VERSION="1.0"
kubectl hlf chaincode approveformyorg --config=energy-network.yaml --user=admin --peer=energy-provider-peer0.default \
    --package-id=$PACKAGE_ID \
    --version "$VERSION" --sequence "$SEQUENCE" --name=energy-data-hash \
    --policy="OR('EnergyProviderMSP.member')" --channel=energy-data-channel
```

#### Commit Energy Data Hash Chaincode

```bash
kubectl hlf chaincode commit --config=energy-network.yaml --user=admin --mspid=EnergyProviderMSP \
    --version "$VERSION" --sequence "$SEQUENCE" --name=energy-data-hash \
    --policy="OR('EnergyProviderMSP.member')" --channel=energy-data-channel
```

### Step 9: Test Energy Data Hash Chaincode

#### Store an Energy Data Hash

```bash
kubectl hlf chaincode invoke --config=energy-network.yaml \
    --user=admin --peer=energy-provider-peer0.default \
    --chaincode=energy-data-hash --channel=energy-data-channel \
    --fcn=CreateHash -a hash001 -a a1b2c3d4e5f6789012345678901234567890abcdef -a 2024-01-15T10:30:00Z -a sensor001
```

#### Query Energy Data Hash

```bash
kubectl hlf chaincode query --config=energy-network.yaml \
    --user=admin --peer=energy-provider-peer0.default \
    --chaincode=energy-data-hash --channel=energy-data-channel \
    --fcn=ReadHash -a hash001
```

#### Check if Hash Exists

```bash
kubectl hlf chaincode query --config=energy-network.yaml \
    --user=admin --peer=energy-provider-peer0.default \
    --chaincode=energy-data-hash --channel=energy-data-channel \
    --fcn=HashExists -a hash001
```
