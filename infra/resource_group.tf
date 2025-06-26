data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "block_of_energy_rg" {
  name = "block-of-energy"
}
