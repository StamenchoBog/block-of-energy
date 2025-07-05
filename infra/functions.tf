resource "azurerm_service_plan" "functions" {
  name                = "${var.prefix}-functions-plan"
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "data_modifier" {
  name                       = "${var.prefix}-data-modifier"
  resource_group_name        = data.azurerm_resource_group.block_of_energy_rg.name
  location                   = data.azurerm_resource_group.block_of_energy_rg.location
  service_plan_id            = azurerm_service_plan.functions.id
  storage_account_name       = azurerm_storage_account.compute_storage_acc.name
  storage_account_access_key = azurerm_storage_account.compute_storage_acc.primary_access_key

  virtual_network_subnet_id     = azurerm_subnet.subnet["snet-functions"].id
  public_network_access_enabled = false
  https_only                    = true


  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      python_version = "3.13"
    }

    ftps_state          = "Disabled"
    http2_enabled       = true
    minimum_tls_version = "1.2"
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME" = "python"
    "AzureWebJobsFeatureFlags" = "EnableWorkerIndexing"
    "IOT_HUB_CONNECTION"       = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.kv_general.name};SecretName=iot-hub-connection)"
  }
}
