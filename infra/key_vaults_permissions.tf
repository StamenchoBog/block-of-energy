### KV General Permissions ####
### Data
data "azuread_service_principal" "tofu_github_oidc" {
  display_name = "tofu-github-oidc"
}

### Resources
resource "azurerm_key_vault_access_policy" "kv_general_own_user_access_policy" {
  key_vault_id = azurerm_key_vault.kv_general.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = "a1fc82cb-1a25-46fa-a30d-90d44064af9d"

  certificate_permissions = [
    "Get",
    "GetIssuers",
    "List",
    "ListIssuers",
    "Create",
    "Delete",
    "Import",
    "Update"
  ]

  secret_permissions = [
    "Get",
    "List",
    "Set",
    "Delete"
  ]
}

resource "azurerm_key_vault_access_policy" "kv_general_tofu_access_policy" {
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

### KV Blockchain Permissions ###