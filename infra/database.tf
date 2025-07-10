# # CosmosDB Account (Free tier)
# resource "azurerm_cosmosdb_account" "main" {
#   name                = "${var.prefix}-cosmosdb"
#   resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
#   location            = data.azurerm_resource_group.block_of_energy_rg.location
#   offer_type          = "Standard"
#   kind                = "GlobalDocumentDB"
#
#   consistency_policy {
#     consistency_level = "Session"
#   }
#
#   geo_location {
#     location          = data.azurerm_resource_group.block_of_energy_rg.location
#     failover_priority = 0
#   }
#
#   tags = var.common_tags
# }
#
# # CosmosDB Database
# resource "azurerm_cosmosdb_sql_database" "energy_monitoring" {
#   name                = "energy-monitoring"
#   resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
#   account_name        = azurerm_cosmosdb_account.main.name
#   throughput          = 400 # Minimum for free tier
# }
#
# # Container for energy consumption data (for web application)
# resource "azurerm_cosmosdb_sql_container" "energy_data" {
#   name                  = "energy-data"
#   resource_group_name   = data.azurerm_resource_group.block_of_energy_rg.name
#   account_name          = azurerm_cosmosdb_account.main.name
#   database_name         = azurerm_cosmosdb_sql_database.energy_monitoring.name
#   partition_key_version = 1
#   throughput            = 400
#
#   indexing_policy {
#     indexing_mode = "consistent"
#
#     included_path {
#       path = "/*"
#     }
#   }
#
#   partition_key_paths = ["/deviceId"]
# }