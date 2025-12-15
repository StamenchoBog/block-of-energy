# Forward Broker (Bridge)

## Description

This directory contains the local development infrastructure for the Block of Energy platform, including:
- **Eclipse Mosquitto**: Local MQTT broker for sensor data
- **MongoDB**: Local database (replaces Azure Cosmos DB)
- **MQTT Forwarder**: Optional bridge to Azure IoT Hub (for Azure integration)

## Local Development (No Azure Required)

### Quick Start

Start the local infrastructure (MQTT broker + MongoDB):

```bash
docker compose up -d
```

This starts:
- **Mosquitto MQTT Broker** on `localhost:1883`
- **MongoDB** on `localhost:27017`

### Verify Services

```bash
# Check running containers
docker compose ps

# View logs
docker compose logs -f mosquitto
docker compose logs -f mongodb
```

### Stop Services

```bash
docker compose down

# To also remove data volumes:
docker compose down -v
```

## Azure Integration (Optional)

If you want to forward data to Azure IoT Hub, use the `azure` profile:

### Prerequisites

Create a `.env` file with Azure credentials:

```env
AZURE_DPS_ID_SCOPE=your-id-scope
AZURE_DPS_ENROLLMENT_ID=your-enrollment-id
AZURE_DEVICE_ID=mqtt-broker-0001
AZURE_DPS_ENROLLMENT_GROUP_PRIMARY_KEY=your-primary-key
LOCAL_MQTT_USER=your-mqtt-user
LOCAL_MQTT_PASSWORD=your-mqtt-password
```

### Start with Azure Forwarder

```bash
docker compose --profile azure up -d
```

## Architecture

### Local Development
```
Energy Sensors (Simulator) -> MQTT Broker (localhost:1883) -> API -> MongoDB (localhost:27017)
```

### Azure Integration
```
Local MQTT Broker -> MQTT Forwarder -> Azure IoT Hub -> Azure Functions -> Cosmos DB
```

## Build (for Azure Forwarder only)

```bash
docker build -t mqtt-forwarder:latest ./mqtt-forwarder
```
