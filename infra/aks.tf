# resource "azurerm_kubernetes_cluster" "blockchain" {
#   name                = "${var.prefix}-aks"
#   resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
#   location            = data.azurerm_resource_group.block_of_energy_rg.location
#   dns_prefix          = "${var.prefix}-aks"
#
#   default_node_pool {
#     name           = "default"
#     node_count     = 1
#     vm_size        = "Standard_B2s"
#     vnet_subnet_id = azurerm_subnet.subnets["snet-aks"].id
#   }
#
#   identity {
#     type = "SystemAssigned"
#   }
#
#   network_profile {
#     network_plugin = "azure"
#     service_cidr   = "10.1.0.0/16"
#     dns_service_ip = "10.1.0.10"
#   }
#
#   private_cluster_enabled = true
# }
