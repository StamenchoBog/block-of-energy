resource "azurerm_storage_queue" "queue" {
  name                 = "${var.prefix}-queue"
  storage_account_name = azurerm_storage_account.queue_storage_acc.name
}
