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

resource "azurerm_servicebus_subscription" "ledger_func_subscription" {
  name               = "ledger-func-subscription"
  topic_id           = azurerm_servicebus_topic.sb_topic.id
  max_delivery_count = 10
}
