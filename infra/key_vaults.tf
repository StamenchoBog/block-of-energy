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

data "azuread_service_principal" "tofu_github_oidc" {
  display_name = "tofu-github-oidc"
}

resource "azurerm_key_vault_access_policy" "kv_general_access_policy" {
  key_vault_id = azurerm_key_vault.kv_general.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azuread_service_principal.tofu_github_oidc.object_id

  certificate_permissions = [
    "Get",
    "List",
    "Create",
    "Import"
  ]

  secret_permissions = [
    "Get",
    "List",
    "Set",
    "Delete"
  ]
}

# resource "azurerm_key_vault" "kv_blockchain" {
#   name                        = "${var.prefix}-bchain-kv"
#   location                    = data.azurerm_resource_group.block_of_energy_rg.location
#   resource_group_name         = data.azurerm_resource_group.block_of_energy_rg.name
#   enabled_for_disk_encryption = true
#   tenant_id                   = data.azurerm_client_config.current.tenant_id
#   soft_delete_retention_days  = 90
#   purge_protection_enabled    = true
#
#   sku_name = "standard"
# }
#
# resource "azurerm_key_vault_access_policy" "kv_blockchain_access_policy" {
#   key_vault_id = azurerm_key_vault.kv_blockchain.id
#   tenant_id    = data.azurerm_client_config.current.tenant_id
#   object_id    = data.azurerm_client_config.current.object_id
#
#   key_permissions = [
#     "Get",
#   ]
#   secret_permissions = []
# }