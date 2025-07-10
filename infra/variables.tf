variable "prefix" {
  type    = string
  default = "bk-of-energy"
}

variable "prefix_without_hyphens" {
  type    = string
  default = "bkofenergy"
}

variable "common_tags" {
  type = map(string)
  default = {
    owner   = "Stamencho Bogdanovski"
    project = "block-of-energy"
    course  = "Building IoT and IoT Security"
  }
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
        name              = "snet-aks"
        description       = "Hosts the Kubernetes nodes and pods for blockchain ledger"
        address_prefixes  = ["10.0.0.0/22"]
        create            = true
        service_endpoints = ["Microsoft.Storage", "Microsoft.AzureCosmosDB"]
        delegation        = []
      },
      {
        name              = "snet-functions"
        description       = "Dedicated subnet for VNet Integration of Azure Function Apps"
        address_prefixes  = ["10.0.4.0/25"]
        create            = true
        service_endpoints = ["Microsoft.KeyVault", "Microsoft.Storage", "Microsoft.ServiceBus", "Microsoft.AzureCosmosDB"]
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
        name              = "snet-iot"
        description       = "Dedicated subnet for IoT Hub service endpoints"
        address_prefixes  = ["10.0.5.0/26"]
        create            = true
        service_endpoints = []
        delegation        = []
      },
      {
        name              = "snet-databases"
        description       = "Dedicated subnet for CosmosDB service endpoints"
        address_prefixes  = ["10.0.5.64/26"]
        create            = true
        service_endpoints = ["Microsoft.AzureCosmosDB"]
        delegation        = []
      },
      {
        name              = "snet-storages"
        description       = "Dedicated subnet for Storage Accounts service endpoints"
        address_prefixes  = ["10.0.5.128/26"]
        create            = true
        service_endpoints = ["Microsoft.Storage"]
        delegation        = []
      },
      {
        name              = "snet-service-buses"
        description       = "Dedicated subnet for Service Bus service endpoints"
        address_prefixes  = ["10.0.5.192/26"]
        create            = true
        service_endpoints = ["Microsoft.ServiceBus"]
        delegation        = []
      }
    ]
  }
}
