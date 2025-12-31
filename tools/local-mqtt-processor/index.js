const mqtt = require('mqtt');
const { MongoClient } = require('mongodb');

/**
 * Local MQTT to MongoDB Processor
 *
 * PLUG-AND-PLAY ARCHITECTURE:
 * This processor handles both simulated and real device data transparently.
 * Supports:
 * - Tasmota smart plugs (tele/+/SENSOR)
 * - Shelly Pro 3EM energy meters (shellypro3em-+/status/em:0)
 *
 * To switch from simulated to real devices:
 * 1. Stop the simulator
 * 2. Configure your real devices to publish to this MQTT broker
 * 3. No code changes needed - processor auto-detects device type
 */

const CONFIG = {
    // MQTT Configuration
    mqttBroker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',

    // Subscribe to multiple topic patterns for different device types
    mqttTopics: [
        'tele/+/SENSOR',              // Tasmota devices
        'shellypro3em-+/status/em:0', // Shelly Pro 3EM power readings
        'shellypro3em-+/status/emdata:0' // Shelly Pro 3EM energy totals
    ],

    // MongoDB Configuration
    mongoUrl: process.env.DATABASE_URL || 'mongodb://localhost:27017',
    mongoDb: process.env.DATABASE_NAME || 'telemetry-db',
    mongoCollection: process.env.DATABASE_COLLECTION || 'sensor-measurements'
};

/**
 * Device Type Detector
 * Automatically identifies device type from MQTT topic
 */
const DeviceTypeDetector = {
    detect(topic) {
        if (topic.startsWith('tele/') && topic.endsWith('/SENSOR')) {
            return 'tasmota';
        }
        if (topic.includes('shellypro3em')) {
            if (topic.includes('emdata')) {
                return 'shelly_energy_totals';
            }
            return 'shelly_power';
        }
        return 'unknown';
    },

    extractDeviceId(topic, deviceType) {
        const parts = topic.split('/');

        switch (deviceType) {
            case 'tasmota':
                // Topic: tele/tasmota_dishwasher_001/SENSOR
                return parts[1] || 'unknown';

            case 'shelly_power':
            case 'shelly_energy_totals':
                // Topic: shellypro3em-house001/status/em:0
                return parts[0] || 'unknown';

            default:
                return 'unknown';
        }
    }
};

/**
 * Message Transformer
 * Normalizes different device formats to a common structure for the API
 */
const MessageTransformer = {
    /**
     * Transform Tasmota SENSOR message
     * Works with both real devices and simulator (identical format)
     */
    transformTasmota(deviceId, payload, topic) {
        // Handle both old simulator format (energy) and real/new format (ENERGY)
        const energyData = payload.ENERGY || payload.energy;

        if (!energyData) {
            console.warn(`[Transform] No energy data in Tasmota message from ${deviceId}`);
            return null;
        }

        return {
            deviceId,
            deviceType: 'tasmota',
            payload: {
                Time: payload.Time || payload.timestamp,
                ENERGY: {
                    TotalStartTime: energyData.TotalStartTime,
                    Total: energyData.Total,
                    Yesterday: energyData.Yesterday,
                    Today: energyData.Today,
                    Period: energyData.Period,
                    Power: energyData.Power,
                    ApparentPower: energyData.ApparentPower,
                    ReactivePower: energyData.ReactivePower,
                    Factor: energyData.Factor,
                    Voltage: energyData.Voltage,
                    Current: energyData.Current
                }
            },
            // Preserve metadata if present (from simulator extended messages)
            metadata: payload._meta || null
        };
    },

    /**
     * Transform Shelly Pro 3EM power reading
     */
    transformShellyPower(deviceId, payload, topic) {
        return {
            deviceId,
            deviceType: 'shelly_pro_3em',
            payload: {
                // 3-phase power readings
                phases: {
                    a: {
                        voltage: payload.a_voltage,
                        current: payload.a_current,
                        power: payload.a_act_power,
                        apparentPower: payload.a_aprt_power,
                        powerFactor: payload.a_pf,
                        frequency: payload.a_freq
                    },
                    b: {
                        voltage: payload.b_voltage,
                        current: payload.b_current,
                        power: payload.b_act_power,
                        apparentPower: payload.b_aprt_power,
                        powerFactor: payload.b_pf,
                        frequency: payload.b_freq
                    },
                    c: {
                        voltage: payload.c_voltage,
                        current: payload.c_current,
                        power: payload.c_act_power,
                        apparentPower: payload.c_aprt_power,
                        powerFactor: payload.c_pf,
                        frequency: payload.c_freq
                    }
                },
                // Totals
                totalPower: payload.total_act_power,
                totalCurrent: payload.total_current,
                totalApparentPower: payload.total_aprt_power,
                neutralCurrent: payload.n_current
            },
            metadata: payload._meta || null
        };
    },

    /**
     * Transform Shelly Pro 3EM energy totals
     */
    transformShellyEnergyTotals(deviceId, payload, topic) {
        return {
            deviceId,
            deviceType: 'shelly_pro_3em_energy',
            payload: {
                phases: {
                    a: { total: payload.a_total_act_energy, returned: payload.a_total_act_ret_energy },
                    b: { total: payload.b_total_act_energy, returned: payload.b_total_act_ret_energy },
                    c: { total: payload.c_total_act_energy, returned: payload.c_total_act_ret_energy }
                },
                total: payload.total_act,
                totalReturned: payload.total_act_ret
            },
            metadata: null
        };
    }
};

class LocalMQTTToMongoProcessor {
    constructor() {
        this.mqttClient = null;
        this.mongoClient = null;
        this.db = null;
        this.collection = null;
        this.messageCount = 0;
        this.devicesSeen = new Set();
    }

    async connect() {
        try {
            // Connect to MongoDB
            console.log('[MongoDB] Connecting...');
            this.mongoClient = new MongoClient(CONFIG.mongoUrl);
            await this.mongoClient.connect();
            this.db = this.mongoClient.db(CONFIG.mongoDb);
            this.collection = this.db.collection(CONFIG.mongoCollection);
            console.log('[MongoDB] Connected successfully');

            // Connect to MQTT
            console.log('[MQTT] Connecting to broker...');
            this.mqttClient = mqtt.connect(CONFIG.mqttBroker);

            this.mqttClient.on('connect', () => {
                console.log('[MQTT] Connected to broker');

                // Subscribe to all device topic patterns
                CONFIG.mqttTopics.forEach(topic => {
                    this.mqttClient.subscribe(topic, (err) => {
                        if (err) {
                            console.error(`[MQTT] Failed to subscribe to ${topic}:`, err);
                        } else {
                            console.log(`[MQTT] Subscribed to: ${topic}`);
                        }
                    });
                });
            });

            this.mqttClient.on('message', (topic, message) => {
                this.processMessage(topic, message);
            });

            this.mqttClient.on('error', (err) => {
                console.error('[MQTT] Connection error:', err);
            });

            this.mqttClient.on('reconnect', () => {
                console.log('[MQTT] Reconnecting...');
            });

            // Status display
            setInterval(() => this.displayStatus(), 30000);

        } catch (error) {
            console.error('[Fatal] Failed to connect:', error);
            process.exit(1);
        }
    }

    async processMessage(topic, message) {
        try {
            const payload = JSON.parse(message.toString());
            const deviceType = DeviceTypeDetector.detect(topic);
            const deviceId = DeviceTypeDetector.extractDeviceId(topic, deviceType);

            // Track seen devices
            this.devicesSeen.add(deviceId);

            // Transform based on device type
            let transformedData = null;

            switch (deviceType) {
                case 'tasmota':
                    transformedData = MessageTransformer.transformTasmota(deviceId, payload, topic);
                    break;
                case 'shelly_power':
                    transformedData = MessageTransformer.transformShellyPower(deviceId, payload, topic);
                    break;
                case 'shelly_energy_totals':
                    transformedData = MessageTransformer.transformShellyEnergyTotals(deviceId, payload, topic);
                    break;
                default:
                    console.warn(`[Process] Unknown device type for topic: ${topic}`);
                    return;
            }

            if (!transformedData) {
                return;
            }

            // Create document for MongoDB
            const document = {
                _id: `${deviceId}-${Date.now()}`,
                ...transformedData,
                processingTimestamp: new Date().toISOString(),
                cosmosInsertTimestamp: new Date().toISOString(),
                status: 'processed',
                messageSource: 'LocalMQTTProcessor',
                topic: topic,
                isSimulated: transformedData.metadata?.simulated || false
            };

            // Insert into MongoDB
            await this.collection.insertOne(document);
            this.messageCount++;

            // Log first message from each device
            if (this.messageCount % 100 === 1 || !this.devicesSeen.has(deviceId + '_logged')) {
                this.devicesSeen.add(deviceId + '_logged');
                const power = deviceType === 'tasmota'
                    ? transformedData.payload.ENERGY?.Power
                    : transformedData.payload.totalPower;
                console.log(`[Stored] ${deviceId} (${deviceType}): ${power}W`);
            }

        } catch (error) {
            console.error('[Process] Failed to process message:', error.message);
        }
    }

    displayStatus() {
        const devices = [...this.devicesSeen].filter(d => !d.includes('_logged'));
        console.log(`\n[Status] Messages: ${this.messageCount} | Devices: ${devices.length}`);
        console.log(`[Devices] ${devices.join(', ')}\n`);
    }

    async disconnect() {
        if (this.mqttClient) {
            this.mqttClient.end();
            console.log('[MQTT] Disconnected');
        }
        if (this.mongoClient) {
            await this.mongoClient.close();
            console.log('[MongoDB] Disconnected');
        }
    }
}

// Banner
console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║      MQTT to MongoDB Processor (Plug-and-Play)            ║');
console.log('║  Supports: Tasmota • Shelly Pro 3EM • Simulated Data      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Start the processor
const processor = new LocalMQTTToMongoProcessor();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n[Shutdown] Gracefully shutting down...');
    await processor.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n[Shutdown] Gracefully shutting down...');
    await processor.disconnect();
    process.exit(0);
});

// Start processing
processor.connect().catch(console.error);