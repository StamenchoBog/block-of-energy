#!/bin/sh

# Configuration
APP_DISPLAY_NAME="terraform-github-oidc"

# Error handling function
handle_error() {
    echo "ERROR: $1"
    exit 1
}

# Get application ID and verify it exists
echo "Retrieving application ID for $APP_DISPLAY_NAME..."
APP_ID=$(az ad app list --display-name "$APP_DISPLAY_NAME" --query "[0].appId" -o tsv)
if [ -z "$APP_ID" ]; then
    handle_error "Application $APP_DISPLAY_NAME not found. Please verify the app name."
fi
echo "Found application ID: $APP_ID"

# Get service principal ID
echo "Retrieving service principal ID for application..."
SP_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)
if [ -z "$SP_ID" ]; then
    handle_error "Service principal for application $APP_DISPLAY_NAME not found."
fi
echo "Found service principal ID: $SP_ID"

# Get subscription ID
echo "Getting subscription ID..."
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
if [ -z "$SUBSCRIPTION_ID" ]; then
    handle_error "Failed to retrieve subscription ID."
fi
echo "Found subscription ID: $SUBSCRIPTION_ID"

# Set subscription scope
SUBSCRIPTION_SCOPE="/subscriptions/$SUBSCRIPTION_ID"

# Check if role assignment already exists to avoid duplicates
echo "Checking if subscription-level role assignment already exists..."
EXISTING_ROLE=$(az role assignment list --assignee "$APP_ID" --scope "$SUBSCRIPTION_SCOPE" --role "Contributor" --query "[].id" -o tsv)
if [ -n "$EXISTING_ROLE" ]; then
    echo "Contributor role assignment already exists for this application at the subscription level."
else
    # Assign permissions to the application at subscription level
    echo "Assigning 'Contributor' role to the application at subscription level..."
    az role assignment create --assignee "$APP_ID" --role "Contributor" --scope "$SUBSCRIPTION_SCOPE" || \
        handle_error "Failed to assign Contributor role to the application at subscription level."
    echo "Successfully assigned role to application."
fi

# Summary with more detailed subscription information
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "✅ Operation completed"
echo "==========================================================================="
echo "  APPLICATION NAME:        $APP_DISPLAY_NAME"
echo "  APPLICATION (CLIENT) ID: $APP_ID"
echo "  SERVICE PRINCIPAL ID:    $SP_ID"
echo "  TENANT ID:               $TENANT_ID"
echo "  SUBSCRIPTION ID:         $SUBSCRIPTION_ID"
echo "  SUBSCRIPTION NAME:       $SUBSCRIPTION_NAME"
echo "==========================================================================="
echo "The application has been assigned 'Contributor' role at the subscription level."
echo "This gives it access to manage ALL resources in the subscription."
echo "==========================================================================="
echo "SECURITY NOTE: Assigning Contributor at the subscription level grants broad"
echo "permissions. Consider restricting to specific resource groups if possible."
echo "==========================================================================="