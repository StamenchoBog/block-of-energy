# ### KV general ###
resource "azurerm_key_vault_secret" "dps_primary_key" {
  name         = "dps-primary-key"
  value        = data.external.dps_primary_key.result.key
  key_vault_id = azurerm_key_vault.kv_general.id

  depends_on = [data.external.dps_primary_key]
}

resource "azurerm_key_vault_secret" "dps_secondary_key" {
  name         = "dps-secondary-key"
  value        = data.external.dps_secondary_key.result.key
  key_vault_id = azurerm_key_vault.kv_general.id

  depends_on = [data.external.dps_secondary_key]
}

# Updated Tasmota DPS configuration using auto-generated keys
resource "azurerm_key_vault_secret" "tasmota_dps_config" {
  name = "tasmota-dps-config"
  value = jsonencode({
    USE_MQTT_AZURE_DPS_SCOPEID      = azurerm_iothub_dps.iot_hub_dps.id_scope
    USE_MQTT_AZURE_DPS_PRESHAREDKEY = data.external.dps_primary_key.result.key
    IOT_HUB_NAME                    = azurerm_iothub.iothub.name
    DPS_GLOBAL_ENDPOINT             = "global.azure-devices-provisioning.net"
    ENROLLMENT_GROUP_ID             = "${var.prefix}-smart-meters"
    AUTH_TYPE                       = "SYMMETRIC_KEY"
    DPS_REGISTRATION_ENDPOINT       = "global.azure-devices-provisioning.net"
    DPS_PORT                        = "8883"
  })
  key_vault_id = azurerm_key_vault.kv_general.id

  depends_on = [
    azurerm_iothub_dps.iot_hub_dps,
    azurerm_iothub.iothub,
    data.external.dps_primary_key
  ]
}

# ### KV Blockchain ###
