### Data
data "external" "service_event_hub_compatible_endpoint" {
  program = [
    "bash", "-c", <<-EOT
    set -e
    conn=$(az iot hub connection-string show \
      --hub-name ${azurerm_iothub.iothub.name} \
      --resource-group ${data.azurerm_resource_group.block_of_energy_rg.name} \
      --default-eventhub \
      --policy-name iothubowner \
      --query connectionString -o tsv)
    echo "{\"connectionString\": \"$${conn}\"}"
  EOT
  ]
}

### Resources
resource "azurerm_service_plan" "functions_service_plan" {
  name                = "${var.prefix}-service-plan-${random_id.project_random_id.hex}"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  os_type             = "Linux"
  sku_name            = "Y1"
}

# Function `process_iot_hub_message`
resource "azurerm_linux_function_app" "azure_function_modifier" {
  name                = "${var.prefix}-modifier-${random_id.project_random_id.hex}"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name

  storage_account_name       = azurerm_storage_account.functions_storage.name
  storage_account_access_key = azurerm_storage_account.functions_storage.primary_access_key
  service_plan_id            = azurerm_service_plan.functions_service_plan.id

  functions_extension_version = "~4"

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      python_version = "3.12"
    }
  }

  app_settings = {
    # IoT Hub configuration
    "IOT_HUB_NAME" : azurerm_iothub.iothub.name,
    "IOT_HUB_CONNECTION" : data.external.service_event_hub_compatible_endpoint.result.connectionString,
    # Service Bus configuration
    "SERVICE_BUS_CONNECTION__fullyQualifiedNamespace" : regex("^https?://([^:/]+)", azurerm_servicebus_namespace.service_bus_namespace.endpoint)[0]
    "SERVICE_BUS_TOPIC_NAME" : azurerm_servicebus_topic.sb_topic.name,
  }

  tags = var.common_tags
}

# Function `cosmo_db_writer`
resource "azurerm_linux_function_app" "azure_function_cosmodb_writer" {
  name                = "${var.prefix}-cosmodb-writer-${random_id.project_random_id.hex}"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name

  storage_account_name       = azurerm_storage_account.functions_storage.name
  storage_account_access_key = azurerm_storage_account.functions_storage.primary_access_key
  service_plan_id            = azurerm_service_plan.functions_service_plan.id

  functions_extension_version = "~4"

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      python_version = "3.12"
    }
  }

  app_settings = {
    "WEBSITE_ENABLE_SYNC_UPDATE_SITE" : "true"
    # Service Bus configuration
    "SERVICE_BUS_CONNECTION__fullyQualifiedNamespace" : regex("^https?://([^:/]+)", azurerm_servicebus_namespace.service_bus_namespace.endpoint)[0]
    "SERVICE_BUS_TOPIC_NAME" : azurerm_servicebus_topic.sb_topic.name,
    "SERVICE_BUS_SUBSCRIPTION_NAME" : azurerm_servicebus_subscription.cosmodb_db_subscription.name
    # CosmoDB configuration
    "COSMOS_DB_NAME" : azurerm_cosmosdb_mongo_database.cosmos_mongodb.name,
    "COSMOS_CONTAINER_NAME" : azurerm_cosmosdb_mongo_collection.collection.name,
    "COSMOSDB_CONNECTION" : azurerm_cosmosdb_account.cosmos_account.primary_mongodb_connection_string
  }

  tags = var.common_tags
}

# Function `hash_and_store_to_ledger`
resource "azurerm_linux_function_app" "azure_function_hash_and_store" {
  name                = "${var.prefix}-hash-and-store-${random_id.project_random_id.hex}"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name

  storage_account_name       = azurerm_storage_account.functions_storage.name
  storage_account_access_key = azurerm_storage_account.functions_storage.primary_access_key
  service_plan_id            = azurerm_service_plan.functions_service_plan.id

  functions_extension_version = "~4"

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      node_version = "18"
    }
  }

  app_settings = {
    # Service Bus configuration
    "SERVICE_BUS_CONNECTION_STRING" : azurerm_servicebus_namespace.service_bus_namespace.default_primary_connection_string,
    "SERVICE_BUS_TOPIC_NAME" : azurerm_servicebus_topic.sb_topic.name,
    "SERVICE_BUS_SUBSCRIPTION_NAME" : azurerm_servicebus_subscription.ledger_func_subscription.name,

    # Hyperledger Fabric configuration
    "FABRIC_MSP_ID" : "Org1MSP",
    "FABRIC_CHANNEL_NAME" : "hashstoragechannel",
    "FABRIC_CHAINCODE_NAME" : "hash",
    "FABRIC_GATEWAY_ENDPOINT" : var.fabric_gateway_endpoint # e.g., "peer0.org1.example.com:7051"
  }

  tags = var.common_tags
}

# Function `full_temper_auditor`
resource "azurerm_linux_function_app" "azure_function_full_temper_auditor" {
  name                = "${var.prefix}-full-temper-auditor-${random_id.project_random_id.hex}"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name

  storage_account_name       = azurerm_storage_account.functions_storage.name
  storage_account_access_key = azurerm_storage_account.functions_storage.primary_access_key
  service_plan_id            = azurerm_service_plan.functions_service_plan.id

  functions_extension_version = "~4"

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      node_version = "18"
    }
  }

  app_settings = {
    # CosmosDB configuration
    # CosmoDB configuration
    "COSMOSDB_CONNECTION" : azurerm_cosmosdb_account.cosmos_account.primary_mongodb_connection_string
    "COSMOS_DB_NAME" : azurerm_cosmosdb_mongo_database.cosmos_mongodb.name,
    "COSMOS_CONTAINER_NAME" : azurerm_cosmosdb_mongo_collection.collection.name,

    # Hyperledger Fabric configuration
    "FABRIC_MSP_ID" : "Org1MSP",
    "FABRIC_CHANNEL_NAME" : "hashstoragechannel",
    "FABRIC_CHAINCODE_NAME" : "hash",
    "FABRIC_GATEWAY_ENDPOINT" : var.fabric_gateway_endpoint,
    "FABRIC_CERT_PATH" : "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.fabric_cert_pem.id})",
    "FABRIC_KEY_PATH" : "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.fabric_key_pem.id})",
    "FABRIC_TLS_CERT_PATH" : "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.fabric_tls_cert_pem.id})",

    # State storage for durable functions
    "STATE_STORAGE_CONNECTION_STRING" : azurerm_storage_account.functions_storage.primary_connection_string,
    "STATE_STORAGE_CONTAINER_NAME" : "audit-state"
  }

  tags = var.common_tags
}

# Function `latest_ingest_temper_auditor`
resource "azurerm_linux_function_app" "azure_function_continuous_temper_auditor" {
  name                = "${var.prefix}-continuous-auditor-${random_id.project_random_id.hex}"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name

  storage_account_name       = azurerm_storage_account.functions_storage.name
  storage_account_access_key = azurerm_storage_account.functions_storage.primary_access_key
  service_plan_id            = azurerm_service_plan.functions_service_plan.id

  functions_extension_version = "~4"

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      node_version = "18"
    }
  }

  app_settings = {
    # CosmosDB configuration
    "COSMOSDB_CONNECTION" : azurerm_cosmosdb_account.cosmos_account.primary_mongodb_connection_string,
    "COSMOS_DB_NAME" : azurerm_cosmosdb_mongo_database.cosmos_mongodb.name,
    "COSMOS_CONTAINER_NAME" : azurerm_cosmosdb_mongo_collection.collection.name,

    # Hyperledger Fabric configuration
    "FABRIC_MSP_ID" : "Org1MSP",
    "FABRIC_CHANNEL_NAME" : "hashstoragechannel",
    "FABRIC_CHAINCODE_NAME" : "hash",
    "FABRIC_GATEWAY_ENDPOINT" : var.fabric_gateway_endpoint, # e.g., "peer0.org1.example.com:7051"
    "FABRIC_CERT_PATH" : "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.fabric_cert_pem.id})",
    "FABRIC_KEY_PATH" : "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.fabric_key_pem.id})",
    "FABRIC_TLS_CERT_PATH" : "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.fabric_tls_cert_pem.id})",

    # State storage for continuous auditor
    "STATE_STORAGE_CONNECTION_STRING" : azurerm_storage_account.functions_storage.primary_connection_string,
    "STATE_STORAGE_CONTAINER_NAME" : "audit-state"
  }

  tags = var.common_tags
}
