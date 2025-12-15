# Local MQTT Processor

Bridges MQTT messages from the energy data simulator to MongoDB for local development.

## Prerequisites

- MongoDB running on `localhost:27017`
- Mosquitto MQTT broker running on `localhost:1883`

## Usage

```bash
cd tools/local-mqtt-processor
npm install
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MQTT_BROKER` | `mqtt://localhost:1883` | MQTT broker URL |
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection URL |
| `MONGODB_DATABASE` | `telemetry-db` | MongoDB database name |
| `MONGODB_COLLECTION` | `sensor-measurements` | MongoDB collection name |

## Data Flow

1. Subscribes to MQTT topic `tele/+/SENSOR`
2. Transforms simulator data to Tasmota ENERGY format
3. Stores in MongoDB for API consumption
