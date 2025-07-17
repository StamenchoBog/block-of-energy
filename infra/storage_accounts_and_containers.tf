resource "azurerm_storage_account" "functions_storage" {
  name                     = "${var.prefix_without_hyphens}funcstorage"
  location                 = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name      = data.azurerm_resource_group.block_of_energy_rg.name
  account_tier             = "Standard"
  account_replication_type = "LRS"
}


