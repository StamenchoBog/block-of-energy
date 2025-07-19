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

  site_config {
    application_stack {
      python_version = "3.12"
    }
    application_insights_connection_string = azurerm_application_insights.app_insights.connection_string
    application_insights_key               = azurerm_application_insights.app_insights.instrumentation_key
  }

  app_settings = {
    # IoT Hub configuration
    "IOT_HUB_NAME" : azurerm_iothub.iothub.name,
    "IOT_HUB_CONNECTION_STRING" : format("Endpoint=%s;SharedAccessKeyName=%s;SharedAccessKey=%s;EntityPath=%s",
      azurerm_iothub.iothub.event_hub_events_endpoint,
      local.iothub_service_policy.key_name,
      local.iothub_service_policy.primary_key,
      azurerm_iothub.iothub.event_hub_events_path
    ),
    # Service Bus configuration
    "SERVICE_BUS_CONNECTION_STRING" : azurerm_servicebus_namespace.service_bus_namespace.default_primary_connection_string
    "SERVICE_BUS_TOPIC_NAME" : azurerm_servicebus_topic.sb_topic.name,
  }

  tags = var.common_tags
}
