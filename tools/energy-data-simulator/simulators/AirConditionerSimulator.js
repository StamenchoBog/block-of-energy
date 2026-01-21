/**
 * Air Conditioner (Heating Mode) Simulator
 *
 * Simulates an inverter AC running continuously in heating mode.
 * Power modulates based on the difference between indoor and target temperature.
 */

const BaseAppliance = require('./BaseAppliance');

class AirConditionerSimulator extends BaseAppliance {
    constructor(config) {
        super(config);

        // Temperature state
        this.indoorTemperature = 18; // Start below target
        this.outdoorTemperature = 5; // Winter conditions
        this.targetTemperature = config.schedule.targetTemperature;

        // Compressor state
        this.compressorState = 'off'; // off, low, mid, high
        this.isDefrosting = false;
        this.lastDefrost = Date.now();

        // Always on for heating season
        this.isOn = true;
    }

    /**
     * Simulate outdoor temperature based on time of day
     */
    updateOutdoorTemperature(currentTime = new Date()) {
        const hour = currentTime.getHours();
        const outdoor = this.config.schedule.outdoorTempSimulation;

        // Daily temperature curve: coldest at 5-6 AM, warmest at 14-15 PM
        const hourAngle = ((hour - 6) / 24) * 2 * Math.PI;
        const dailyVariation = Math.sin(hourAngle) * (outdoor.dailyVariation / 2);

        const baseTemp = (outdoor.winterLow + outdoor.winterHigh) / 2;
        this.outdoorTemperature = baseTemp + dailyVariation + (Math.random() - 0.5) * 2;
    }

    /**
     * Get power factor based on temperature difference
     */
    getPowerFactor() {
        const tempDiff = this.targetTemperature - this.indoorTemperature;
        const curve = this.config.behavior.modulationCurve;

        // Find appropriate power factor from modulation curve
        for (let i = curve.length - 1; i >= 0; i--) {
            if (tempDiff >= curve[i].tempDiff) {
                return curve[i].powerFactor;
            }
        }
        return curve[0].powerFactor;
    }

    /**
     * Check if defrost cycle is needed
     */
    needsDefrost(currentTime = new Date()) {
        if (this.isDefrosting) return false;

        const minutesSinceDefrost = (currentTime.getTime() - this.lastDefrost) / (1000 * 60);
        const defrostInterval = this.config.behavior.defrostInterval;

        // Defrost more often when it's very cold
        const coldFactor = this.outdoorTemperature < 0 ? 0.7 : 1.0;

        return minutesSinceDefrost >= (defrostInterval * coldFactor);
    }

    /**
     * Update indoor temperature based on heating and heat loss
     */
    updateIndoorTemperature() {
        // Heat loss rate (higher when colder outside)
        const tempDiff = this.indoorTemperature - this.outdoorTemperature;
        const heatLossRate = tempDiff * 0.002; // °C per update interval

        // Heat gain from AC (proportional to power)
        const maxHeatGain = 0.05; // Max °C per interval at full power
        const heatGain = this.isDefrosting
            ? -0.02 // Actually cools slightly during defrost
            : maxHeatGain * (this.currentPower / this.config.power.compressorHigh);

        this.indoorTemperature = this.indoorTemperature - heatLossRate + heatGain;

        // Clamp to realistic range
        this.indoorTemperature = Math.max(12, Math.min(28, this.indoorTemperature));
    }

    /**
     * Update AC state
     */
    update(currentTime = new Date()) {
        this.updateOutdoorTemperature(currentTime);

        // Check for defrost cycle
        if (this.needsDefrost(currentTime)) {
            this.isDefrosting = true;
            this.currentPhase = 'defrost';
            this.compressorState = 'off';
            console.log(`[${this.name}] Starting defrost cycle`);
        }

        // Handle defrost cycle
        if (this.isDefrosting) {
            const defrostMinutes = (currentTime.getTime() - this.lastDefrost -
                this.config.behavior.defrostInterval * 60 * 1000) / (1000 * 60);

            if (defrostMinutes >= this.config.behavior.defrostDuration) {
                this.isDefrosting = false;
                this.lastDefrost = currentTime.getTime();
                console.log(`[${this.name}] Defrost complete, resuming heating`);
            } else {
                // During defrost, only fan runs (±3% variation)
                this.currentPower = this.addVariation(this.config.power.fanOnly, 0.03);
                this.updateIndoorTemperature();
                return this.currentPower;
            }
        }

        // Normal heating operation
        const powerFactor = this.getPowerFactor();

        if (powerFactor <= 0.1) {
            // Near target - low power or fan only (±3% - stable maintaining)
            this.compressorState = 'low';
            this.currentPhase = 'maintaining';
            this.currentPower = this.addVariation(this.config.power.compressorLow, 0.03);
        } else if (powerFactor <= 0.5) {
            // Moderate heating needed (±4% - inverter modulation)
            this.compressorState = 'mid';
            this.currentPhase = 'heating_mid';
            const targetPower = this.config.power.compressorLow +
                (this.config.power.compressorMid - this.config.power.compressorLow) * powerFactor * 2;
            this.currentPower = this.addVariation(targetPower, 0.04);
        } else {
            // Full heating (±4% - inverter modulation)
            this.compressorState = 'high';
            this.currentPhase = 'heating_high';
            const targetPower = this.config.power.compressorMid +
                (this.config.power.compressorHigh - this.config.power.compressorMid) * (powerFactor - 0.5) * 2;
            this.currentPower = this.addVariation(targetPower, 0.04);
        }

        this.updateIndoorTemperature();
        this.isOn = true;

        return this.currentPower;
    }

    /**
     * Override status to include temperatures
     */
    getStatus() {
        const baseStatus = super.getStatus();
        return {
            ...baseStatus,
            indoorTemperature: Math.round(this.indoorTemperature * 10) / 10,
            outdoorTemperature: Math.round(this.outdoorTemperature * 10) / 10,
            targetTemperature: this.targetTemperature,
            compressorState: this.compressorState,
            isDefrosting: this.isDefrosting
        };
    }

    /**
     * Override extended message to include temperature data
     * Standard generateMessage() produces pure Tasmota format for plug-and-play
     */
    generateExtendedMessage(timestamp) {
        const message = super.generateExtendedMessage(timestamp);
        message._meta.indoorTemp = Math.round(this.indoorTemperature * 10) / 10;
        message._meta.outdoorTemp = Math.round(this.outdoorTemperature * 10) / 10;
        message._meta.compressorState = this.compressorState;
        return message;
    }
}

module.exports = AirConditionerSimulator;