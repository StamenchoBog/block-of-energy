const mqtt = require('mqtt');
const { MongoClient } = require('mongodb');

/**
 * Local MQTT to MongoDB Processor
 * Bridges local MQTT messages to MongoDB for local development
 */

const CONFIG = {
    // MQTT Configuration
    mqttBroker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
    mqttTopic: 'tele/+/SENSOR',
    
    // MongoDB Configuration
    mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017',
    mongoDb: process.env.MONGODB_DATABASE || 'telemetry-db',
    mongoCollection: process.env.MONGODB_COLLECTION || 'sensor-measurements'
};

class LocalMQTTToMongoProcessor {
    constructor() {
        this.mqttClient = null;
        this.mongoClient = null;
        this.db = null;
        this.collection = null;
    }

    async connect() {
        try {
            // Connect to MongoDB
            console.log('Connecting to MongoDB...');
            this.mongoClient = new MongoClient(CONFIG.mongoUrl);
            await this.mongoClient.connect();
            this.db = this.mongoClient.db(CONFIG.mongoDb);
            this.collection = this.db.collection(CONFIG.mongoCollection);
            console.log('Connected to MongoDB successfully');

            // Connect to MQTT
            console.log('Connecting to MQTT broker...');
            this.mqttClient = mqtt.connect(CONFIG.mqttBroker);
            
            this.mqttClient.on('connect', () => {
                console.log('Connected to MQTT broker');
                this.mqttClient.subscribe(CONFIG.mqttTopic, (err) => {
                    if (err) {
                        console.error('Failed to subscribe to MQTT topic:', err);
                    } else {
                        console.log(`Subscribed to topic: ${CONFIG.mqttTopic}`);
                    }
                });
            });

            this.mqttClient.on('message', (topic, message) => {
                console.log(`Received message on topic: ${topic}`);
                this.processMessage(topic, message);
            });

            this.mqttClient.on('error', (err) => {
                console.error('MQTT connection error:', err);
            });

        } catch (error) {
            console.error('Failed to connect:', error);
            process.exit(1);
        }
    }

    async processMessage(topic, message) {
        try {
            const payload = JSON.parse(message.toString());
            const deviceId = this.extractDeviceId(topic);
            
            // Transform simulator data to Tasmota format for API compatibility
            const transformedPayload = {
                ...payload,
                ENERGY: {
                    Power: payload.energy.power,
                    Voltage: payload.energy.voltage,
                    Current: payload.energy.current,
                    Factor: payload.energy.powerFactor,
                    Frequency: payload.energy.frequency,
                    ApparentPower: payload.energy.apparentPower,
                    ReactivePower: payload.energy.reactivePower,
                    Today: 0, // Default values for now
                    Total: 0
                },
                TIME: {
                    UTC: payload.timestamp
                }
            };
            
            // Create document similar to the Azure Function structure
            const document = {
                _id: `${deviceId}-${Date.now()}`,
                deviceId: deviceId,
                payload: transformedPayload,
                processingTimestamp: new Date().toISOString(),
                cosmosInsertTimestamp: new Date().toISOString(),
                status: 'processed',
                messageSource: 'LocalMQTTProcessor',
                topic: topic
            };

            // Insert into MongoDB
            await this.collection.insertOne(document);
            console.log(`Stored message from ${deviceId} in MongoDB`);

        } catch (error) {
            console.error('Failed to process message:', error);
        }
    }

    extractDeviceId(topic) {
        // Extract device ID from topic like "tele/tasmota_monitor_sensor001/SENSOR"
        const parts = topic.split('/');
        if (parts.length >= 2) {
            const devicePart = parts[1]; // tasmota_monitor_sensor001
            return devicePart.replace('tasmota_monitor_', '');
        }
        return 'unknown';
    }

    async disconnect() {
        if (this.mqttClient) {
            this.mqttClient.end();
        }
        if (this.mongoClient) {
            await this.mongoClient.close();
        }
    }
}

// Start the processor
const processor = new LocalMQTTToMongoProcessor();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await processor.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await processor.disconnect();
    process.exit(0);
});

// Start processing
processor.connect().catch(console.error);