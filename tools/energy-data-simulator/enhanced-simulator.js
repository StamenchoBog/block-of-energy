const mqtt = require('mqtt');
const crypto = require('crypto');
const fs = require('fs');

/**
 * Enhanced Energy Data Simulator for Production Testing
 * Simulates realistic energy patterns with Azure IoT Hub integration
 */

const CONFIG = {
    // MQTT Configuration
    broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
    topic: process.env.MQTT_TOPIC || 'tele/tasmota_monitor_000001/SENSOR',
    
    // Azure IoT Hub (for production)
    azureIoTConnectionString: process.env.AZURE_IOT_CONNECTION_STRING,
    
    // Simulation parameters
    devices: [
        { id: 'sensor001', location: 'Main Building', type: 'consumption' },
        { id: 'sensor002', location: 'Solar Panels', type: 'production' },
        { id: 'sensor003', location: 'Battery Storage', type: 'storage' },
        { id: 'sensor004', location: 'Grid Connection', type: 'transmission' }
    ],
    
    // Timing configuration
    publishInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
    batchSize: 10, // Number of messages to batch for blockchain
    
    // Patterns
    enableSeasonalPatterns: true,
    enableWeatherEffects: true,
    enableDemandResponse: true,
    
    // Output options
    enableBlockchainHashing: true,
    saveToFile: true,
    outputDirectory: './simulation-output'
};

// Initialize MQTT client
const mqttClient = CONFIG.broker ? mqtt.connect(CONFIG.broker) : null;

/**
 * Generate realistic energy patterns based on time, weather, and usage
 */
class EnergyPatternGenerator {
    constructor(deviceConfig) {
        this.device = deviceConfig;
        this.baselineValues = this.getBaselineValues(deviceConfig.type);
    }
    
    getBaselineValues(type) {
        const baselines = {
            consumption: { min: 50, max: 500, peak: 800 },
            production: { min: 0, max: 300, peak: 600 },
            storage: { min: -200, max: 200, peak: 400 },
            transmission: { min: 0, max: 1000, peak: 1500 }
        };
        return baselines[type] || baselines.consumption;
    }
    
    /**
     * Generate energy reading based on multiple factors
     */
    generateReading(timestamp) {
        const date = new Date(timestamp);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        const month = date.getMonth();
        
        // Time-of-day patterns
        let timeOfDayFactor = this.getTimeOfDayFactor(hour);
        
        // Seasonal patterns
        let seasonalFactor = this.getSeasonalFactor(month);
        
        // Weekend patterns
        let weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.8 : 1.1;
        
        // Weather simulation (simplified)
        let weatherFactor = this.getWeatherFactor(date);
        
        // Calculate base power
        let basePower = this.baselineValues.min;
        let range = this.baselineValues.max - this.baselineValues.min;
        
        // Apply all factors
        let power = basePower + (range * timeOfDayFactor * seasonalFactor * weekendFactor * weatherFactor);
        
        // Add random variation
        power = this.addRandomVariation(power, 0.1);
        
        // Ensure realistic bounds
        power = Math.max(0, Math.min(this.baselineValues.peak, power));
        
        return {
            power: Math.round(power),
            voltage: this.generateVoltage(),
            current: this.generateCurrent(power),
            powerFactor: this.generatePowerFactor(),
            frequency: this.generateFrequency()
        };
    }
    
    getTimeOfDayFactor(hour) {
        const patterns = {
            consumption: {
                6: 0.3, 7: 0.6, 8: 0.9, 9: 0.8, 10: 0.7, 11: 0.7, 12: 0.8,
                13: 0.7, 14: 0.6, 15: 0.7, 16: 0.8, 17: 0.9, 18: 1.0, 19: 0.9,
                20: 0.8, 21: 0.7, 22: 0.5, 23: 0.3, 0: 0.2, 1: 0.2, 2: 0.2,
                3: 0.2, 4: 0.2, 5: 0.2
            },
            production: {
                6: 0.1, 7: 0.3, 8: 0.6, 9: 0.8, 10: 0.9, 11: 1.0, 12: 1.0,
                13: 1.0, 14: 0.9, 15: 0.8, 16: 0.6, 17: 0.3, 18: 0.1, 19: 0.0,
                20: 0.0, 21: 0.0, 22: 0.0, 23: 0.0, 0: 0.0, 1: 0.0, 2: 0.0,
                3: 0.0, 4: 0.0, 5: 0.0
            }
        };
        
        const pattern = patterns[this.device.type] || patterns.consumption;
        return pattern[hour] || 0.5;
    }
    
    getSeasonalFactor(month) {
        if (!CONFIG.enableSeasonalPatterns) return 1.0;
        
        // Northern hemisphere seasonal patterns
        const seasonalFactors = {
            consumption: [1.2, 1.1, 1.0, 0.8, 0.7, 0.8, 0.9, 0.9, 0.8, 0.9, 1.0, 1.1],
            production: [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 0.7, 0.6]
        };
        
        const factors = seasonalFactors[this.device.type] || seasonalFactors.consumption;
        return factors[month];
    }
    
    getWeatherFactor(date) {
        if (!CONFIG.enableWeatherEffects) return 1.0;
        
        // Simulate weather patterns (simplified)
        const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
        const weatherSeed = Math.sin(dayOfYear / 30) + Math.sin(dayOfYear / 7) * 0.3;
        
        return 0.8 + 0.4 * ((weatherSeed + 1) / 2); // Range: 0.8 to 1.2
    }
    
    addRandomVariation(value, percentage) {
        const variation = value * percentage * (Math.random() * 2 - 1);
        return value + variation;
    }
    
    generateVoltage() {
        return Math.round(this.addRandomVariation(230, 0.05)); // ±5% variation
    }
    
    generateCurrent(power) {
        const voltage = 230;
        const powerFactor = 0.95;
        return parseFloat((power / (voltage * powerFactor)).toFixed(3));
    }
    
    generatePowerFactor() {
        return parseFloat(this.addRandomVariation(0.95, 0.1).toFixed(2));
    }
    
    generateFrequency() {
        return parseFloat(this.addRandomVariation(50.0, 0.02).toFixed(1)); // ±2% variation
    }
}

/**
 * Energy data hasher for blockchain integration
 */
class EnergyDataHasher {
    static generateHash(data) {
        const dataString = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
    
    static createHashRecord(originalData, deviceId) {
        const hash = this.generateHash(originalData);
        const timestamp = new Date().toISOString();
        
        return {
            id: `${deviceId}-${Date.now()}`,
            hashValue: hash,
            timestamp: timestamp,
            deviceID: deviceId,
            dataType: originalData.deviceType || 'consumption'
        };
    }
}

/**
 * Enhanced message generator with blockchain integration
 */
class EnhancedEnergySimulator {
    constructor() {
        this.generators = {};
        this.messageBuffer = [];
        this.hashBuffer = [];
        
        // Initialize pattern generators for each device
        CONFIG.devices.forEach(device => {
            this.generators[device.id] = new EnergyPatternGenerator(device);
        });
        
        this.ensureOutputDirectory();
    }
    
    ensureOutputDirectory() {
        if (CONFIG.saveToFile && !fs.existsSync(CONFIG.outputDirectory)) {
            fs.mkdirSync(CONFIG.outputDirectory, { recursive: true });
        }
    }
    
    /**
     * Generate enhanced energy message
     */
    generateEnergyMessage(deviceConfig, timestamp) {
        const generator = this.generators[deviceConfig.id];
        const reading = generator.generateReading(timestamp);
        
        // Create enhanced message structure
        const message = {
            deviceId: deviceConfig.id,
            deviceType: deviceConfig.type,
            location: deviceConfig.location,
            timestamp: timestamp,
            
            // Energy measurements
            energy: {
                power: reading.power,
                voltage: reading.voltage,
                current: reading.current,
                powerFactor: reading.powerFactor,
                frequency: reading.frequency,
                apparentPower: Math.round(reading.power / reading.powerFactor),
                reactivePower: Math.round(Math.sqrt(
                    Math.pow(reading.power / reading.powerFactor, 2) - Math.pow(reading.power, 2)
                ))
            },
            
            // Device status
            status: {
                uptime: Math.floor((Date.now() - new Date('2024-01-01').getTime()) / 1000),
                signalStrength: -45 - Math.floor(Math.random() * 20),
                batteryLevel: deviceConfig.type === 'storage' ? Math.floor(Math.random() * 100) : null,
                temperature: 20 + Math.random() * 15,
                humidity: 40 + Math.random() * 30
            }
        };
        
        return message;
    }
    
    /**
     * Process and publish messages
     */
    async processMessage(message) {
        console.log(`Generated reading for ${message.deviceId}: ${message.energy.power}W`);
        
        // Add to message buffer
        this.messageBuffer.push(message);
        
        // Generate hash for blockchain if enabled
        if (CONFIG.enableBlockchainHashing) {
            const hashRecord = EnergyDataHasher.createHashRecord(message, message.deviceId);
            this.hashBuffer.push(hashRecord);
        }
        
        // Publish to MQTT
        if (mqttClient) {
            await this.publishToMQTT(message);
        }
        
        // Save to file if enabled
        if (CONFIG.saveToFile) {
            await this.saveToFile(message);
        }
        
        // Process batches
        await this.processBatches();
    }
    
    async publishToMQTT(message) {
        const topic = CONFIG.topic.replace('000001', message.deviceId);
        
        return new Promise((resolve, reject) => {
            mqttClient.publish(topic, JSON.stringify(message), (err) => {
                if (err) {
                    console.error(`MQTT publish error for ${message.deviceId}:`, err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
    
    async saveToFile(message) {
        const filename = `${CONFIG.outputDirectory}/${message.deviceId}-${new Date().toISOString().split('T')[0]}.json`;
        const logEntry = JSON.stringify(message) + '\n';
        
        fs.appendFileSync(filename, logEntry);
    }
    
    async processBatches() {
        // Process message batches
        if (this.messageBuffer.length >= CONFIG.batchSize) {
            await this.processBatch('messages', this.messageBuffer.splice(0, CONFIG.batchSize));
        }
        
        // Process hash batches for blockchain
        if (this.hashBuffer.length >= CONFIG.batchSize) {
            await this.processBatch('hashes', this.hashBuffer.splice(0, CONFIG.batchSize));
        }
    }
    
    async processBatch(type, batch) {
        const filename = `${CONFIG.outputDirectory}/batch-${type}-${Date.now()}.json`;
        
        if (type === 'hashes') {
            console.log(`Creating blockchain batch with ${batch.length} hash records`);
        }
        
        fs.writeFileSync(filename, JSON.stringify(batch, null, 2));
        console.log(`Saved ${type} batch to ${filename}`);
    }
    
    /**
     * Start simulation
     */
    startSimulation() {
        console.log('Starting Enhanced Energy Data Simulation...');
        console.log(`Simulating ${CONFIG.devices.length} devices with ${CONFIG.publishInterval/1000}s intervals`);
        
        // Connect to MQTT broker
        if (mqttClient) {
            mqttClient.on('connect', () => {
                console.log('Connected to MQTT broker');
            });
            
            mqttClient.on('error', (err) => {
                console.error('MQTT connection error:', err);
            });
        }
        
        // Start periodic data generation
        setInterval(() => {
            const timestamp = new Date().toISOString();
            
            CONFIG.devices.forEach(async (device) => {
                const message = this.generateEnergyMessage(device, timestamp);
                await this.processMessage(message);
            });
        }, CONFIG.publishInterval);
        
        console.log('Simulation started. Press Ctrl+C to stop.');
    }
}

// Start simulation
const simulator = new EnhancedEnergySimulator();
simulator.startSimulation();