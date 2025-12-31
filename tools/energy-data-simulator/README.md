# Multi-Device Energy Simulator

Realistic energy data simulator for the Block of Energy platform. Simulates a **3-person household** with individual smart plugs and a whole-house energy meter.

## Simulated Devices

| Device | Type | MQTT Topic | Behavior |
|--------|------|------------|----------|
| Dishwasher | Tasmota Plug | `tele/tasmota_dishwasher_001/SENSOR` | Runs every 2nd day (evening) |
| Water Heater | Tasmota Plug | `tele/tasmota_boiler_001/SENSOR` | Heats during low tariff hours |
| Air Conditioner | Tasmota Plug | `tele/tasmota_ac_001/SENSOR` | Runs continuously (heating mode) |
| Washing Machine | Tasmota Plug | `tele/tasmota_washer_001/SENSOR` | Runs every 2nd day |
| Whole House | Shelly Pro 3EM | `shellypro3em-house001/status/em:0` | 3-phase total consumption |

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- MQTT broker running on `localhost:1883`

### Installation

```bash
cd tools/energy-data-simulator
npm install
```

### Run the Simulator

```bash
npm start
```

### Expected Output

```text
╔══════════════════════════════════════════════════════════════╗
║           ENERGY SIMULATOR STATUS                             ║
╠══════════════════════════════════════════════════════════════╣
║ Uptime: 0h 5m 30s | Messages:      120                        ║
╠══════════════════════════════════════════════════════════════╣
║ 🟢 Dishwasher          wash         1850W                     ║
║ ⚪ Water Heater        standby         1W                     ║
║ 🟢 Air Conditioner     heating_mid  1200W                     ║
║ ⚪ Washing Machine     standby         1W                     ║
╠══════════════════════════════════════════════════════════════╣
║ 📊 Whole House: 3450W total                                   ║
║    Phase A: 2100W | Phase B: 650W | Phase C: 700W             ║
╚══════════════════════════════════════════════════════════════╝
```

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `MQTT_BROKER` | `mqtt://localhost:1883` | MQTT broker URL |
| `PUBLISH_INTERVAL_MS` | `10000` | Time between readings (ms) |
| `TASMOTA_*_ID` | Device-specific | Tasmota device IDs |
| `SHELLY_3EM_ID` | `shellypro3em-house001` | Shelly 3EM device ID |

## Device Behaviors

### Dishwasher

- Schedule: Every 2nd day, 7-9 PM
- Cycle: ~109 min (fill → heat → wash → rinse → dry)
- Power: 80W pumping, 1800W heating, 150W washing, 600W drying

### Water Heater (Boiler)

- Schedule: Low tariff hours (22:00-06:00 weekdays, all day weekends)
- Behavior: Heats 80L tank to 60°C with heat loss simulation
- Power: 2400W when heating

### Air Conditioner

- Schedule: Continuous (heating season)
- Behavior: Inverter with power modulation based on temperature
- Power: 800-2400W, includes defrost cycles below 0°C

### Washing Machine

- Schedule: Every 2nd day, morning or evening
- Cycle: ~85 min (fill → heat → wash → rinse × 3 → spin)
- Power: 100W pump, 2000W heating, 500W wash, 400W spin

### Shelly Pro 3EM (Whole House)

- 3-phase power readings (A, B, C)
- Base load: Always-on devices (fridge, router, lights)
- Aggregates individual devices + household base load

## Message Formats

### Tasmota SENSOR Format

```json
{
  "Time": "2024-01-15 14:30:00",
  "ENERGY": {
    "Total": 125.432,
    "Today": 4.567,
    "Power": 1850,
    "Voltage": 230,
    "Current": 8.04,
    "Factor": 0.90
  }
}
```

### Shelly Pro 3EM Format

```json
{
  "a_act_power": 1850.5,
  "b_act_power": 680.3,
  "c_act_power": 620.0,
  "total_act_power": 3150.8
}
```

## Project Structure

```text
energy-data-simulator/
├── config/
│   ├── devices.js         # Device profiles & schedules
│   └── environment.js     # Environment config loader
├── simulators/
│   ├── BaseAppliance.js   # Base class for Tasmota devices
│   ├── DishwasherSimulator.js
│   ├── WaterHeaterSimulator.js
│   ├── AirConditionerSimulator.js
│   ├── WashingMachineSimulator.js
│   ├── ShellyPro3EMSimulator.js
│   └── index.js
├── multi-device-simulator.js  # Main entry point
├── .env.example
└── package.json
```

## Plug-and-Play Architecture

The simulator outputs **identical message formats** to real Tasmota and Shelly devices:

```text
DEVELOPMENT:  Simulator → MQTT → Processor → MongoDB
PRODUCTION:   Real Devices → MQTT → Processor → MongoDB
```

**To switch to real devices:** Stop the simulator, configure your devices with matching MQTT topics—no code changes needed.

## Tariff Schedule (Macedonia EVN)

| Day | Low Tariff Hours |
|-----|------------------|
| Weekdays | 22:00 - 06:00 |
| Weekends | All day |

Water heater schedules heating during low tariff periods.
