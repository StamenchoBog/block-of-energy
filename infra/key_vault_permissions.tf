### KV General Permissions ####
resource "azurerm_key_vault_access_policy" "dps" {
  key_vault_id = azurerm_key_vault.kv_general.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_iothub_dps.iot_hub_dps.id

  certificate_permissions = [
    "Get",
    "List"
  ]

  depends_on = [azurerm_iothub_dps.iot_hub_dps]
}


### KV Blockchain Permissions ###