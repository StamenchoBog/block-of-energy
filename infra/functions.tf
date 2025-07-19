### Data

data "azurerm_iothub_shared_access_policy" "iothub_service_shared_access_policy" {
  name                = "service"
  iothub_name         = azurerm_iothub.iothub.name
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
}

### Resources
resource "azurerm_service_plan" "functions_service_plan" {
  name                = "${var.prefix}-service-plan"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  os_type             = "Linux"
  sku_name            = "Y1"
}

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
    "IOT_HUB_CONNECTION" : data.azurerm_iothub_shared_access_policy.iothub_service_shared_access_policy.primary_connection_string,
    # Service Bus configuration
    "SERVICE_BUS_CONNECTION__fullyQualifiedNamespace" : regex("^https?://([^:/]+)", azurerm_servicebus_namespace.service_bus_namespace.endpoint)[0]
    "SERVICEBUS_TOPIC_NAME" : azurerm_servicebus_topic.sb_topic.name,
  }

  tags = var.common_tags
}
