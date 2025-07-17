resource "azurerm_servicebus_namespace" "service_bus_namespace" {
  name                = "${var.prefix}-sb-namespace"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  sku                 = "Standard"
}

resource "azurerm_servicebus_queue" "sb_queue" {
  name         = "processed-telemetry-queue"
  namespace_id = azurerm_servicebus_namespace.service_bus_namespace.id
}

