resource "azurerm_virtual_network" "example" {
  name                = "private-network"
  resource_group_name = azurerm_resource_group.block_of_energy_rg.name
  location            = azurerm_resource_group.block_of_energy_rg.location
  address_space       = ["10.0.0.0/16"]
}
