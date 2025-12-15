# Block of Energy - Azure Infrastructure

This directory contains the Terraform/OpenTofu infrastructure for the energy consumption blockchain platform.

## Services Provisioned

### Core Infrastructure

- **Resource Group**: Container for all resources
- **Virtual Network**: Private network with dedicated subnets
- **Azure Kubernetes Service (AKS)**: Hosts Hyperledger Fabric blockchain
- **Azure Container Registry (ACR)**: Private container images

### Data & Storage

- **Azure IoT Hub**: Collects sensor data from energy devices
- **Azure Cosmos DB**: Fast queries for energy consumption data
- **Azure Service Bus**: Message queuing between services
- **Storage Accounts**: Function code and data storage

### Processing & Functions

- **Azure Functions**: 5 serverless functions for data processing
  - IoT Hub message processor (Python)
  - Hash and store to ledger (TypeScript)
  - Continuous tamper auditor (TypeScript)  
  - Full tamper auditor with orchestrator (TypeScript)
  - Cosmos DB writer (Python)

### Security & Monitoring

- **Azure Key Vault**: Stores secrets, certificates, and blockchain keys
- **Application Insights**: Monitoring and observability
- **Role Assignments**: RBAC permissions for services

## How to Run

### Prerequisites

- Azure subscription with Contributor access
- OpenTofu/Terraform installed
- Azure CLI installed and logged in

### Setup Steps

1. **Configure Azure authentication**:

   ```bash
   ./scripts/init/setup_resources_for_tofu_v1.sh
   ./scripts/init/setup_resources_for_tofu_v2.sh
   ```

2. **Create variables file** (`terraform.tfvars`):

   ```hcl
   prefix = "your-prefix"
   authorized_ip_ranges = ["your.ip.address"]
   
   common_tags = {
     owner = "Your Name"
     project = "block-of-energy"
   }
   ```

3. **Deploy infrastructure**:

   ```bash
   tofu init
   tofu plan
   tofu apply
   ```

4. **Clean up** (when done):

   ```bash
   tofu destroy
   ```

## Configuration

Key variables to customize:

- `prefix`: Resource naming prefix 
- `authorized_ip_ranges`: IPs allowed to access AKS
- `kubernetes_version`: AKS Kubernetes version
- `fabric_gateway_endpoint`: Blockchain gateway endpoint
