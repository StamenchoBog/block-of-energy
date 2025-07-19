import azure.functions as func
import logging

app = func.FunctionApp()

@app.service_bus_queue_trigger(
    arg_name="msg",
    queue_name="%SERVICE_BUS_QUEUE_NAME%",
    connection="SERVICE_BUS_CONNECTION_STRING")
@app.cosmos_db_output(
    name="$return",
    database_name="TelemetryDB",
    container_name="SensorReadings",
    connection="COSMOS_DB_CONNECTION_STRING")
def ServiceBusToCosmosDB(msg: func.ServiceBusMessage):
    """
    Azure Function triggered by a Service Bus message, writing it to Cosmos DB.
    """

    message_content = msg.get_body().decode('utf-8')
    logging.info(f'Python ServiceBus queue trigger function processed message: {message_content}')

    # The output binding expects the data to be returned.
    # It will automatically parse the JSON string and write it as a document.
    return message_content
