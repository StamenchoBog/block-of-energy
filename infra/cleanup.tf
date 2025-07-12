resource "null_resource" "cleanup_dps_enrollment_group" {
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      az iot dps enrollment-group delete \
        --resource-group "$RESOURCE_GROUP" \
        --dps-name "$DPS_NAME" \
        --enrollment-id "$ENROLLMENT_ID" \
        --yes || true

      # Clean up temporary files
      rm -f /tmp/dps_primary_key.txt /tmp/dps_secondary_key.txt || true
    EOT
    environment = {
      RESOURCE_GROUP = self.triggers.resource_group
      DPS_NAME       = self.triggers.dps_name
      ENROLLMENT_ID  = self.triggers.enrollment_id
    }
  }

  triggers = {
    resource_group = data.azurerm_resource_group.block_of_energy_rg.name
    dps_name       = azurerm_iothub_dps.iot_hub_dps.name
    enrollment_id  = "${var.prefix}-smart-meters"
  }

  depends_on = [null_resource.create_dps_enrollment_group_symmetric]
}
