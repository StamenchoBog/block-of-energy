# Create DPS enrollment group using symmetric key authentication
resource "null_resource" "create_dps_enrollment_group_symmetric" {
  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      az iot dps enrollment-group create \
        --resource-group "$RESOURCE_GROUP" \
        --dps-name "$DPS_NAME" \
        --enrollment-id "$ENROLLMENT_ID" \
        --provisioning-status enabled \
        --reprovision-policy reprovisionandmigratedata \
        --attestation-type symmetrickey
    EOT
    environment = {
      RESOURCE_GROUP = data.azurerm_resource_group.block_of_energy_rg.name
      DPS_NAME       = azurerm_iothub_dps.iot_hub_dps.name
      ENROLLMENT_ID  = "${var.prefix}-smart-meters"
    }
  }

  depends_on = [azurerm_iothub_dps.iot_hub_dps]
}

# Retrieve the auto-generated keys after enrollment group creation
resource "null_resource" "get_dps_enrollment_keys" {
  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      # Get the enrollment group details and extract keys
      az iot dps enrollment-group show \
        --resource-group "$RESOURCE_GROUP" \
        --dps-name "$DPS_NAME" \
        --enrollment-id "$ENROLLMENT_ID" \
        --query 'attestation.symmetricKey.primaryKey' \
        --output tsv > /tmp/dps_primary_key.txt

      az iot dps enrollment-group show \
        --resource-group "$RESOURCE_GROUP" \
        --dps-name "$DPS_NAME" \
        --enrollment-id "$ENROLLMENT_ID" \
        --query 'attestation.symmetricKey.secondaryKey' \
        --output tsv > /tmp/dps_secondary_key.txt
    EOT
    environment = {
      RESOURCE_GROUP = data.azurerm_resource_group.block_of_energy_rg.name
      DPS_NAME       = azurerm_iothub_dps.iot_hub_dps.name
      ENROLLMENT_ID  = "${var.prefix}-smart-meters"
    }
  }

  depends_on = [
    null_resource.create_dps_enrollment_group_symmetric
  ]

  triggers = {
    enrollment_group_id = null_resource.create_dps_enrollment_group_symmetric.id
  }
}

# Read the generated keys using external data source
data "external" "dps_primary_key" {
  program = ["bash", "-c", "cat /tmp/dps_primary_key.txt | jq -R '{\"key\": .}'"]

  depends_on = [null_resource.get_dps_enrollment_keys]
}

data "external" "dps_secondary_key" {
  program = ["bash", "-c", "cat /tmp/dps_secondary_key.txt | jq -R '{\"key\": .}'"]

  depends_on = [null_resource.get_dps_enrollment_keys]
}
