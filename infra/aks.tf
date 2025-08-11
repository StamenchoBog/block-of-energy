resource "azurerm_kubernetes_cluster" "aks" {
  name                = "blockchain-aks"
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  dns_prefix          = var.prefix

  kubernetes_version = "1.33"
  #  key_vault_secrets_provider {
  #
  # }

  default_node_pool {
    name                        = "default"
    node_count                  = 2
    vm_size                     = "Standard_B2s_v2"
    os_sku                      = "Ubuntu"
    temporary_name_for_rotation = "defaultold"
    vnet_subnet_id              = azurerm_subnet.subnets["snet-aks"].id
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
    network_policy = "azure"
    dns_service_ip = "10.240.0.10"
    service_cidr   = "10.240.0.0/16"
  }
}
