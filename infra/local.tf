locals {
  iothub_service_policy = one([
    for policy in azurerm_iothub.iothub.shared_access_policy : policy if policy.key_name == "service"
  ])
}