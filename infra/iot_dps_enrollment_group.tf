resource "null_resource" "dps_enrollment_group" {
  provisioner "local-exec" {
    command = <<-EOT
      az iot dps enrollment-group create \
        --dps-name ${azurerm_iothub_dps.iot_hub_dps.name} \
        --resource-group ${data.azurerm_resource_group.block_of_energy_rg.name} \
        --enrollment-id ${var.prefix}-smart-meters \
        --iot-hubs ${azurerm_iothub.iothub.hostname}
        --allocation-policy geolatency \
        --provisioning-status enabled \
        --reprovision-policy reprovisionandmigratedata
    EOT
  }

  depends_on = [azurerm_iothub_dps.iot_hub_dps]

  triggers = {
    dps_name = azurerm_iothub_dps.iot_hub_dps.name
    rg_name  = data.azurerm_resource_group.block_of_energy_rg.name
  }
}

data "external" "dps_primary_key" {
  program = ["bash", "-c", <<-EOT
    az iot dps enrollment-group show \
      --dps-name ${azurerm_iothub_dps.iot_hub_dps.name} \
      --resource-group ${data.azurerm_resource_group.block_of_energy_rg.name} \
      --enrollment-id ${var.prefix}-smart-meters \
      --show-keys \
      --query 'attestation.symmetricKey.primaryKey' \
      --output tsv | jq -R '{key: .}'
  EOT
  ]

  depends_on = [null_resource.dps_enrollment_group]
}

data "external" "dps_secondary_key" {
  program = ["bash", "-c", <<-EOT
    az iot dps enrollment-group show \
      --dps-name ${azurerm_iothub_dps.iot_hub_dps.name} \
      --resource-group ${data.azurerm_resource_group.block_of_energy_rg.name} \
      --enrollment-id ${var.prefix}-smart-meters \
      --show-keys \
      --query 'attestation.symmetricKey.secondaryKey' \
      --output tsv | jq -R '{key: .}'
  EOT
  ]

  depends_on = [null_resource.dps_enrollment_group]
}