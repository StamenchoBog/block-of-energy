resource "azurerm_iothub" "iot_hub" {
  name                         = "${var.prefix}-iot-hub"
  resource_group_name          = data.azurerm_resource_group.block_of_energy_rg.name
  location                     = data.azurerm_resource_group.block_of_energy_rg.location
  local_authentication_enabled = false
  event_hub_partition_count    = 2
  min_tls_version              = "1.2"

  sku {
    name     = "S1"
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

resource "azurerm_iothub_dps" "iot_hub_dps" {
  name                          = "${var.prefix}-iot-hub-dps"
  resource_group_name           = data.azurerm_resource_group.block_of_energy_rg.name
  location                      = data.azurerm_resource_group.block_of_energy_rg.location
  allocation_policy             = "Hashed"
  public_network_access_enabled = true

  sku {
    name     = "S1"
    capacity = "1"
  }

  linked_hub {
    connection_string       = azurerm_iothub_shared_access_policy.iot_hub_access_policy.primary_connection_string
    location                = azurerm_iothub.iot_hub.location
    allocation_weight       = 0
    apply_allocation_policy = false
  }

  depends_on = [
    azurerm_iothub.iot_hub,
    azurerm_iothub_shared_access_policy.iot_hub_access_policy
  ]
}

resource "azurerm_iothub_dps_shared_access_policy" "example" {
  name                = "${var.prefix}-iot-hub-dps-access-policy"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  iothub_dps_name     = azurerm_iothub_dps.iot_hub_dps.name

  enrollment_write = true
  enrollment_read  = true

  depends_on = [
    azurerm_iothub.iot_hub,
    azurerm_iothub_shared_access_policy.iot_hub_access_policy,
    azurerm_iothub_dps.iot_hub_dps
  ]
}

