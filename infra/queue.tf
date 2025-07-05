resource "azurerm_storage_account" "queue_storage_acc" {
  name                     = "${var.prefix_without_hyphens}queueacc"
  resource_group_name      = data.azurerm_resource_group.block_of_energy_rg.name
  location                 = data.azurerm_resource_group.block_of_energy_rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_queue" "queue" {
  name                 = "${var.prefix}-queue"
  storage_account_name = azurerm_storage_account.queue_storage_acc.name
}
