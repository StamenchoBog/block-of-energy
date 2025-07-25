resource "random_id" "acr_id" {
  byte_length = 4
}

resource "azurerm_container_registry" "acr" {
  name                = "${var.prefix_without_hyphens}${random_id.acr_id.hex}"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  sku                 = "Standard"
  admin_enabled       = true
}
