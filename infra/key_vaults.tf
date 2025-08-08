resource "azurerm_key_vault" "kv_general" {
  name                        = "${var.prefix}-general-kv"
  location                    = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name         = data.azurerm_resource_group.block_of_energy_rg.name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 30
  purge_protection_enabled    = true

  sku_name = "standard"

  network_acls {
    default_action = "Allow"
    bypass         = "AzureServices"
    # virtual_network_subnet_ids = [
    # azurerm_subnet.subnet["snet-functions"].id
    # ]
  }
}

resource "azurerm_key_vault" "kv_blockchain" {
  name                            = "${var.prefix}-bchain-kv"
  location                        = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name             = data.azurerm_resource_group.block_of_energy_rg.name
  tenant_id                       = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days      = 90
  purge_protection_enabled        = true
  enabled_for_disk_encryption     = true
  enabled_for_deployment          = true
  enabled_for_template_deployment = true

  sku_name = "standard"

  network_acls {
    default_action = "Allow"
    bypass         = "AzureServices"
    # virtual_network_subnet_ids = [
    # azurerm_subnet.subnet["snet-functions"].id
    # ]
  }
}

resource "azurerm_key_vault_access_policy" "kv_blockchain_access_policy" {
  key_vault_id = azurerm_key_vault.kv_blockchain.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Get",
  ]
  secret_permissions = []
}
