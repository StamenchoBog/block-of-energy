resource "azurerm_log_analytics_workspace" "app_insights_workspace" {
  name                = "${var.prefix}-log-workspace"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_application_insights" "app_insights" {
  name                = "${var.prefix}-app-insights"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  # Link to the Log Analytics Workspace created above
  workspace_id     = azurerm_log_analytics_workspace.app_insights_workspace.id
  application_type = "web"
  # COST SAVING: Set a daily data cap to prevent unexpected costs.
  daily_data_cap_in_gb = 1
}
