# Local MQTT Processor

Bridges MQTT messages from energy devices (simulated or real) to MongoDB for local development.

## Quick Start

```bash
cd tools/local-mqtt-processor
npm install
npm start
```

## Prerequisites

- MongoDB running on `localhost:27017`
- MQTT broker (Mosquitto) running on `localhost:1883`

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MQTT_BROKER` | `mqtt://localhost:1883` | MQTT broker URL |
| `DATABASE_URL` | `mongodb://localhost:27017` | MongoDB connection |
| `DATABASE_NAME` | `telemetry-db` | Database name |
| `DATABASE_COLLECTION` | `sensor-measurements` | Collection name |

## Supported Devices

| Device Type | MQTT Topics | Data |
|-------------|-------------|------|
| Tasmota plugs | `tele/+/SENSOR` | Power, voltage, current, energy |
| Shelly Pro 3EM | `shellypro3em-+/status/em:0` | 3-phase power readings |
| Shelly Pro 3EM | `shellypro3em-+/status/emdata:0` | Energy totals |

## Data Flow

```text
Simulator/Devices → MQTT Broker → Processor → MongoDB → API
```

## Features

- Auto-detects device type from MQTT topic
- Normalizes different device formats to common structure
- Tracks message counts and connected devices
- Graceful shutdown handling
