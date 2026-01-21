/**
 * Base Appliance Simulator
 *
 * Provides common functionality for all Tasmota-based appliance simulators.
 * Tracks energy accumulation and generates Tasmota-compatible SENSOR messages.
 */

class BaseAppliance {
    constructor(config) {
        this.config = config;
        this.id = config.id;
        this.name = config.name;
        this.location = config.location;
        this.mqttTopic = config.mqttTopic;

        // Current state
        this.isOn = false;
        this.currentPower = config.power.standby || 0;
        this.currentPhase = 'standby';

        // Energy accumulation (like real Tasmota)
        this.energyState = {
            totalStartTime: new Date().toISOString().replace('T', ' ').split('.')[0],
            total: 0,
            today: 0,
            yesterday: 0,
            lastDate: new Date().toISOString().split('T')[0],
            lastUpdate: Date.now()
        };

        // Scheduling state
        this.lastRunDate = null;
        this.nextScheduledRun = null;
        this.cycleStartTime = null;
        this.cyclePhaseIndex = 0;
    }

    /**
     * Update energy accumulation based on current power draw
     */
    updateEnergyAccumulation() {
        const now = Date.now();
        const todayDate = new Date().toISOString().split('T')[0];

        // Calculate energy consumed since last update
        const elapsedHours = (now - this.energyState.lastUpdate) / (1000 * 60 * 60);
        const energyConsumed = (this.currentPower * elapsedHours) / 1000; // kWh

        // Handle day rollover
        if (todayDate !== this.energyState.lastDate) {
            this.energyState.yesterday = this.energyState.today;
            this.energyState.today = 0;
            this.energyState.lastDate = todayDate;
        }

        // Accumulate energy
        this.energyState.today += energyConsumed;
        this.energyState.total += energyConsumed;
        this.energyState.lastUpdate = now;
    }

    /**
     * Generate Tasmota-compatible SENSOR message
     * Matches exact format from real Tasmota devices for plug-and-play compatibility
     */
    generateMessage(timestamp = new Date().toISOString()) {
        this.updateEnergyAccumulation();

        const voltage = 228 + Math.random() * 4; // 228-232V typical
        const powerFactor = 0.85 + Math.random() * 0.12; // 0.85-0.97
        const current = this.currentPower / (voltage * powerFactor);
        const apparentPower = this.currentPower / powerFactor;
        const reactivePower = Math.sqrt(apparentPower ** 2 - this.currentPower ** 2);

        // Calculate period energy (energy in this reporting interval)
        const intervalHours = 10 / 3600; // Assuming 10-second intervals
        const periodEnergy = (this.currentPower * intervalHours) / 1000;

        // EXACT Tasmota SENSOR format - this is what real devices output
        // See: https://tasmota.github.io/docs/Energy-Saving/
        return {
            Time: timestamp.replace('T', ' ').replace('Z', ''),  // Tasmota format: "2024-01-15 14:30:00"
            ENERGY: {
                TotalStartTime: this.energyState.totalStartTime,
                Total: Math.round(this.energyState.total * 1000) / 1000,
                Yesterday: Math.round(this.energyState.yesterday * 1000) / 1000,
                Today: Math.round(this.energyState.today * 1000) / 1000,
                Period: Math.round(periodEnergy * 1000) / 1000,
                Power: Math.round(this.currentPower),
                ApparentPower: Math.round(apparentPower),
                ReactivePower: Math.round(reactivePower),
                Factor: Math.round(powerFactor * 100) / 100,
                Voltage: Math.round(voltage),
                Current: Math.round(current * 1000) / 1000
            }
        };
    }

    /**
     * Generate extended message with metadata (for our app's enhanced features)
     * Use this when you need appliance state info beyond standard Tasmota data
     */
    generateExtendedMessage(timestamp = new Date().toISOString()) {
        const baseMessage = this.generateMessage(timestamp);

        return {
            ...baseMessage,
            _meta: {
                deviceId: this.id,
                deviceName: this.name,
                location: this.location,
                phase: this.currentPhase,
                isActive: this.isOn,
                simulated: true  // Flag to identify simulated vs real data
            }
        };
    }

    /**
     * Check if appliance should start a new cycle
     * Override in subclasses for specific scheduling logic
     */
    shouldStartCycle(currentTime = new Date()) {
        return false; // Base implementation - override in subclasses
    }

    /**
     * Update appliance state - called every simulation tick
     * Override in subclasses for specific behavior
     */
    update(currentTime = new Date()) {
        // Base implementation - override in subclasses
        return this.currentPower;
    }

    /**
     * Add random variation to a value
     * Default reduced from 5% to 2% for more realistic power readings
     */
    addVariation(value, percentVariation = 0.02) {
        const variation = value * percentVariation * (Math.random() * 2 - 1);
        return value + variation;
    }

    /**
     * Get minutes elapsed in current cycle
     */
    getCycleMinutes() {
        if (!this.cycleStartTime) return 0;
        return (Date.now() - this.cycleStartTime) / (1000 * 60);
    }

    /**
     * Start a new appliance cycle
     */
    startCycle() {
        this.isOn = true;
        this.cycleStartTime = Date.now();
        this.cyclePhaseIndex = 0;
        this.lastRunDate = new Date().toISOString().split('T')[0];
        console.log(`[${this.name}] Starting cycle`);
    }

    /**
     * End the current cycle
     */
    endCycle() {
        this.isOn = false;
        this.cycleStartTime = null;
        this.cyclePhaseIndex = 0;
        this.currentPower = this.config.power.standby || 0;
        this.currentPhase = 'standby';
        console.log(`[${this.name}] Cycle complete`);
    }

    /**
     * Get current status for logging
     */
    getStatus() {
        return {
            id: this.id,
            name: this.name,
            isOn: this.isOn,
            phase: this.currentPhase,
            power: this.currentPower,
            todayEnergy: Math.round(this.energyState.today * 1000) / 1000,
            totalEnergy: Math.round(this.energyState.total * 1000) / 1000
        };
    }
}

module.exports = BaseAppliance;