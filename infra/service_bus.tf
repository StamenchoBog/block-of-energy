resource "azurerm_servicebus_namespace" "service_bus_namespace" {
  name                = "${var.prefix}-sb-namespace"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  sku                 = "Standard"

  tags = var.common_tags
}

resource "azurerm_servicebus_topic" "sb_topic" {
  name         = "telemetry-topic"
  namespace_id = azurerm_servicebus_namespace.service_bus_namespace.id
}

resource "azurerm_servicebus_subscription" "cosmodb_db_subscription" {
  name               = "cosmodb-subscription"
  topic_id           = azurerm_servicebus_topic.sb_topic.id
  max_delivery_count = 10
}

resource "azurerm_role_assignment" "function_sends_to_servicebus" {
  scope                = azurerm_servicebus_namespace.service_bus_namespace.id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = azurerm_linux_function_app.azure_function_modifier.identity[0].principal_id

  depends_on = [
    azurerm_linux_function_app.azure_function_modifier
  ]
}

# TODO: Add subscription for Hashing func
