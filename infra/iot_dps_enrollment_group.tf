resource "azapi_resource" "dps_enrollment_group" {
  type      = "Microsoft.Devices/provisioningServices/enrollmentGroups@2022-02-05"
  name      = "${var.prefix}-smart-meters"
  location  = data.azurerm_resource_group.block_of_energy_rg.location
  parent_id = azurerm_iothub_dps.iot_hub_dps.id

  schema_validation_enabled = false

  body = {
    properties = {
      provisioningStatus = "enabled"
      reprovisionPolicy = {
        updateHubAssignment = true
        migrateDeviceData   = true
      }
      allocationPolicy = "geoLatency"
    }
  }

  depends_on = [azurerm_iothub_dps.iot_hub_dps]
}
