resource "azurerm_virtual_network" "vnet" {
  name                = var.networking.vnet.name
  resource_group_name = data.azurerm_resource_group.block_of_energy_rg.name
  location            = data.azurerm_resource_group.block_of_energy_rg.location
  address_space       = var.networking.vnet.address_space
}

resource "azurerm_subnet" "aks_subnet" {
  for_each = {
    for p in var.networking.subnets : p.name => p if p.create
  }

  name                 = each.value.name
  resource_group_name  = data.azurerm_resource_group.block_of_energy_rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = each.value.address_prefixes

  dynamic "delegation" {
    for_each = each.value.delegation[*]

    content {
      name = delegation.value.name

      service_delegation {
        name    = delegation.value.service_delegation.name
        actions = delegation.value.service_delegation.actions
      }
    }
  }
}
