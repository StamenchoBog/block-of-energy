resource "azurerm_kusto_cluster" "adx_cluster" {
  name                = "${var.prefix}-iot"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location

  sku {
    name     = "Dev(No SLA)_Standard_D11_v2"
    capacity = 1
  }

  allowed_ip_ranges = [
    #TODO: Only IP ranges from K8s subnets
  ]

  trusted_external_tenants = [
    data.azurerm_client_config.current.tenant_id,
    var.group_tenant_id
  ]

  identity {
    type = "SystemAssigned"
  }

  auto_stop_enabled = true
  #disk_encryption_enabled = true
}

resource "azurerm_kusto_database" "adx_database" {
  name                = "${var.prefix}-iot-data"
  cluster_name        = azurerm_kusto_cluster.adx_cluster.name
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location

  hot_cache_period   = "P7D"
  soft_delete_period = "P31D"

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_kusto_database_principal_assignment" "adx_database_user_tenant_principal" {
  cluster_name  = azurerm_kusto_cluster.adx_cluster.name
  database_name = azurerm_kusto_database.adx_database.name
  name          = "UserTenantKustoPrincipalAssignment"

  tenant_id           = var.group_tenant_id
  principal_id        = var.user_object_id
  principal_type      = "User"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  role                = "Admin"
}

# TODO: Add principal assignments for all the entities that need access to ADX database
