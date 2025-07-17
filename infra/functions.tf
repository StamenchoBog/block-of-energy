resource "azurerm_service_plan" "functions_service_plan" {
  name                = "${var.prefix}-service-plan"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  os_type             = "Linux"
  sku_name            = "F1"
}

resource "azurerm_linux_function_app" "azure_function_modifier" {
  name                = "${var.prefix}-modifier"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  service_plan_id     = azurerm_service_plan.functions_service_plan.id

  storage_account_name       = azurerm_storage_account.functions_storage.name
  storage_account_access_key = azurerm_storage_account.functions_storage.primary_access_key

  site_config {
    application_stack {
      python_version = "3.13"
    }
    # TODO: Think if we need azure application insights
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME" : "python",
    "AzureWebJobsStorage" : azurerm_storage_account.functions_storage.primary_connection_string,
    "IOT_HUB_CONNECTION_STRING" : azurerm_iothub_shared_access_policy.iot_hub_access_policy_tofu.primary_connection_string,
    # TODO: Add the service bus connection string
    # "SERVICE_BUS_CONNECTION_STRING": ""
  }

  tags = var.common_tags
}
