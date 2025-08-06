import os
import json
import logging
import certifi
from pymongo import MongoClient

import azure.functions as func

# MongoDB credentials and parameters
mongo_connection_string = os.getenv("COSMOSDB_CONNECTION")
mongo_db_name = os.getenv("COSMOS_DB_NAME")
mongo_container_name = os.getenv("COSMOS_CONTAINER_NAME")

# MongoDB client
mongo_client = MongoClient(mongo_connection_string, tlsCAFile=certifi.where())
mongo_db = mongo_client[mongo_db_name]
mongo_collection = mongo_db[mongo_container_name]

app = func.FunctionApp()

@app.function_name(name="process_service_bus_to_cosmosdb")
@app.service_bus_topic_trigger(
    arg_name="msg",
    topic_name="%SERVICE_BUS_TOPIC_NAME%",
    subscription_name="%SERVICE_BUS_SUBSCRIPTION_NAME%",
    connection="SERVICE_BUS_CONNECTION"
)
def process_service_bus_to_cosmosdb(msg: func.ServiceBusMessage) -> None:
    try:
        raw_payload = json.loads(msg.get_body().decode("utf-8"))
        logging.info(f"Received message: {raw_payload}")

        device_id = raw_payload.get("deviceId")
        sequence_id = raw_payload.get("id")
        processing_timestamp = raw_payload.get("processingTimestamp")
        original_payload = raw_payload.get("originalPayload", {})

        document = {
            "_id": f"{sequence_id}",
            "deviceId": device_id,
            "payload": original_payload,
            "processingTimestamp": processing_timestamp,
            "cosmosInsertTimestamp": msg.enqueued_time_utc.isoformat(),
            "status": raw_payload.get("status", "processed")
        }

        mongo_collection.insert_one(document)
        logging.info(f"Successfully inserted document into MongoDB for device {device_id}")

    except Exception as e:
        logging.error(f"Failed to process and store message in Cosmos DB MongoDB API: {e}")
