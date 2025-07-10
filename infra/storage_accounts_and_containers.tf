# resource "azurerm_storage_account" "data_storage_acc" {
#   name                     = "${var.prefix_without_hyphens}colddataacc"
#   resource_group_name      = data.azurerm_resource_group.block_of_energy_rg.name
#   location                 = data.azurerm_resource_group.block_of_energy_rg.location
#   account_tier             = "Standard"
#   account_replication_type = "LRS"
#   account_kind             = "StorageV2"
#   access_tier              = "Cool"
#
#   default_to_oauth_authentication = false
#
#   network_rules {
#     default_action = "Deny"
#     ip_rules       = []
#     virtual_network_subnet_ids = [
#       azurerm_subnet.subnets["snet-functions"].id,
#       azurerm_subnet.subnets["snet-storage"].id
#     ]
#   }
#
#   tags = var.common_tags
# }
#
# resource "azurerm_storage_account" "compute_storage_acc" {
#   name                     = "${var.prefix_without_hyphens}computeacc"
#   resource_group_name      = data.azurerm_resource_group.block_of_energy_rg.name
#   location                 = data.azurerm_resource_group.block_of_energy_rg.location
#   account_tier             = "Standard"
#   account_kind             = "StorageV2"
#   account_replication_type = "LRS"
#
#   # Add network rules for compute storage too
#   network_rules {
#     default_action = "Deny"
#     ip_rules       = []
#     virtual_network_subnet_ids = [
#       azurerm_subnet.subnets["snet-functions"].id,
#       azurerm_subnet.subnets["snet-storage"].id
#     ]
#   }
#
#   tags = var.common_tags
# }
#
# # Container for cold storage of energy data
# resource "azurerm_storage_container" "cold_energy_data" {
#   name                  = "cold-energy-data"
#   storage_account_id    = azurerm_storage_account.data_storage_acc.id
#   container_access_type = "private"
# }
#
# # Container for function app storage
# resource "azurerm_storage_container" "function_storage" {
#   name                  = "function-storage"
#   storage_account_id    = azurerm_storage_account.compute_storage_acc.id
#   container_access_type = "private"
# }