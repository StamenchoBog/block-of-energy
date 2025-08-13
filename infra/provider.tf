terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.35"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.4"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.5"
    }
  }

  backend "azurerm" {
    resource_group_name  = "block-of-energy"
    storage_account_name = "bkpofchaintofustate"
    container_name       = "tfstate"
    key                  = "tfstate-data"
    use_oidc             = true
  }
}

provider "azurerm" {
  subscription_id = "9b6d6abe-6e6f-46b4-ba07-f92d066f88ab" # Azure for Students
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
  use_oidc = true
}

provider "azapi" {
  use_oidc = true
}
