import azure.functions as func
import logging
import json
import os

app = func.FunctionApp()

@app.event_hub_trigger(
    arg_name="event",
    event_hub_name="%IOT_HUB_NAME%",
    connection="IOT_HUB_CONNECTION_STRING",
    consumer_group="$Default",
    cardinality=func.Cardinality.MANY)
# CORRECTED: Switched from a '$return' binding to an explicit output parameter.
@app.service_bus_topic_output(
    arg_name="outputServiceBusMessage", # Use a named argument
    topic_name="%SERVICE_BUS_TOPIC_NAME%",
    connection="SERVICE_BUS_CONNECTION_STRING")
# CORRECTED: Added the output parameter to the function signature.
def ProcessIoTHubMessage(event: list[func.EventHubEvent], outputServiceBusMessage: func.Out[str]):
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

    # CORRECTED: Use the .set() method on the output parameter instead of returning.
    if processed_messages:
        outputServiceBusMessage.set(processed_messages)
        logging.info(f"Successfully sent {len(processed_messages)} messages to the Service Bus Topic.")
