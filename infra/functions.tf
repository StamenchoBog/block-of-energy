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
  name                = "${var.prefix}-service-plan"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  os_type             = "Linux"
  sku_name            = "Y1"
}

# Function `process_iot_hub_message`
resource "azurerm_linux_function_app" "azure_function_modifier" {
  name                = "${var.prefix}-modifier"
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
  name                = "${var.prefix}-cosmodb-writer"
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
