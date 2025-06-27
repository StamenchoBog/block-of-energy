terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.1"
    }
  }

  backend "azurerm" {
    resource_group_name  = "block-of-energy"
    storage_account_name = "tfstate8128650821"
    container_name       = "tfstate"
    key                  = "tfstate-data"
    use_oidc             = true
  }
}

provider "azurerm" {
  subscription_id = "9b6d6abe-6e6f-46b4-ba07-f92d066f88ab" # Azure fot Students
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }

  use_oidc = true
}
