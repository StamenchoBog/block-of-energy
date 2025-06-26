resource "azurerm_key_vault" "general_key_vault" {
  name                        = "general-key-vault"
  location                    = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name         = data.azurerm_resource_group.block_of_energy_rg.name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false

  sku_name = "standard"
}

resource "azurerm_key_vault_access_policy" "example" {
  key_vault_id = azurerm_key_vault.general_key_vault.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Get",
  ]

  secret_permissions = [
    "Get",
  ]
}

resource "azurerm_key_vault_access_policy" "application_principal" {
  key_vault_id = azurerm_key_vault.general_key_vault.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azuread_service_principal.ad_application_principal.object_id

  key_permissions = [
    "Get", "List", "Encrypt", "Decrypt"
  ]
}
