### KV general ###
resource "azurerm_key_vault_secret" "dps_primary_key" {
  name         = "dps-primary-key"
  value        = jsondecode(azapi_resource.dps_enrollment_group.output).properties.attestation.symmetricKey.primaryKey
  key_vault_id = azurerm_key_vault.kv_general.id

  depends_on = [azapi_resource.dps_enrollment_group]
}

resource "azurerm_key_vault_secret" "dps_secondary_key" {
  name         = "dps-secondary-key"
  value        = jsondecode(azapi_resource.dps_enrollment_group.output).properties.attestation.symmetricKey.secondaryKey
  key_vault_id = azurerm_key_vault.kv_general.id

  depends_on = [azapi_resource.dps_enrollment_group]
}

resource "azurerm_key_vault_secret" "tasmota_dps_config" {
  name = "tasmota-dps-config"
  value = jsonencode({
    USE_MQTT_AZURE_DPS_SCOPEID      = azurerm_iothub_dps.iot_hub_dps.id_scope
    USE_MQTT_AZURE_DPS_PRESHAREDKEY = jsondecode(azapi_resource.dps_enrollment_group.output).properties.attestation.symmetricKey.primaryKey
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
    azapi_resource.dps_enrollment_group
  ]
}

# ### KV Blockchain ###
