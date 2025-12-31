/**
 * Device Configuration for Energy Data Simulator
 *
 * This file defines all simulated devices with their MQTT topics,
 * energy profiles, and scheduling patterns.
 *
 * For production: Update the topics and device IDs to match your actual devices.
 */

// Tariff schedule (Macedonia EVN example)
const TARIFF_SCHEDULE = {
    // Low tariff hours (cheaper electricity)
    lowTariffHours: {
        weekday: { start: 22, end: 6 },  // 22:00 - 06:00
        weekend: { start: 0, end: 24 }    // All day on weekends
    },
    // Helper to check if current time is low tariff
    isLowTariff: (date = new Date()) => {
        const hour = date.getHours();
        const day = date.getDay();
        const isWeekend = day === 0 || day === 6;

        if (isWeekend) return true;
        return hour >= 22 || hour < 6;
    }
};

/**
 * Tasmota Device Configurations
 * Each device simulates a Tasmota smart plug monitoring an appliance
 */
const TASMOTA_DEVICES = {
    dishwasher: {
        id: 'tasmota_dishwasher_001',
        name: 'Dishwasher',
        location: 'Kitchen',
        // MQTT topic pattern - matches real Tasmota format
        mqttTopic: 'tele/tasmota_dishwasher_001/SENSOR',

        // Energy profile
        power: {
            standby: 2,           // Standby power (W)
            heating: 1800,        // Water heating phase (W)
            washing: 150,         // Main wash motor (W)
            pumping: 80,          // Drain pump (W)
            drying: 600           // Heated drying (W)
        },

        // Cycle definition (minutes for each phase)
        cycle: {
            phases: [
                { name: 'fill', duration: 3, power: 'pumping' },
                { name: 'heat', duration: 15, power: 'heating' },
                { name: 'wash', duration: 25, power: 'washing' },
                { name: 'drain', duration: 3, power: 'pumping' },
                { name: 'rinse1', duration: 10, power: 'washing' },
                { name: 'heat2', duration: 10, power: 'heating' },
                { name: 'rinse2', duration: 10, power: 'washing' },
                { name: 'drain2', duration: 3, power: 'pumping' },
                { name: 'dry', duration: 30, power: 'drying' }
            ],
            totalDuration: 109  // Total cycle time in minutes
        },

        // Schedule: runs every 2nd day, typically evening
        schedule: {
            frequencyDays: 2,
            preferredHours: [19, 20, 21],  // 7 PM - 9 PM
            randomVariationMinutes: 30
        }
    },

    waterHeater: {
        id: 'tasmota_boiler_001',
        name: 'Water Heater (Boiler)',
        location: 'Bathroom',
        mqttTopic: 'tele/tasmota_boiler_001/SENSOR',

        power: {
            standby: 1,
            heating: 2400,        // 80L boiler typical
            maintaining: 0        // Off when at temp
        },

        // Heating behavior
        heating: {
            tankSizeLiters: 80,
            heatingTimeMinutes: 90,    // Time to heat from cold
            heatLossPerHour: 0.5,      // °C per hour
            targetTemp: 60,
            hysteresis: 5              // Reheat when 5°C below target
        },

        // Schedule: heats during low tariff, every day
        schedule: {
            frequencyDays: 1,
            preferLowTariff: true,
            // Heating windows during low tariff
            heatingWindows: [
                { start: 22, end: 24 },  // Evening low tariff
                { start: 0, end: 6 }     // Night low tariff
            ]
        }
    },

    airConditioner: {
        id: 'tasmota_ac_001',
        name: 'Air Conditioner (Heating)',
        location: 'Living Room',
        mqttTopic: 'tele/tasmota_ac_001/SENSOR',

        power: {
            standby: 3,
            compressorLow: 800,      // Low heating
            compressorMid: 1500,     // Medium heating
            compressorHigh: 2400,    // High/boost heating
            fanOnly: 50              // Fan circulation only
        },

        // Inverter AC behavior (modulating power)
        behavior: {
            type: 'inverter',
            // Power modulation based on temperature difference
            modulationCurve: [
                { tempDiff: 0, powerFactor: 0.1 },    // At target
                { tempDiff: 2, powerFactor: 0.3 },
                { tempDiff: 4, powerFactor: 0.6 },
                { tempDiff: 6, powerFactor: 0.8 },
                { tempDiff: 8, powerFactor: 1.0 }     // Max heating
            ],
            cycleMinutes: 15,         // Compressor cycle time
            defrostInterval: 45,      // Defrost every 45 min in cold weather
            defrostDuration: 5        // Defrost lasts 5 min
        },

        // Schedule: runs all the time during heating season
        schedule: {
            alwaysOn: true,
            targetTemperature: 22,
            // Simulated outdoor temperature affects heating demand
            outdoorTempSimulation: {
                winterLow: -5,
                winterHigh: 10,
                dailyVariation: 8
            }
        }
    },

    washingMachine: {
        id: 'tasmota_washer_001',
        name: 'Washing Machine',
        location: 'Utility Room',
        mqttTopic: 'tele/tasmota_washer_001/SENSOR',

        power: {
            standby: 1,
            heating: 2000,        // Water heating
            washing: 500,         // Motor agitation
            spinning: 400,        // Spin cycle
            pumping: 100          // Drain pump
        },

        // Cycle phases
        cycle: {
            phases: [
                { name: 'fill', duration: 5, power: 'pumping' },
                { name: 'heat', duration: 20, power: 'heating' },
                { name: 'wash1', duration: 15, power: 'washing' },
                { name: 'drain1', duration: 3, power: 'pumping' },
                { name: 'rinse1', duration: 8, power: 'washing' },
                { name: 'spin1', duration: 5, power: 'spinning' },
                { name: 'rinse2', duration: 8, power: 'washing' },
                { name: 'spin2', duration: 3, power: 'spinning' },
                { name: 'rinse3', duration: 8, power: 'washing' },
                { name: 'finalSpin', duration: 10, power: 'spinning' }
            ],
            totalDuration: 85
        },

        // Schedule: every 2 days
        schedule: {
            frequencyDays: 2,
            preferredHours: [9, 10, 11, 17, 18],  // Morning or evening
            randomVariationMinutes: 60,
            preferLowTariff: false  // Usually runs during day
        }
    }
};

/**
 * Shelly Pro 3EM Configuration
 * Monitors whole-house energy consumption across 3 phases
 */
const SHELLY_DEVICE = {
    id: 'shellypro3em_house_001',
    name: 'Whole House Meter',
    location: 'Main Distribution Board',

    // Shelly-specific MQTT topics
    mqtt: {
        // Status topic for energy readings
        statusTopic: 'shellypro3em-house001/status/em:0',
        // Command topic for device control
        commandTopic: 'shellypro3em-house001/command',
        // RPC topic for advanced control
        rpcTopic: 'shellypro3em-house001/rpc'
    },

    // 3-phase configuration
    phases: {
        a: { name: 'Phase A', maxCurrent: 32 },
        b: { name: 'Phase B', maxCurrent: 32 },
        c: { name: 'Phase C', maxCurrent: 32 }
    },

    // Base house load (always-on devices)
    baseLoad: {
        phaseA: { min: 150, max: 300 },   // Fridge, router, etc.
        phaseB: { min: 100, max: 200 },   // Standby devices
        phaseC: { min: 80, max: 150 }     // Lights, small appliances
    },

    // Device-to-phase mapping (which devices are on which phase)
    phaseMapping: {
        dishwasher: 'a',
        waterHeater: 'b',
        airConditioner: 'c',
        washingMachine: 'a'
    }
};

/**
 * Simulation Configuration
 */
const SIMULATION_CONFIG = {
    // Timing
    publishIntervalMs: 10000,  // 10 seconds (faster for demo, use 60000 for prod)

    // MQTT Settings
    mqtt: {
        broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
        username: process.env.MQTT_USERNAME || null,
        password: process.env.MQTT_PASSWORD || null,
        clientId: process.env.MQTT_CLIENT_ID || `energy-simulator-${Date.now()}`
    },

    // Output
    saveToFile: true,
    outputDirectory: './simulation-output',

    // Blockchain integration
    enableBlockchainHashing: true,
    batchSize: 10,

    // Simulation speed (1 = realtime, 60 = 1 hour per minute)
    timeMultiplier: 1,

    // Start date for simulation (null = now)
    simulationStartDate: null
};

/**
 * Production Configuration Template
 * Copy this and update for your actual devices
 */
const PRODUCTION_TEMPLATE = {
    // Instructions for production deployment
    instructions: `
    To deploy to production:
    1. Update MQTT broker URL to your production broker
    2. Replace device IDs with actual Tasmota/Shelly device IDs
    3. Adjust MQTT topics to match your device naming convention
    4. Set environment variables for sensitive data:
       - MQTT_BROKER: Your MQTT broker URL
       - MQTT_USERNAME: Broker authentication
       - MQTT_PASSWORD: Broker password
    5. Consider using a .env file for local development
    `,

    // Example production overrides
    exampleOverrides: {
        'tasmota_dishwasher_001': 'tasmota_ABCDEF',  // Actual device ID
        'tasmota_boiler_001': 'tasmota_123456',
        'tasmota_ac_001': 'tasmota_FEDCBA',
        'tasmota_washer_001': 'tasmota_654321',
        'shellypro3em-house001': 'shellypro3em-AABBCC112233'
    }
};

module.exports = {
    TARIFF_SCHEDULE,
    TASMOTA_DEVICES,
    SHELLY_DEVICE,
    SIMULATION_CONFIG,
    PRODUCTION_TEMPLATE
};