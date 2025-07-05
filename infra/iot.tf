resource "azurerm_iothub" "iot_hub" {
  name                         = "${var.prefix}-iot-hub"
  resource_group_name          = data.azurerm_resource_group.block_of_energy_rg.name
  location                     = data.azurerm_resource_group.block_of_energy_rg.location
  local_authentication_enabled = false
  event_hub_partition_count    = 2
  min_tls_version              = "1.2"

  sku {
    name     = "F1"
    capacity = "1"
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_iothub_shared_access_policy" "iot_hub_access_policy" {
  name                = "${var.prefix}-iot-hub-access-policy"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  iothub_name         = azurerm_iothub.iot_hub.name

  registry_read   = true
  registry_write  = true
  service_connect = true
  device_connect  = true
}

# This must be manually created since the connection between a IoT Hub F1 and DPS S1 is not possible via Terraform
data "azurerm_iothub_dps" "iot_hub_dps" {
  name                = "bk-of-energy-iot-hub-dps"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
}
