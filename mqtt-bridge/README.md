# Forward Broker (Bridge)

## Description

In order to forward the message(s) from a locally deployed MQTT broker (ex. Eclipse Mosquitto) to an Azure IoT Hub, a
separate "forwarder" or service is required to bridge the two.
Good thing about a forwarder is that it could be deployed and connect any locally deployed MQTT broker with Azure IoT Hub
which abstracts the complexity of managing each local MQTT broker separately.

## Architecture

```
Local MQTT Broker -> MQTT Forwarder -> Azure IoT Hub
```

## Build

TO build the image for the Forwarder just run:
```bash
docker build -t mqtt-forwarder:latest .
```

## Development

In order to test the development of the Forwarder service, there is a mock Mosquitto container that will
run with the Forwarder in the `docker-compose.yaml` file.

### Prerequisites

- Docker and Docker Compose
- Azure IoT Hub configured with DPS
- Python 3.11+ (for local development)

### Quick Start

1. Put the needed environment variables for development in a `.env` file located in the `mqtt-bridge` folder: 
   - `AZURE_DPS_ID_SCOPE` - The ID scope of the IoT Hub DPS (Device Provisioning Service) provisioned in Azure.
   - `AZURE_DPS_ENROLLMENT_ID` - The enrollment ID of the enrollment group created in the IoT Hub DPS.
   - `AZURE_DEVICE_ID` - The device ID (name) under which the newly registered device will be seen in IoT Hub. Example: `mqtt-broker-0001`.
   - `AZURE_DPS_ENROLLMENT_GROUP_PRIMARY_KEY` - The Primary Key used for authentication against the DPS service.
   - `LOCAL_MQTT_USER` - The username configured on the local MQTT broker.
   - `LOCAL_MQTT_PASSWORD` - The password configured on the local MQTT broker.

2. Start the bridge services:

```bash
docker compose up -d
```

3. View logs of containers

```bash
docker compose logs -f mqtt-forwarder 
docker compose logs -f mosquitto
```
