# # Service Bus Namespace
# resource "azurerm_servicebus_namespace" "main" {
#   name                = "${var.prefix}-servicebus"
#   resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
#   location            = data.azurerm_resource_group.block_of_energy_rg.location
#   sku                 = "Basic" # Free tier equivalent
#
#   tags = var.common_tags
# }
#
# # Service Bus Queue for energy data processing
# resource "azurerm_servicebus_queue" "energy_data_queue" {
#   name         = "energy-data-queue"
#   namespace_id = azurerm_servicebus_namespace.main.id
# }
#
# # Service Bus Queue for blockchain processing
# resource "azurerm_servicebus_queue" "blockchain_queue" {
#   name         = "blockchain-queue"
#   namespace_id = azurerm_servicebus_namespace.main.id
# }
#
# # Authorization rule for functions to access queues
# resource "azurerm_servicebus_namespace_authorization_rule" "functions_access" {
#   name         = "functions-access"
#   namespace_id = azurerm_servicebus_namespace.main.id
#
#   listen = true
#   send   = true
#   manage = false
# }
