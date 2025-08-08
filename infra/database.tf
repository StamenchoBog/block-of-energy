resource "azurerm_cosmosdb_account" "cosmos_account" {
  name                 = "${var.prefix}-cosmos"
  location             = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name  = data.azurerm_resource_group.block_of_energy_rg.name
  offer_type           = "Standard"
  kind                 = "MongoDB"
  mongo_server_version = "7.0"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = data.azurerm_resource_group.block_of_energy_rg.location
    failover_priority = 0
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_cosmosdb_mongo_database" "cosmos_mongodb" {
  name                = "telemetry-db"
  resource_group_name = azurerm_cosmosdb_account.cosmos_account.resource_group_name
  account_name        = azurerm_cosmosdb_account.cosmos_account.name
  autoscale_settings {
    max_throughput = 1000
  }
}

resource "azurerm_cosmosdb_mongo_collection" "collection" {
  name                = "sensor-measurements"
  resource_group_name = azurerm_cosmosdb_account.cosmos_account.resource_group_name
  account_name        = azurerm_cosmosdb_account.cosmos_account.name
  database_name       = azurerm_cosmosdb_mongo_database.cosmos_mongodb.name

  default_ttl_seconds = "-1"
  shard_key           = "deviceId"
  throughput          = 400

  index {
    keys   = ["_id"]
    unique = true
  }
  index {
    keys   = ["deviceId"]
    unique = false
  }
  index {
    keys   = ["processingTimestamp"]
    unique = false
  }
  index {
    keys   = ["type"]
    unique = false
  }
}
