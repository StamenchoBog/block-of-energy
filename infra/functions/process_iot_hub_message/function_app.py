import json
import logging
import azure.functions as func

app = func.FunctionApp()

@app.function_name(name="process_iot_hub_message")
@app.event_hub_message_trigger(
    arg_name="event",
    event_hub_name="%IOT_HUB_NAME%",
    connection="IOT_HUB_CONNECTION"
)
@app.service_bus_topic_output(
    arg_name="output",
    topic_name="%SERVICE_BUS_TOPIC_NAME%",
    connection="SERVICE_BUS_CONNECTION")
def process_iot_hub_message(event: func.EventHubEvent, output: func.Out[str]) -> None:
    try:
        body_dict = json.loads(event.get_body().decode('utf-8'))
        device_id = event.metadata['SystemProperties'].get('iothub-connection-device-id')
        sequence_number = event.sequence_number

        modified_payload = {
            "id": f"{device_id}-{sequence_number}",
            "deviceId": device_id,
            "originalPayload": body_dict,
            "processingTimestamp": event.enqueued_time.isoformat(),
            "status": "processed",
            "messageSource": "AzureFunction-IoTHubProcessor"
        }

        output.set(json.dumps(modified_payload))

        logging.info(f"Processed message from device: {device_id}")

    except Exception as e:
        logging.error(f"Failed to process message: {e}")
