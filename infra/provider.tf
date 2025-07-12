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
    storage_account_name = "tfstate81286508211"
    container_name       = "tfstate"
    key                  = "tfstate-data"
    use_oidc             = true
  }
}

provider "azurerm" {
  subscription_id = "888373c5-ca31-4c58-99d8-5c45312d8561" # Personal Playground
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
