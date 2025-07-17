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

  site_config {
    application_stack {
      python_version = "3.13"
    }
    # TODO: Think if we need azure application insights
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME" : "python",
    "FUNCTIONS_EXTENSION_VERSION" : "~4",
    "WEBSITE_CONTENTOVERVNET" : "1",

    # IoT Hub and Service Bus configuration
    "IOT_HUB_NAME" : azurerm_iothub.iothub.name,
    "IOT_HUB_CONNECTION_STRING" : azurerm_iothub_shared_access_policy.iot_hub_access_policy_tofu.primary_connection_string,
    "SERVICE_BUS_QUEUE_NAME" : azurerm_servicebus_queue.sb_queue.name,
    "SERVICE_BUS_CONNECTION_STRING" : azurerm_servicebus_namespace.service_bus_namespace.default_primary_connection_string
  }

  tags = var.common_tags
}
