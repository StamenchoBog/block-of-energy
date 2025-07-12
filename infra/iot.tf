resource "azurerm_iothub" "iothub" {
  name                = "${var.prefix}-iot-hub"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location

  sku {
    name     = "F1" # Free tier
    capacity = "1"
  }

  local_authentication_enabled = true
  event_hub_partition_count    = 2
  event_hub_retention_in_days  = 1

  tags = var.common_tags
}

resource "azurerm_iothub_shared_access_policy" "iot_hub_access_policy_tofu" {
  name                = "tofu-policy"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  iothub_name         = azurerm_iothub.iothub.name

  registry_read   = true
  service_connect = true
}

resource "azurerm_iothub_dps" "iot_hub_dps" {
  name                = "${var.prefix}-iot-hub-dps"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location

  sku {
    name     = "S1"
    capacity = "1"
  }

  linked_hub {
    connection_string       = azurerm_iothub_shared_access_policy.iot_hub_access_policy_tofu.primary_connection_string
    location                = data.azurerm_resource_group.block_of_energy_rg.location
    allocation_weight       = 150
    apply_allocation_policy = true
  }

  tags = var.common_tags
}
