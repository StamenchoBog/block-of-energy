#!/bin/bash

# Hyperledger Fabric Energy Blockchain Bootup Script
# This script automates the complete setup of the energy blockchain network
# Based on the README.md instructions (excluding testing)

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_deps=()
    
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
    command -v kubectl >/dev/null 2>&1 || missing_deps+=("kubectl")
    command -v helm >/dev/null 2>&1 || missing_deps+=("helm")
    command -v kind >/dev/null 2>&1 || missing_deps+=("kind")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing prerequisites: ${missing_deps[*]}"
        log_error "Please install the missing tools and run the script again."
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Step 1: Create KinD Cluster
create_kind_cluster() {
    log_info "Step 1: Creating KinD cluster..."
    
    if kind get clusters | grep -q "block-of-energy-dev-cluster"; then
        log_warning "KinD cluster 'block-of-energy-dev-cluster' already exists. Skipping creation."
    else
        kind create cluster --config=./k8s/kind-config.yaml
        log_success "KinD cluster created successfully"
    fi
}

# Step 2: Install Hyperledger Fabric Operator
install_hlf_operator() {
    log_info "Step 2: Installing Hyperledger Fabric Operator..."
    
    helm repo add kfs https://kfsoftware.github.io/hlf-helm-charts --force-update
    
    if helm list | grep -q "hlf-operator"; then
        log_warning "HLF operator already installed. Skipping installation."
    else
        helm install hlf-operator --version=1.13.0 kfs/hlf-operator
        log_success "HLF operator installed successfully"
    fi
    
    # Install kubectl hlf plugin
    if ! kubectl krew list | grep -q "hlf"; then
        kubectl krew install hlf
        log_success "kubectl hlf plugin installed"
    else
        log_warning "kubectl hlf plugin already installed"
    fi
}

# Step 3: Install Istio Service Mesh
install_istio() {
    log_info "Step 3: Installing Istio Service Mesh..."
    
    # Download Istio if not already present
    if [ ! -d "istio-1.23.3" ]; then
        curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.23.3 sh -
        log_success "Istio downloaded successfully"
    else
        log_warning "Istio already downloaded. Skipping download."
    fi
    
    # Install Istio on cluster
    if ! kubectl get namespace istio-system >/dev/null 2>&1; then
        kubectl create namespace istio-system
    fi
    
    export ISTIO_PATH=$(echo $PWD/istio-*/bin)
    export PATH="$PATH:$ISTIO_PATH"
    
    # Initialize operator
    istioctl operator init
    
    # Apply gateway configuration
    kubectl apply -f k8s/istio-gateway.yaml
    
    log_success "Istio installed and configured successfully"
}

# Step 4: Set Environment Variables
set_environment_variables() {
    log_info "Step 4: Setting environment variables..."
    
    export PEER_IMAGE=hyperledger/fabric-peer
    export PEER_VERSION=3.1.0
    export ORDERER_IMAGE=hyperledger/fabric-orderer
    export ORDERER_VERSION=3.1.0
    export CA_IMAGE=hyperledger/fabric-ca
    export CA_VERSION=1.5.15
    export SC_NAME=standard
    
    # Configure internal DNS
    kubectl apply -f k8s/internal-core-dns.yaml
    
    log_success "Environment variables set and DNS configured"
}

# Step 5: Deploy Energy Provider Organization
deploy_energy_provider_org() {
    log_info "Step 5: Deploying Energy Provider Organization..."
    
    # Create Energy Provider Certificate Authority
    log_info "Creating Energy Provider CA..."
    kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$SC_NAME --capacity=1Gi --name=energy-provider-ca \
        --enroll-id=enroll --enroll-pw=enrollpw --hosts=energy-provider-ca.localho.st --istio-port=443
    
    kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
    
    # Register Energy Provider Peer User
    log_info "Registering Energy Provider Peer User..."
    kubectl hlf ca register --name=energy-provider-ca --user=peer --secret=peerpw --type=peer \
        --enroll-id enroll --enroll-secret=enrollpw --mspid EnergyProviderMSP
    
    # Deploy Energy Provider Peer
    log_info "Deploying Energy Provider Peer..."
    kubectl hlf peer create --statedb=leveldb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=$SC_NAME --enroll-id=peer --mspid=EnergyProviderMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=energy-provider-peer0 --ca-name=energy-provider-ca.default \
        --hosts=peer0-energy-provider.localho.st --istio-port=443
    
    kubectl wait --timeout=180s --for=condition=Running fabricpeers.hlf.kungfusoftware.es --all
    
    log_success "Energy Provider Organization deployed successfully"
}

# Step 6: Deploy Energy Network Orderer Organization
deploy_orderer_org() {
    log_info "Step 6: Deploying Energy Network Orderer Organization..."
    
    # Create Energy Network Orderer Certificate Authority
    log_info "Creating Energy Network Orderer CA..."
    kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$SC_NAME --capacity=1Gi --name=energy-orderer-ca \
        --enroll-id=enroll --enroll-pw=enrollpw --hosts=energy-orderer-ca.localho.st --istio-port=443
    
    kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
    
    # Register Orderer User
    log_info "Registering Orderer User..."
    kubectl hlf ca register --name=energy-orderer-ca --user=orderer --secret=ordererpw \
        --type=orderer --enroll-id enroll --enroll-secret=enrollpw --mspid=EnergyOrdererMSP --ca-url="https://energy-orderer-ca.localho.st:443"
    
    # Deploy Energy Network Orderer Nodes
    log_info "Deploying Energy Network Orderer Nodes..."
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
    
    log_success "Energy Network Orderer Organization deployed successfully"
}

# Step 7: Create Energy Data Channel
create_energy_channel() {
    log_info "Step 7: Creating Energy Data Channel..."
    
    # Register and Enroll EnergyOrdererMSP Identity
    log_info "Registering and enrolling EnergyOrdererMSP identity..."
    kubectl hlf ca register --name=energy-orderer-ca --user=admin --secret=adminpw \
        --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=EnergyOrdererMSP
    
    kubectl hlf ca enroll --name=energy-orderer-ca --namespace=default \
        --user=admin --secret=adminpw --mspid EnergyOrdererMSP \
        --ca-name tlsca --output energy-orderermsp.yaml
    
    kubectl hlf ca enroll --name=energy-orderer-ca --namespace=default \
        --user=admin --secret=adminpw --mspid EnergyOrdererMSP \
        --ca-name ca --output energy-orderermspsign.yaml
    
    # Register and Enroll EnergyProviderMSP Identity
    log_info "Registering and enrolling EnergyProviderMSP identity..."
    kubectl hlf ca register --name=energy-provider-ca --user=admin --secret=adminpw \
        --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=EnergyProviderMSP
    
    kubectl hlf ca enroll --name=energy-provider-ca --namespace=default \
        --user=admin --secret=adminpw --mspid EnergyProviderMSP \
        --ca-name tlsca --output energy-providermsp-tlsca.yaml
    
    kubectl hlf ca enroll --name=energy-provider-ca --namespace=default \
        --user=admin --secret=adminpw --mspid EnergyProviderMSP \
        --ca-name ca --output energy-providermsp.yaml
    
    kubectl hlf identity create --name energy-provider-admin --namespace default \
        --ca-name energy-provider-ca --ca-namespace default \
        --ca ca --mspid EnergyProviderMSP --enroll-id admin --enroll-secret adminpw
    
    # Create Wallet Secret
    log_info "Creating wallet secret..."
    kubectl create secret generic energy-wallet --namespace=default \
        --from-file=energy-providermsp.yaml=$PWD/energy-providermsp.yaml \
        --from-file=energy-orderermsp.yaml=$PWD/energy-orderermsp.yaml \
        --from-file=energy-orderermspsign.yaml=$PWD/energy-orderermspsign.yaml \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create Energy Data Channel
    log_info "Creating Energy Data Channel..."
    export PEER_ORG_SIGN_CERT=$(kubectl get fabriccas energy-provider-ca -o=jsonpath='{.status.ca_cert}')
    export PEER_ORG_TLS_CERT=$(kubectl get fabriccas energy-provider-ca -o=jsonpath='{.status.tlsca_cert}')
    export IDENT_8=$(printf "%8s" "")
    export ORDERER_TLS_CERT=$(kubectl get fabriccas energy-orderer-ca -o=jsonpath='{.status.tlsca_cert}' | sed -e "s/^/${IDENT_8}/" )
    export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes energy-ord-node1 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )
    export ORDERER1_TLS_CERT=$(kubectl get fabricorderernodes energy-ord-node2 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )
    export ORDERER2_TLS_CERT=$(kubectl get fabricorderernodes energy-ord-node3 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )
    
    envsubst < k8s/energy-channel-template.yaml | kubectl apply -f -
    
    # Join Energy Provider Peer to Channel
    log_info "Joining Energy Provider Peer to channel..."
    export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes energy-ord-node1 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )
    envsubst < k8s/energy-channel-join-template.yaml | kubectl apply -f -
    
    log_success "Energy Data Channel created and peer joined successfully"
}

# Step 8: Install Energy Data Hash Chaincode
install_chaincode() {
    log_info "Step 8: Installing Energy Data Hash Chaincode..."
    
    # Prepare Connection String
    log_info "Preparing connection string..."
    kubectl hlf inspect --output energy-network.yaml -o EnergyProviderMSP -o EnergyOrdererMSP
    
    kubectl hlf ca enroll --name=energy-provider-ca --user=admin --secret=adminpw --mspid EnergyProviderMSP \
        --ca-name ca --output peer-energy-provider.yaml
    
    kubectl hlf utils adduser --userPath=peer-energy-provider.yaml --config=energy-network.yaml --username=admin --mspid=EnergyProviderMSP
    
    # Build Energy Data Hash Chaincode Container
    log_info "Building and loading chaincode container..."
    cd data-hash
    
    export CHAINCODE_IMAGE=energy-data-hash:1.0
    docker build -t $CHAINCODE_IMAGE .
    
    if ! docker images | grep -q energy-data-hash; then
        log_error "Failed to build chaincode image"
        exit 1
    fi
    
    kind load docker-image $CHAINCODE_IMAGE --name block-of-energy-dev-cluster
    
    # Verify the image was loaded
    if ! docker exec -it block-of-energy-dev-cluster-control-plane crictl images | grep -q energy-data-hash; then
        log_error "Failed to load chaincode image into cluster"
        exit 1
    fi
    
    cd ..
    
    # Create Chaincode Package
    log_info "Creating chaincode package..."
    rm -f code.tar.gz chaincode.tgz metadata.json connection.json
    
    export CHAINCODE_NAME=energy-data-hash
    export CHAINCODE_LABEL=energy-data-hash
    
    cat << METADATA-EOF > "metadata.json"
{
    "type": "ccaas",
    "label": "${CHAINCODE_LABEL}"
}
METADATA-EOF
    
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
    
    log_info "Package ID: $PACKAGE_ID"
    
    kubectl hlf chaincode install --path=./chaincode.tgz \
        --config=energy-network.yaml --language=golang --label=$CHAINCODE_LABEL --user=admin --peer=energy-provider-peer0.default
    
    # Deploy Energy Chaincode Container
    log_info "Deploying chaincode container..."
    kubectl hlf externalchaincode sync --image=$CHAINCODE_IMAGE \
        --name=$CHAINCODE_NAME \
        --namespace=default \
        --package-id=$PACKAGE_ID \
        --tls-required=false \
        --replicas=1
    
    # Patch the deployment immediately to avoid ImagePullBackOff
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
    
    kubectl rollout status deployment/$CHAINCODE_NAME
    
    # Approve Energy Data Hash Chaincode
    log_info "Approving chaincode..."
    export SEQUENCE=1
    export VERSION="1.0"
    kubectl hlf chaincode approveformyorg --config=energy-network.yaml --user=admin --peer=energy-provider-peer0.default \
        --package-id=$PACKAGE_ID \
        --version "$VERSION" --sequence "$SEQUENCE" --name=energy-data-hash \
        --policy="OR('EnergyProviderMSP.member')" --channel=energy-data-channel
    
    # Commit Energy Data Hash Chaincode
    log_info "Committing chaincode..."
    kubectl hlf chaincode commit --config=energy-network.yaml --user=admin --mspid=EnergyProviderMSP \
        --version "$VERSION" --sequence "$SEQUENCE" --name=energy-data-hash \
        --policy="OR('EnergyProviderMSP.member')" --channel=energy-data-channel
    
    log_success "Energy Data Hash Chaincode installed and committed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    log_info "Checking pod status..."
    kubectl get pods
    
    log_info "Checking chaincode deployment..."
    kubectl get pods -l app=energy-data-hash
    
    log_info "Checking chaincode logs..."
    kubectl logs -l app=energy-data-hash --tail=10
    
    log_info "Querying installed chaincodes..."
    kubectl hlf chaincode queryinstalled --config=energy-network.yaml --user=admin --peer=energy-provider-peer0.default
    
    log_success "Deployment verification completed"
}

# Main function
main() {
    log_info "Starting Hyperledger Fabric Energy Blockchain Bootup"
    log_info "This script will set up the complete energy blockchain network"
    
    # Run all setup steps
    check_prerequisites
    create_kind_cluster
    install_hlf_operator
    install_istio
    set_environment_variables
    deploy_energy_provider_org
    deploy_orderer_org
    create_energy_channel
    install_chaincode
    verify_deployment
    
    log_success "🎉 Energy Blockchain Network Setup Complete!"
    log_info "The network is ready for testing. You can now run the test commands from the README.md Step 9."
    log_info "Example test command:"
    echo ""
    echo "kubectl hlf chaincode invoke --config=energy-network.yaml \\"
    echo "    --user=admin --peer=energy-provider-peer0.default \\"
    echo "    --chaincode=energy-data-hash --channel=energy-data-channel \\"
    echo "    --fcn=CreateHash -a hash001 -a a1b2c3d4e5f6789012345678901234567890abcdef -a 2024-01-15T10:30:00Z -a sensor001"
    echo ""
}

# Handle script interruption
cleanup() {
    log_warning "Script interrupted. Some resources may need manual cleanup."
    exit 1
}

trap cleanup INT

# Run main function
main "$@"