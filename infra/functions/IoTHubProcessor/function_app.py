import azure.functions as func
import logging
import json

# This creates the Function App object that the runtime will discover.
app = func.FunctionApp()

# This is the decorator for the Service Bus output binding.
@app.service_bus_queue_output(
    arg_name="outputServiceBusMessage", # CORRECTED: The parameter is 'arg_name', not 'name'
    queue_name="%SERVICE_BUS_QUEUE_NAME%",
    connection="SERVICE_BUS_CONNECTION_STRING")
# This is the decorator for the IoT Hub trigger.
@app.event_hub_trigger(
    arg_name="event",
    event_hub_name="%IOT_HUB_NAME%",
    connection="IOT_HUB_CONNECTION_STRING",
    consumer_group="$Default",
    cardinality=func.Cardinality.MANY)
def ProcessIoTHubMessage(event: list[func.EventHubEvent], outputServiceBusMessage: func.Out[str]):
    """
    Azure Function to process messages from IoT Hub and send to a Service Bus Queue.
    This function uses the v2 programming model with decorators.
    """

    processed_messages = []

    for message in event:
        try:
            # Log the raw message details received from IoT Hub
            logging.info(f"Received message: Body: {message.get_body().decode('utf-8')}")
            logging.info(f"Enqueued time: {message.enqueued_time}")
            logging.info(f"System properties: {message.system_properties}")

            # --- 1. Extract and Parse the Message Body ---
            body_dict = json.loads(message.get_body().decode('utf-8'))

            # Extract the device ID from the system properties provided by IoT Hub
            device_id = message.system_properties.get('iothub-connection-device-id')

            # --- 2. Modify the Message ---
            modified_payload = {
                "deviceId": device_id,
                "originalPayload": body_dict,
                "processingTimestamp": message.enqueued_time.isoformat(),
                "status": "processed",
                "messageSource": "AzureFunction"
            }

            # --- 3. Prepare the Message for the Service Bus ---
            processed_messages.append(json.dumps(modified_payload))

            logging.info(f"Successfully processed message for device: {device_id}")

        except json.JSONDecodeError as e:
            logging.error(f"Error decoding JSON: {e}. Message body: {message.get_body().decode('utf-8')}")
        except Exception as e:
            logging.error(f"An unexpected error occurred: {e}")

    # --- 4. Send the Batch of Processed Messages ---
    if processed_messages:
        outputServiceBusMessage.set(processed_messages)
        logging.info(f"Successfully sent {len(processed_messages)} messages to the Service Bus.")
