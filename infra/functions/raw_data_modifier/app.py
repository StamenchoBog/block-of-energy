import azure.functions as func
import json
import logging
from azure.storage.queue import QueueClient
import os

app = func.FunctionApp()

@app.event_hub_message_trigger(
    arg_name="events",
    event_hub_name="iothub-ehub-block-of-energy-2628932-afcd2a6e55",  # Your IoT Hub built-in endpoint
    connection="IOT_HUB_CONNECTION"
)
@app.queue_output(
    arg_name="msg",
    queue_name="processed-data",
    connection="STORAGE_QUEUE_CONNECTION"
)
def raw_data_modifier(events: func.EventHubEvent, msg: func.Out[str]):
    logging.info('Python EventHub trigger processed an event')

    for event in events:
        try:
            # Parse the IoT message
            message_body = event.get_body().decode('utf-8')
            device_data = json.loads(message_body)

            logging.info(f"Received data from device: {device_data}")

            # Enrich the data
            enriched_data = {
                "original_data": device_data,
                "device_id": event.metadata.get("iothub-connection-device-id"),
                "timestamp": event.metadata.get("iothub-enqueuedtime"),
                "enriched_at": func.datetime.utcnow().isoformat(),
                "temperature": device_data.get("temperature"),
                "humidity": device_data.get("humidity"),
                "device_status": "active"
            }

            # Send to queue for further processing
            # msg.set(json.dumps(enriched_data))

            logging.info(f"Enriched data sent to queue: {enriched_data}")

        except Exception as e:
            logging.error(f"Error processing event: {str(e)}")
