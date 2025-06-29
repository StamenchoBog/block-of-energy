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

  # TODO: Configure the Azure Modifier Function as endpoint and route
  #endpoint {
  #}

  #route{

  #}
}

resource "azurerm_iothub_shared_access_policy" "iot_hub_access_policy" {
  name                = "${var.prefix}-iot-hub-access-policy"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  iothub_name         = azurerm_iothub.iot_hub.name

  registry_read  = true
  registry_write = true
}

resource "azurerm_iothub_dps" "iot_hub_dps" {
  name                = "${var.prefix}-iot-hub-dps"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  allocation_policy   = "Hashed"

  sku {
    name     = "S1"
    capacity = "1"
  }

  linked_hub {
    connection_string       = azurerm_iothub_shared_access_policy.iot_hub_access_policy.primary_connection_string
    location                = azurerm_iothub.iot_hub.location
    allocation_weight       = 150
    apply_allocation_policy = true
  }
}

