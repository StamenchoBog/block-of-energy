# resource "azurerm_key_vault_certificate" "iot_hub_cert" {
#   name         = "${var.prefix}-iot-hub-client-cert"
#   key_vault_id = azurerm_key_vault.kv_general.id
#
#   certificate_policy {
#     issuer_parameters {
#       name = "Self"
#     }
#
#     secret_properties {
#       content_type = "application/x-pem-file"
#     }
#
#     key_properties {
#       exportable = true
#       key_type   = "RSA"
#       key_size   = 4096
#       reuse_key  = false
#     }
#
#     lifetime_action {
#       action {
#         action_type = "AutoRenew"
#       }
#
#       trigger {
#         lifetime_percentage = 80
#       }
#     }
#
#     x509_certificate_properties {
#       subject            = "CN=smarthome-mosquitto-gw"
#       validity_in_months = 12
#       extended_key_usage = [
#         "1.3.6.1.5.5.7.3.2"
#       ]
#       key_usage = [
#         "digitalSignature",
#         "keyEncipherment",
#       ]
#       subject_alternative_names {
#         dns_names = []
#       }
#     }
#   }
# }