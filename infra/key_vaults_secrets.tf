### KV general ###
resource "azurerm_key_vault_secret" "iot_hub_connection_string" {
  key_vault_id = azurerm_key_vault.kv_general.id
  name         = "iot-hub-connection"
  value        = azurerm_iothub.iot_hub.event_hub_events_endpoint
}

### KV Blockchain ###
