# Tofu CLI GitHub Actions Setup with Azure OIDC Authentication

## Overview

This guide helps you set up OpenTofu (Tofu) CLI in GitHub Actions with Azure using OpenID Connect (OIDC) authentication. 
This approach eliminates the need for storing long-lived secrets in your repository by using Azure's federated identity credentials.

## Manual Setup Steps

### 1. Create Azure Storage Account and Container

Before running the automated scripts, you need to manually create a storage account and container for Tofu state management:

```bash
# Set your variables
RESOURCE_GROUP_NAME="your-resource-group"
STORAGE_ACCOUNT_NAME="your-unique-storage-account-name"
CONTAINER_NAME="tfstate"
LOCATION="eastus"

# Create resource group (if it doesn't exist)
az group create --name $RESOURCE_GROUP_NAME --location $LOCATION

# Create storage account
az storage account create \
--name $STORAGE_ACCOUNT_NAME \
--resource-group $RESOURCE_GROUP_NAME \
--location $LOCATION \
--sku Standard_LRS \
--kind StorageV2

# Create storage container
az storage container create \
--name $CONTAINER_NAME \
--account-name $STORAGE_ACCOUNT_NAME
```

## Automated Setup Scripts

### Step 1: Initial Azure AD Application Setup

Run the first script to create the Azure AD application and federated credentials:

```bash
./infra/scripts/init/setup_resources_for_tofu_v1.sh
```

**What this script does:**
- Creates an Azure AD application named `tofu-github-oidc`
- Creates a service principal for the application
- Sets up federated credentials for GitHub Actions OIDC authentication
- Configures credentials for:
    - Main branch workflows
    - Renovate branch workflows
    - Pull request workflows

### Step 2: Assign Azure Permissions

Run the second script to assign necessary permissions:

```bash
./infra/scripts/init/setup_resources_for_tofu_v2.sh
```

**What this script does:**
- Assigns `Contributor` role to the application at subscription level
- Provides comprehensive summary of created resources
- Displays security warnings about broad permissions

## GitHub Repository Configuration

After running both scripts, add these secrets to your GitHub repository:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following repository secrets:

| Secret Name | Value | Description |
|-------------|--------|-------------|
| `AZURE_CLIENT_ID` | Application (Client) ID from script output | Azure AD application ID |
| `AZURE_TENANT_ID` | Tenant ID from script output | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID from script output | Azure subscription ID |

## GitHub Actions Workflow Configuration

Create a workflow file (e.g., `.github/workflows/tofu.yml`) with OIDC authentication:

```yaml
name: Tofu CI/CD

on:
push:
branches: [ main ]
pull_request:
branches: [ main ]

permissions:
id-token: write
contents: read

jobs:
tofu:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      
      - name: Setup Tofu
        uses: opentofu/setup-opentofu@v1
        
      - name: Tofu Init
        run: tofu init
        
      - name: Tofu Plan
        run: tofu plan
        
      - name: Tofu Apply
        if: github.ref == 'refs/heads/main'
        run: tofu apply -auto-approve
```

## Script Details

### setup_resources_for_tofu_v1.sh
- **Purpose**: Creates Azure AD application and federated credentials
- **Repository**: Configured for `StamenchoBog/block-of-energy`
- **Credentials**: Sets up OIDC for main branch, renovate branch, and pull requests

### setup_resources_for_tofu_v2.sh
- **Purpose**: Assigns Azure permissions to the created application
- **Role**: Assigns `Contributor` role at subscription level
- **Output**: Provides comprehensive summary of all created resources
