### Function(s) role assignments

# Azure Function - Process IoTHub Message
resource "azurerm_role_assignment" "function_receives_from_iothub" {
  scope                = azurerm_iothub.iothub.id
  role_definition_name = "Azure Event Hubs Data Receiver"
  principal_id         = azurerm_linux_function_app.azure_function_modifier.identity[0].principal_id

  depends_on = [
    azurerm_linux_function_app.azure_function_modifier
  ]
}

resource "azurerm_role_assignment" "function_sends_to_servicebus" {
  scope                = azurerm_servicebus_namespace.service_bus_namespace.id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = azurerm_linux_function_app.azure_function_modifier.identity[0].principal_id

  depends_on = [
    azurerm_linux_function_app.azure_function_modifier
  ]
}

# Azure Functon - CosmoDB Writer
resource "azurerm_role_assignment" "function_reads_from_service_bus" {
  scope                = azurerm_servicebus_namespace.service_bus_namespace.id
  role_definition_name = "Azure Service Bus Data Receiver"
  principal_id         = azurerm_linux_function_app.azure_function_cosmodb_writer.identity[0].principal_id

  depends_on = [
    azurerm_linux_function_app.azure_function_cosmodb_writer
  ]
}