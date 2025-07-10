import base64
import hmac
import hashlib
import urllib.parse
import requests
import json
import time
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential
from datetime import datetime, timedelta, timezone

def get_dps_config_from_keyvault(vault_url):
    """Get DPS configuration from Key Vault"""
    try:
        credential = DefaultAzureCredential()
        client = SecretClient(vault_url=vault_url, credential=credential)

        config = {
            'scope_id': client.get_secret("dps-scope-id").value,
            'primary_key': client.get_secret("dps-smart-meters-primary-key").value,
            'secondary_key': client.get_secret("dps-smart-meters-secondary-key").value,
            'group_name': client.get_secret("dps-enrollment-group-name").value
        }
        return config
    except Exception as e:
        print(f"Error reading from Key Vault: {e}")
        return None

def generate_device_key(enrollment_group_key, device_id):
    """Generate device-specific key from enrollment group key"""
    message = device_id.encode('utf-8')
    key = base64.b64decode(enrollment_group_key)
    device_key = base64.b64encode(hmac.new(key, message, hashlib.sha256).digest()).decode('utf-8')
    return device_key

def generate_dps_sas_token(scope_id, device_id, device_key, expiry_hours=24):
    """Generate SAS token for DPS registration"""
    expiry = datetime.now(timezone.utc) + timedelta(hours=expiry_hours)
    expiry_timestamp = int(expiry.timestamp())

    resource_uri = f"{scope_id}/registrations/{device_id}"
    string_to_sign = f"{resource_uri}\n{expiry_timestamp}"

    key = base64.b64decode(device_key)
    signature = base64.b64encode(
        hmac.new(key, string_to_sign.encode('utf-8'), hashlib.sha256).digest()
    ).decode('utf-8')

    sas_token = f"SharedAccessSignature sr={urllib.parse.quote(resource_uri)}&sig={urllib.parse.quote(signature)}&se={expiry_timestamp}&skn="
    return sas_token

def register_device_with_dps(scope_id, device_id, sas_token):
    """Register device with DPS and get IoT Hub assignment"""
    dps_endpoint = "global.azure-devices-provisioning.net"

    # Step 1: Initiate registration
    url = f"https://{dps_endpoint}/{scope_id}/registrations/{device_id}/register?api-version=2021-06-01"

    headers = {
        'Authorization': sas_token,
        'Content-Type': 'application/json; charset=utf-8'
    }

    payload = {
        "registrationId": device_id
    }

    print(f"Initiating DPS registration for device: {device_id}")
    response = requests.put(url, headers=headers, json=payload)

    if response.status_code != 202:
        print(f"Registration failed: {response.status_code} - {response.text}")
        return None

    # Step 2: Poll for registration status
    operation_id = response.json().get('operationId')
    if not operation_id:
        print("No operation ID received")
        return None

    status_url = f"https://{dps_endpoint}/{scope_id}/registrations/{device_id}/operations/{operation_id}?api-version=2021-06-01"

    print("Polling for registration status...")
    for attempt in range(30):  # Poll for up to 30 seconds
        time.sleep(1)
        status_response = requests.get(status_url, headers=headers)

        if status_response.status_code == 200:
            result = status_response.json()
            status = result.get('status')

            if status == 'assigned':
                print("Device successfully registered!")
                return result.get('registrationState', {})
            elif status == 'failed':
                print(f"Registration failed: {result}")
                return None
            else:
                print(f"Status: {status}, continuing to poll...")
        else:
            print(f"Status check failed: {status_response.status_code}")

    print("Registration timed out")
    return None

def generate_iot_hub_sas_token(iot_hub_hostname, device_id, device_key, expiry_hours=24):
    """Generate SAS token for IoT Hub connection"""
    expiry = datetime.now(timezone.utc) + timedelta(hours=expiry_hours)
    expiry_timestamp = int(expiry.timestamp())

    resource_uri = f"{iot_hub_hostname}/devices/{device_id}"
    string_to_sign = f"{resource_uri}\n{expiry_timestamp}"

    key = base64.b64decode(device_key)
    signature = base64.b64encode(
        hmac.new(key, string_to_sign.encode('utf-8'), hashlib.sha256).digest()
    ).decode('utf-8')

    sas_token = f"SharedAccessSignature sr={urllib.parse.quote(resource_uri)}&sig={urllib.parse.quote(signature)}&se={expiry_timestamp}"
    return sas_token

if __name__ == "__main__":
    vault_url = "https://bk-of-energy-kv-general.vault.azure.net/"
    device_id = "SmartMeter_POC_001"

    # Get DPS config from Key Vault
    dps_config = get_dps_config_from_keyvault(vault_url)
    if not dps_config:
        print("Failed to get DPS configuration from Key Vault.")
        print("Make sure you're authenticated with Azure CLI: az login")
        exit(1)

    # Generate device-specific key and DPS SAS token
    device_key = generate_device_key(dps_config['primary_key'], device_id)
    dps_sas_token = generate_dps_sas_token(dps_config['scope_id'], device_id, device_key)

    print(f"Device ID: {device_id}")
    print(f"Scope ID: {dps_config['scope_id']}")
    print(f"Device Key: {device_key}")
    print(f"DPS SAS Token: {dps_sas_token}")

    # Register device with DPS
    registration_result = register_device_with_dps(dps_config['scope_id'], device_id, dps_sas_token)

    if registration_result:
        iot_hub = registration_result.get('assignedHub')
        print(f"\nDevice assigned to IoT Hub: {iot_hub}")

        # Generate IoT Hub SAS token
        iot_hub_sas_token = generate_iot_hub_sas_token(iot_hub, device_id, device_key)

        print(f"\nTasmota MQTT Configuration Commands:")
        print(f"SetOption103 1")
        print(f"MqttHost {iot_hub}")
        print(f"MqttPort 8883")
        print(f"MqttClient {device_id}")
        print(f"MqttUser {iot_hub}/{device_id}/?api-version=2021-04-12")
        print(f"MqttPassword {iot_hub_sas_token}")
        print("SetOption3 1")
        print("Restart 1")
    else:
        print("Device registration failed. Cannot generate IoT Hub configuration.")
