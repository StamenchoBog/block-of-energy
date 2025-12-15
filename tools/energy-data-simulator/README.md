# Enhanced Energy Data Simulator

Advanced energy data simulator for the Block of Energy platform with realistic patterns and blockchain integration.

## Features

- **Multi-Device Simulation**: Simulates consumption, production, storage, and transmission devices
- **Realistic Patterns**: Time-of-day, seasonal, weather, and demand response patterns
- **Blockchain Integration**: Generates hashes for blockchain verification
- **Azure IoT Hub Support**: Direct integration with Azure IoT Hub
- **Batch Processing**: Optimized for high-throughput scenarios

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- MQTT broker (local or cloud)

### Installation

```bash
npm install
```

### Basic Usage

```bash
# Start with default configuration (local MQTT)
npm start

# Or run directly
node enhanced-simulator.js
```

### Azure IoT Hub Integration

```bash
# Set Azure IoT Hub connection string
export AZURE_IOT_CONNECTION_STRING="HostName=your-iothub.azure-devices.net;DeviceId=your-device;SharedAccessKey=your-key"

# Run simulator
npm start
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MQTT_BROKER` | MQTT broker URL | `mqtt://localhost:1883` |
| `MQTT_TOPIC` | Base MQTT topic | `tele/tasmota_monitor_000001/SENSOR` |
| `AZURE_IOT_CONNECTION_STRING` | Azure IoT Hub connection | None |

### Device Configuration

Edit the `CONFIG.devices` array in `enhanced-simulator.js`:

```javascript
devices: [
    { id: 'sensor001', location: 'Main Building', type: 'consumption' },
    { id: 'sensor002', location: 'Solar Panels', type: 'production' },
    { id: 'sensor003', location: 'Battery Storage', type: 'storage' },
    { id: 'sensor004', location: 'Grid Connection', type: 'transmission' }
]
```

## Simulation Patterns

### Energy Types

- **Consumption**: Residential/commercial usage patterns
- **Production**: Solar/wind generation patterns
- **Storage**: Battery charge/discharge patterns
- **Transmission**: Grid distribution patterns

### Pattern Factors

1. **Time-of-Day**: Peak usage during morning and evening
2. **Seasonal**: Higher consumption in winter, higher production in summer
3. **Weather**: Cloud cover affects solar production
4. **Weekend**: Different patterns on weekends
5. **Demand Response**: Smart grid response patterns

## Output

### Message Structure

```json
{
  "deviceId": "sensor001",
  "deviceType": "consumption",
  "location": "Main Building",
  "timestamp": "2024-01-15T10:30:00Z",
  "energy": {
    "power": 450,
    "voltage": 230,
    "current": 2.087,
    "powerFactor": 0.94,
    "frequency": 50.0,
    "apparentPower": 479,
    "reactivePower": 164
  },
  "status": {
    "uptime": 86400,
    "signalStrength": -52,
    "batteryLevel": null,
    "temperature": 22.5,
    "humidity": 45.2
  }
}
```

### Blockchain Hash Records

```json
{
  "id": "sensor001-1705320600000",
  "hashValue": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "timestamp": "2024-01-15T10:30:00Z",
  "deviceID": "sensor001",
  "dataType": "consumption"
}
```

## Integration with Block of Energy

### With Local Blockchain

1. Start the simulator
2. Messages are automatically hashed for blockchain storage
3. Use `../verify-hash/verify-hash.js` to verify message integrity

### With Azure Production

1. Set Azure IoT connection string
2. Deploy to Azure Container Instances or VM
3. Integrate with Azure Functions for processing

## Monitoring

The simulator outputs:
- Real-time device readings
- Batch processing status
- MQTT connection status
- File output locations

## Troubleshooting

### MQTT Connection Issues

```bash
# Test MQTT connectivity
mosquitto_pub -h localhost -p 1883 -t test/topic -m "test message"
```

### Azure IoT Hub Issues

```bash
# Verify connection string format
echo $AZURE_IOT_CONNECTION_STRING
```

## Advanced Usage

### Custom Energy Patterns

Extend the `EnergyPatternGenerator` class to add custom patterns:

```javascript
getCustomPattern(timestamp) {
    // Your custom logic here
    return customFactor;
}
```

### Integration with External APIs

Add weather data, market prices, or other external factors:

```javascript
async getWeatherData() {
    // Fetch real weather data
    const response = await fetch('weather-api-url');
    return await response.json();
}
```