variable "user_tenant_id" {
  type    = string
  default = "f0cac47b-e2b3-4e1b-a52f-487d2d996288"
}

variable "prefix" {
  type    = string
  default = "bk-of-energy"
}

variable "prefix_without_hyphens" {
  type    = string
  default = "bkofenergy"
}

variable "networking" {
  type = any
  default = {
    vnet = {
      name          = "private-vnet"
      address_space = ["10.0.0.0/16"]
    }
    subnets = [
      {
        name             = "snet-aks"
        description      = "Hosts the Kubernetes nodes and pods"
        address_prefixes = ["10.0.0.0/22"]
        create           = true
        delegation       = []
      },
      {
        name             = "snet-functions"
        description      = "Dedicated subnet for VNet Integration of the internal Azure Function Apps"
        address_prefixes = ["10.0.4.0/25"]
        create           = true
        delegation = [
          {
            name = "functions-delegation"
            service_delegation = {
              name    = "Microsoft.Web/serverFarms"
              actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
            }
          }
        ]
      },
      {
        name             = "snet-private-endpoints"
        description      = "Houses the Private Endpoints for PaaS services (Azure Data Explorer, Storage Account, Key Vault, Container Registry)."
        address_prefixes = ["10.0.4.128/26"]
        create           = true
        delegation       = []
      },
      {
        name             = "snet-app-gateway"
        description      = "Hosts the Azure Application Gateway. This is the only entry point for user traffic from the internet."
        address_prefixes = ["10.0.5.0/26"]
        create           = true
        delegation       = []
      },
      {
        name             = "snet-azure-firewall"
        description      = "Hosts Azure Firewall to control all outbound traffic from your VNet to the internet."
        address_prefixes = ["10.0.6.0/26"]
        create           = true
        delegation       = []
      },
    ]
  }
}
