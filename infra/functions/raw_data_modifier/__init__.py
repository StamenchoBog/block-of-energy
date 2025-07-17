import logging
import json
import azure.functions as func

def main(event: list[func.EventHubEvent], outputServiceBusMessage: func.Out[str]) -> None:
    """
    Azure Function to process messages from IoT Hub and send to a Service Bus Queue.

    This function is triggered by a batch of events from an IoT Hub. It iterates
    through each event, modifies the payload, and sends the result to a Service Bus queue.
    """

    processed_messages = []

    for message in event:
        try:
            # Log the raw message details received from IoT Hub
            logging.info(f"Received message: Body: {message.get_body().decode('utf-8')}")
            logging.info(f"Enqueued time: {message.enqueued_time}")
            logging.info(f"System properties: {message.system_properties}")

            # --- 1. Extract and Parse the Message Body ---
            # The body is in bytes, so we decode it to a string and then parse the JSON
            body_dict = json.loads(message.get_body().decode('utf-8'))

            # Extract the device ID from the system properties provided by IoT Hub
            device_id = message.system_properties.get('iothub-connection-device-id')

            # --- 2. Modify the Message ---
            # This is where you add your custom business logic.
            # For this example, we'll add a new 'processed' flag, the device ID,
            # and a timestamp to the original payload.

            modified_payload = {
                "deviceId": device_id,
                "originalPayload": body_dict,
                "processingTimestamp": message.enqueued_time.isoformat(),
                "status": "processed",
                "messageSource": "AzureFunction"
            }

            # --- 3. Prepare the Message for the Service Bus ---
            # The output binding expects a string, so we serialize our modified
            # dictionary back into a JSON string.
            processed_messages.append(json.dumps(modified_payload))

            logging.info(f"Successfully processed message for device: {device_id}")

        except json.JSONDecodeError as e:
            logging.error(f"Error decoding JSON: {e}. Message body: {message.get_body().decode('utf-8')}")
        except Exception as e:
            logging.error(f"An unexpected error occurred: {e}")

    # --- 4. Send the Batch of Processed Messages ---
    # The output binding will send each string in the list as a separate message
    # to the Service Bus queue.
    if processed_messages:
        outputServiceBusMessage.set(processed_messages)
        logging.info(f"Successfully sent {len(processed_messages)} messages to the Service Bus.")

