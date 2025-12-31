#!/usr/bin/env node
/**
 * Multi-Device Energy Simulator
 *
 * Simulates a 3-person household with multiple smart energy monitors:
 * - Tasmota-based plugs monitoring individual appliances
 * - Shelly Pro 3EM monitoring whole-house consumption
 *
 * For production deployment:
 * 1. Copy .env.example to .env
 * 2. Update device IDs to match your real devices
 * 3. Configure MQTT broker connection
 * 4. Run with: node multi-device-simulator.js
 */

const mqtt = require('mqtt');
const crypto = require('crypto');
const fs = require('fs');

// Configuration
const { TASMOTA_DEVICES, SHELLY_DEVICE, SIMULATION_CONFIG } = require('./config/devices');
const { environment, applyDeviceIdOverrides, logConfiguration } = require('./config/environment');

// Simulators
const {
    DishwasherSimulator,
    WaterHeaterSimulator,
    AirConditionerSimulator,
    WashingMachineSimulator,
    ShellyPro3EMSimulator
} = require('./simulators');

/**
 * Main Simulator Orchestrator
 */
class MultiDeviceSimulator {
    constructor() {
        this.mqttClient = null;
        this.appliances = {};
        this.shelly = null;
        this.isRunning = false;
        this.startTime = Date.now();
        this.messageCount = 0;

        // Blockchain hashing buffer
        this.hashBuffer = [];

        this.initializeDevices();
        this.ensureOutputDirectory();
    }

    /**
     * Initialize all device simulators
     */
    initializeDevices() {
        console.log('[Init] Initializing device simulators...');

        // Create Tasmota appliance simulators with environment overrides
        const dishwasherConfig = applyDeviceIdOverrides(
            { ...TASMOTA_DEVICES.dishwasher },
            'dishwasher'
        );
        this.appliances.dishwasher = new DishwasherSimulator(dishwasherConfig);

        const waterHeaterConfig = applyDeviceIdOverrides(
            { ...TASMOTA_DEVICES.waterHeater },
            'waterHeater'
        );
        this.appliances.waterHeater = new WaterHeaterSimulator(waterHeaterConfig);

        const acConfig = applyDeviceIdOverrides(
            { ...TASMOTA_DEVICES.airConditioner },
            'airConditioner'
        );
        this.appliances.airConditioner = new AirConditionerSimulator(acConfig);

        const washerConfig = applyDeviceIdOverrides(
            { ...TASMOTA_DEVICES.washingMachine },
            'washingMachine'
        );
        this.appliances.washingMachine = new WashingMachineSimulator(washerConfig);

        // Create Shelly Pro 3EM simulator
        const shellyConfig = {
            ...SHELLY_DEVICE,
            id: environment.deviceIds.shelly3EM
        };
        shellyConfig.mqtt.statusTopic = shellyConfig.mqtt.statusTopic.replace(
            'shellypro3em-house001',
            environment.deviceIds.shelly3EM
        );
        this.shelly = new ShellyPro3EMSimulator(shellyConfig);

        // Connect Shelly to appliance references
        this.shelly.setAppliances(this.appliances);

        console.log('[Init] All devices initialized');
    }

    /**
     * Ensure output directory exists
     */
    ensureOutputDirectory() {
        if (environment.features.enableFileLogging) {
            if (!fs.existsSync(environment.outputDirectory)) {
                fs.mkdirSync(environment.outputDirectory, { recursive: true });
            }
        }
    }

    /**
     * Connect to MQTT broker
     */
    async connectMQTT() {
        return new Promise((resolve, reject) => {
            console.log(`[MQTT] Connecting to ${environment.mqtt.broker}...`);

            const options = {
                clientId: environment.mqtt.clientId,
                clean: true,
                reconnectPeriod: 5000
            };

            if (environment.mqtt.username) {
                options.username = environment.mqtt.username;
                options.password = environment.mqtt.password;
            }

            this.mqttClient = mqtt.connect(environment.mqtt.broker, options);

            this.mqttClient.on('connect', () => {
                console.log('[MQTT] Connected successfully');
                resolve();
            });

            this.mqttClient.on('error', (err) => {
                console.error('[MQTT] Connection error:', err.message);
                reject(err);
            });

            this.mqttClient.on('reconnect', () => {
                console.log('[MQTT] Reconnecting...');
            });

            this.mqttClient.on('offline', () => {
                console.log('[MQTT] Client offline');
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.mqttClient.connected) {
                    reject(new Error('MQTT connection timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Publish message to MQTT
     */
    async publishMessage(topic, message) {
        return new Promise((resolve, reject) => {
            if (!this.mqttClient || !this.mqttClient.connected) {
                console.warn('[MQTT] Not connected, skipping publish');
                resolve();
                return;
            }

            const payload = JSON.stringify(message);

            this.mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
                if (err) {
                    console.error(`[MQTT] Publish error on ${topic}:`, err);
                    reject(err);
                } else {
                    this.messageCount++;
                    resolve();
                }
            });
        });
    }

    /**
     * Generate blockchain hash for a message
     */
    generateHash(message, deviceId) {
        const dataString = JSON.stringify(message, Object.keys(message).sort());
        const hash = crypto.createHash('sha256').update(dataString).digest('hex');

        return {
            id: `${deviceId}-${Date.now()}`,
            hashValue: hash,
            timestamp: new Date().toISOString(),
            deviceId: deviceId,
            dataType: 'energy_reading'
        };
    }

    /**
     * Save message to file
     */
    saveToFile(deviceId, message) {
        if (!environment.features.enableFileLogging) return;

        const date = new Date().toISOString().split('T')[0];
        const filename = `${environment.outputDirectory}/${deviceId}-${date}.jsonl`;

        fs.appendFileSync(filename, JSON.stringify(message) + '\n');
    }

    /**
     * Process hash buffer for blockchain
     */
    processHashBuffer() {
        if (this.hashBuffer.length >= SIMULATION_CONFIG.batchSize) {
            const batch = this.hashBuffer.splice(0, SIMULATION_CONFIG.batchSize);
            const filename = `${environment.outputDirectory}/hash-batch-${Date.now()}.json`;

            fs.writeFileSync(filename, JSON.stringify(batch, null, 2));
            console.log(`[Blockchain] Saved hash batch: ${batch.length} records`);
        }
    }

    /**
     * Update all devices and publish readings
     */
    async tick() {
        const timestamp = new Date().toISOString();

        // Update all appliances
        for (const [key, appliance] of Object.entries(this.appliances)) {
            try {
                // Update appliance state
                appliance.update(new Date());

                // Generate Tasmota message
                const message = appliance.generateMessage(timestamp);

                // Publish to MQTT
                await this.publishMessage(appliance.mqttTopic, message);

                // Save to file
                this.saveToFile(appliance.id, message);

                // Generate hash for blockchain
                if (environment.features.enableBlockchainHashing) {
                    const hash = this.generateHash(message, appliance.id);
                    this.hashBuffer.push(hash);
                }
            } catch (err) {
                console.error(`[Error] ${key}:`, err.message);
            }
        }

        // Update and publish Shelly 3EM readings
        try {
            const shellyMessage = this.shelly.generateMessage(timestamp);
            await this.publishMessage(this.shelly.mqttTopics.statusTopic, shellyMessage);
            this.saveToFile(this.shelly.id, shellyMessage);

            if (environment.features.enableBlockchainHashing) {
                const hash = this.generateHash(shellyMessage, this.shelly.id);
                this.hashBuffer.push(hash);
            }
        } catch (err) {
            console.error('[Error] Shelly 3EM:', err.message);
        }

        // Process blockchain hash buffer
        this.processHashBuffer();
    }

    /**
     * Display status summary
     */
    displayStatus() {
        if (!environment.features.enableConsoleStatus) return;

        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;

        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║           ENERGY SIMULATOR STATUS                             ║');
        console.log('╠══════════════════════════════════════════════════════════════╣');
        console.log(`║ Uptime: ${hours}h ${minutes}m ${seconds}s | Messages: ${this.messageCount.toLocaleString().padStart(8)}       ║`);
        console.log('╠══════════════════════════════════════════════════════════════╣');

        // Appliance status
        for (const [key, appliance] of Object.entries(this.appliances)) {
            const status = appliance.getStatus();
            const powerStr = `${status.power}W`.padStart(6);
            const phaseStr = status.phase.padEnd(12);
            const nameStr = status.name.padEnd(20);
            const indicator = status.isOn ? '🟢' : '⚪';

            console.log(`║ ${indicator} ${nameStr} ${phaseStr} ${powerStr}            ║`);
        }

        // Shelly status
        const shellyStatus = this.shelly.getStatus();
        console.log('╠══════════════════════════════════════════════════════════════╣');
        console.log(`║ 📊 Whole House: ${shellyStatus.totalPower}W total                              `.slice(0, 65) + '║');
        console.log(`║    Phase A: ${shellyStatus.phases.a}W | Phase B: ${shellyStatus.phases.b}W | Phase C: ${shellyStatus.phases.c}W    `.slice(0, 65) + '║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
    }

    /**
     * Start the simulation
     */
    async start() {
        console.log('\n🔌 Multi-Device Energy Simulator');
        console.log('================================\n');

        // Log configuration
        logConfiguration();

        // Connect to MQTT
        try {
            await this.connectMQTT();
        } catch (err) {
            console.error('[Fatal] Could not connect to MQTT broker:', err.message);
            console.log('[Info] Continuing in file-only mode...');
        }

        this.isRunning = true;
        console.log(`[Sim] Starting simulation with ${environment.publishIntervalMs}ms intervals`);

        // Main simulation loop
        const tickInterval = setInterval(async () => {
            if (!this.isRunning) {
                clearInterval(tickInterval);
                return;
            }

            await this.tick();
        }, environment.publishIntervalMs);

        // Status display loop
        const statusInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(statusInterval);
                return;
            }

            this.displayStatus();
        }, environment.statusDisplayIntervalMs);

        // Initial tick
        await this.tick();
        this.displayStatus();

        // Graceful shutdown
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());

        console.log('[Sim] Simulation running. Press Ctrl+C to stop.\n');
    }

    /**
     * Stop the simulation
     */
    stop() {
        console.log('\n[Sim] Stopping simulation...');
        this.isRunning = false;

        // Flush remaining hash buffer
        if (this.hashBuffer.length > 0) {
            const filename = `${environment.outputDirectory}/hash-batch-final-${Date.now()}.json`;
            fs.writeFileSync(filename, JSON.stringify(this.hashBuffer, null, 2));
            console.log(`[Blockchain] Saved final hash batch: ${this.hashBuffer.length} records`);
        }

        // Disconnect MQTT
        if (this.mqttClient) {
            this.mqttClient.end();
            console.log('[MQTT] Disconnected');
        }

        console.log('[Sim] Simulation stopped. Goodbye!\n');
        process.exit(0);
    }
}

// Run the simulator
const simulator = new MultiDeviceSimulator();
simulator.start().catch((err) => {
    console.error('[Fatal]', err);
    process.exit(1);
});
