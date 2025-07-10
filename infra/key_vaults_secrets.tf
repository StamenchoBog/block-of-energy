# ### KV general ###
# resource "azurerm_key_vault_secret" "iot_hub_connection_string" {
#   key_vault_id = azurerm_key_vault.kv_general.id
#   name         = "iot-hub-connection"
#   value        = azurerm_iothub.iot_hub.event_hub_events_endpoint
# }
#
# resource "azurerm_key_vault_secret" "service_bus_connection" {
#   key_vault_id = azurerm_key_vault.kv_general.id
#   name         = "service-bus-connection"
#   value        = azurerm_servicebus_namespace.iot_namespace.default_primary_connection_string
# }
#
# ### KV Blockchain ###
