resource "azurerm_storage_account" "queue_storage_acc" {
  name                            = "${var.prefix_without_hyphens}queueacc"
  resource_group_name             = data.azurerm_resource_group.block_of_energy_rg.name
  location                        = data.azurerm_resource_group.block_of_energy_rg.location
  allow_nested_items_to_be_public = false
  account_tier                    = "Standard"
  account_kind                    = "StorageV2"
  account_replication_type        = "LRS"
}

resource "azurerm_storage_account" "data_storage_acc" {
  name                     = "${var.prefix_without_hyphens}colddataacc"
  resource_group_name      = data.azurerm_resource_group.block_of_energy_rg.name
  location                 = data.azurerm_resource_group.block_of_energy_rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS" # Won't set it as GRS for pricing. Recommended is GRS.
  account_kind             = "StorageV2"
  access_tier              = "Cold"
}

resource "azurerm_storage_account" "compute_storage_acc" {
  name                     = "${var.prefix_without_hyphens}computeacc"
  resource_group_name      = data.azurerm_resource_group.block_of_energy_rg.name
  location                 = data.azurerm_resource_group.block_of_energy_rg.location
  account_tier             = "Standard"
  account_kind             = "StorageV2"
  account_replication_type = "LRS"
}

# TODO: Add storage container for `data_storage_acc` for data lake cold storage

