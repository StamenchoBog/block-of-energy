resource "azurerm_virtual_network" "vnet" {
  name                = var.networking.vnet.name
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  address_space       = var.networking.vnet.address_space
}

resource "azurerm_subnet" "subnets" {
  for_each = {
    for p in var.networking.subnets : p.name => p if p.create
  }

  name                 = each.value.name
  resource_group_name  = data.azurerm_resource_group.block_of_energy_rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = each.value.address_prefixes

  service_endpoints = each.value.service_endpoints

  dynamic "delegation" {
    for_each = each.value.delegation

    content {
      name = delegation.value.name

      service_delegation {
        name    = delegation.value.service_delegation.name
        actions = delegation.value.service_delegation.actions
      }
    }
  }
}

# # NSG for Functions
# resource "azurerm_network_security_group" "functions_nsg" {
#   name                = "${var.prefix}-functions-nsg"
#   location            = data.azurerm_resource_group.block_of_energy_rg.location
#   resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
#
#   security_rule {
#     name                       = "AllowHTTPS"
#     priority                   = 1001
#     direction                  = "Inbound"
#     access                     = "Allow"
#     protocol                   = "Tcp"
#     source_port_range          = "*"
#     destination_port_range     = "443"
#     source_address_prefix      = "*"
#     destination_address_prefix = "*"
#   }
#
#   security_rule {
#     name                       = "AllowServiceEndpoints"
#     priority                   = 1003
#     direction                  = "Outbound"
#     access                     = "Allow"
#     protocol                   = "Tcp"
#     source_port_range          = "*"
#     destination_port_ranges    = ["443", "1433", "5671", "5672"]
#     source_address_prefix      = "*"
#     destination_service_tag    = "AzureCloud"
#   }
#
#   tags = var.common_tags
# }

# # NSG for other PaaS services
# resource "azurerm_network_security_group" "paas_nsg" {
#   name                = "${var.prefix}-paas-nsg"
#   location            = data.azurerm_resource_group.block_of_energy_rg.location
#   resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
#
#   security_rule {
#     name                       = "AllowServiceEndpoints"
#     priority                   = 1001
#     direction                  = "Outbound"
#     access                     = "Allow"
#     protocol                   = "Tcp"
#     source_port_range          = "*"
#     destination_port_range     = "443"
#     source_address_prefix      = "*"
#     destination_service_tag    = "AzureCloud"
#   }
#
#   tags = var.common_tags
# }
