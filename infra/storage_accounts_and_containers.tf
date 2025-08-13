resource "azurerm_storage_account" "functions_storage" {
  name                     = "funcstorage${random_id.project_random_id.hex}"
  location                 = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name      = data.azurerm_resource_group.block_of_energy_rg.name
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = var.common_tags
}
