/**
 * Environment Configuration Loader
 *
 * Loads configuration from environment variables with sensible defaults.
 * For production, create a .env file based on .env.example
 */

// Load .env file if it exists (for local development)
try {
    require('dotenv').config();
} catch {
    // dotenv not installed, use process.env directly
}

const environment = {
    // Runtime mode
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',

    // MQTT Configuration
    mqtt: {
        broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
        username: process.env.MQTT_USERNAME || null,
        password: process.env.MQTT_PASSWORD || null,
        clientId: process.env.MQTT_CLIENT_ID || `energy-simulator-${Date.now()}`
    },

    // Timing
    publishIntervalMs: parseInt(process.env.PUBLISH_INTERVAL_MS, 10) || 10000,
    timeMultiplier: parseInt(process.env.TIME_MULTIPLIER, 10) || 1,
    statusDisplayIntervalMs: parseInt(process.env.STATUS_DISPLAY_INTERVAL_MS, 10) || 30000,

    // Device IDs (can be overridden for production)
    deviceIds: {
        dishwasher: process.env.TASMOTA_DISHWASHER_ID || 'tasmota_dishwasher_001',
        waterHeater: process.env.TASMOTA_BOILER_ID || 'tasmota_boiler_001',
        airConditioner: process.env.TASMOTA_AC_ID || 'tasmota_ac_001',
        washingMachine: process.env.TASMOTA_WASHER_ID || 'tasmota_washer_001',
        shelly3EM: process.env.SHELLY_3EM_ID || 'shellypro3em-house001'
    },

    // Feature flags
    features: {
        enableFileLogging: process.env.ENABLE_FILE_LOGGING !== 'false',
        enableBlockchainHashing: process.env.ENABLE_BLOCKCHAIN_HASHING !== 'false',
        enableConsoleStatus: process.env.ENABLE_CONSOLE_STATUS !== 'false'
    },

    // Output
    outputDirectory: process.env.OUTPUT_DIRECTORY || './simulation-output'
};

/**
 * Apply device ID overrides to device configurations
 */
function applyDeviceIdOverrides(deviceConfig, deviceKey) {
    const overrideId = environment.deviceIds[deviceKey];
    if (overrideId && overrideId !== deviceConfig.id) {
        // Update device ID
        deviceConfig.id = overrideId;

        // Update MQTT topic to match new ID
        if (deviceConfig.mqttTopic) {
            deviceConfig.mqttTopic = deviceConfig.mqttTopic.replace(
                /tasmota_\w+_\d+/,
                overrideId
            );
        }

        console.log(`[Config] Device ${deviceKey} ID overridden to: ${overrideId}`);
    }

    return deviceConfig;
}

/**
 * Log current configuration (sanitized)
 */
function logConfiguration() {
    console.log('\n=== Energy Data Simulator Configuration ===');
    console.log(`Environment: ${environment.nodeEnv}`);
    console.log(`MQTT Broker: ${environment.mqtt.broker}`);
    console.log(`Publish Interval: ${environment.publishIntervalMs}ms`);
    console.log(`Time Multiplier: ${environment.timeMultiplier}x`);
    console.log('\nDevices:');
    for (const [key, id] of Object.entries(environment.deviceIds)) {
        console.log(`  - ${key}: ${id}`);
    }
    console.log('\nFeatures:');
    for (const [key, enabled] of Object.entries(environment.features)) {
        console.log(`  - ${key}: ${enabled ? 'enabled' : 'disabled'}`);
    }
    console.log('============================================\n');
}

module.exports = {
    environment,
    applyDeviceIdOverrides,
    logConfiguration
};