import azure.functions as func
import logging
import json

app = func.FunctionApp()

@app.event_hub_trigger(
    arg_name="event",
    event_hub_name="%IOT_HUB_NAME%",
    connection="IOT_HUB_CONNECTION_STRING",
    consumer_group="$Default",
    cardinality=func.Cardinality.MANY)
# UPDATED: Changed from service_bus_queue_output to service_bus_topic_output
@app.service_bus_topic_output(
    name="$return",
    # UPDATED: Use topic_name instead of queue_name
    topic_name="%SERVICE_BUS_TOPIC_NAME%",
    connection="SERVICE_BUS_CONNECTION_STRING")
def ProcessIoTHubMessage(event: list[func.EventHubEvent]):
    """
    Azure Function to process messages from IoT Hub and send to a Service Bus Topic.
    """

    processed_messages = []

    for message in event:
        try:
            body_dict = json.loads(message.get_body().decode('utf-8'))
            device_id = message.system_properties.get('iothub-connection-device-id')
            sequence_number = message.sequence_number

            modified_payload = {
                "id": f"{device_id}-{sequence_number}",
                "deviceId": device_id,
                "originalPayload": body_dict,
                "processingTimestamp": message.enqueued_time.isoformat(),
                "status": "processed",
                "messageSource": "AzureFunction-IoTHubProcessor"
            }

            processed_messages.append(json.dumps(modified_payload))
            logging.info(f"Successfully processed message for device: {device_id}")

        except Exception as e:
            logging.error(f"An unexpected error occurred: {e}")

    if processed_messages:
        logging.info(f"Returning {len(processed_messages)} messages to the Service Bus Topic output binding.")
        return processed_messages
