import base64
import hashlib
import hmac
import os
import traceback
import paho.mqtt.client as mqtt
from azure.iot.device import ProvisioningDeviceClient, IoTHubDeviceClient, Message, exceptions
import queue
import threading
from datetime import datetime

# --- Environment Variables ---
ID_SCOPE = os.getenv("ID_SCOPE")
DEVICE_ID = os.getenv("DEVICE_ID")
GROUP_PRIMARY_KEY = os.getenv("GROUP_PRIMARY_KEY")
MQTT_USER = os.getenv("MQTT_USER")
MQTT_PASS = os.getenv("MQTT_PASS")

# --- MQTT Topics ---
LOCAL_SENSORS_TOPIC = "sensors/#"
message_queue = queue.Queue()

def log_message(message):
    """Prints a message with a timestamp."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    print(f"[{timestamp}] {message}", flush=True)

# --- MQTT Client Callbacks ---
def on_connect(client, userdata, flags, rc):
    """Callback for when the client connects to the local broker."""
    if rc == 0:
        log_message("Connected to local Mosquitto broker successfully.")
        client.subscribe(LOCAL_SENSORS_TOPIC)
        log_message(f"Subscribed to local topic: {LOCAL_SENSORS_TOPIC}")
    else:
        log_message(f"Failed to connect to local Mosquitto broker, return code {rc}\n")

def on_message(client, userdata, msg):
    """
    Callback for when a message is received from the local broker.
    """
    message_queue.put(msg)

# --- Azure Sender Thread ---
def azure_sender_thread(_azure_client):
    """
    A dedicated thread that pulls messages from the queue and sends them to Azure.
    This decouples receiving from sending.
    """
    log_message("Starting Azure sender thread...")
    while True:
        try:
            msg = message_queue.get()
            if msg is None:
                break

            log_message(f"Dequeued message on topic '{msg.topic}'. Forwarding to Azure...")
            if _azure_client and _azure_client.connected:
                azure_msg = Message(msg.payload)
                # Add custom properties if needed, e.g., to retain the original topic
                azure_msg.custom_properties["original-topic"] = msg.topic
                _azure_client.send_message(azure_msg)
                log_message("Successfully forwarded message to Azure IoT Hub.")

        except Exception as ex:
            log_message(f"Error in Azure sender thread: {ex}")
            traceback.print_exc()

# --- Helper function to derive the device key ---
def derive_device_key(device_id, group_symmetric_key):
    """Computes the unique device key from the group symmetric key."""
    try:
        message = device_id.encode("utf-8")
        signing_key = base64.b64decode(group_symmetric_key.encode("utf-8"))
        signed_hmac = hmac.HMAC(signing_key, message, hashlib.sha256)
        device_key_encoded = base64.b64encode(signed_hmac.digest())
        return device_key_encoded.decode("utf-8")
    except Exception as e:
        log_message(f"Error deriving device key: {e}")
        raise

# --- Main Execution ---
azure_client = None
local_client = None
sender_thread = None
try:
    # 1. Derive the unique device key from the group key
    derived_device_key = derive_device_key(DEVICE_ID, GROUP_PRIMARY_KEY)

    # 2. Use the DERIVED key to create the provisioning client
    provisioning_client = ProvisioningDeviceClient.create_from_symmetric_key(
        provisioning_host="global.azure-devices-provisioning.net",
        registration_id=DEVICE_ID,
        id_scope=ID_SCOPE,
        symmetric_key=derived_device_key,
    )

    log_message("Provisioning device with Azure DPS...")
    registration_result = provisioning_client.register()

    if registration_result.status == "assigned":
        log_message(f"Device was assigned to IoT Hub: {registration_result.registration_state.assigned_hub}")
        # 3. Use the DERIVED key again to connect to the assigned IoT Hub
        azure_client = IoTHubDeviceClient.create_from_symmetric_key(
            symmetric_key=derived_device_key,
            hostname=registration_result.registration_state.assigned_hub,
            device_id=registration_result.registration_state.device_id,
        )
        azure_client.connect()
        log_message("Successfully connected to Azure IoT Hub.")
    else:
        log_message(f"Device provisioning failed with status: {registration_result.status}")
        exit(1)

    # Set up the Paho MQTT client to connect to the local Mosquitto broker
    local_client = mqtt.Client(client_id="python-azure-bridge")
    local_client.on_connect = on_connect
    local_client.on_message = on_message

    if MQTT_USER and MQTT_PASS:
        local_client.username_pw_set(MQTT_USER, MQTT_PASS)
        log_message("Using username and password for local Mosquitto connection.")

    local_client.connect("mosquitto", 1883, 60)

    # Use loop_start() to run the client in a background thread
    local_client.loop_start()

    # Start the dedicated Azure sender thread
    sender_thread = threading.Thread(target=azure_sender_thread, args=(azure_client,), daemon=True)
    sender_thread.start()

    log_message("Bridge is running. Forwarding messages from local 'sensors/#' to Azure.")

    # Keep the main thread alive and wait for the sender thread to finish
    sender_thread.join()

except (KeyboardInterrupt, SystemExit):
    log_message("Bridge stopping...")
    raise
except exceptions.CredentialError as e:
    log_message("An error occurred: Azure Credential Error. Check your ID_SCOPE, DEVICE_ID, and GROUP_PRIMARY_KEY.")
    log_message(f"Original error: {e}")
    traceback.print_exc()
except exceptions.ConnectionFailedError as e:
    log_message("An error occurred: Azure Connection Failed. This could be a network or DNS issue.")
    log_message(f"Original error: {e}")
    traceback.print_exc()
except Exception as e:
    log_message("A general, unexpected error occurred.")
    log_message(f"Original error: {e}")
    traceback.print_exc()
finally:
    if sender_thread:
        message_queue.put(None)
        sender_thread.join()
    if azure_client and azure_client.connected:
        azure_client.disconnect()
        log_message("Disconnected from Azure IoT Hub.")
    if local_client:
        local_client.loop_stop()
        local_client.disconnect()
        log_message("Disconnected from local Mosquitto broker.")
