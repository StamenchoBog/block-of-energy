resource "azurerm_virtual_network" "vnet" {
  name                = "private-vnet"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  address_space       = ["10.0.0.0/16"]
}
