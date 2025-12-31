/**
 * Water Heater (Boiler) Simulator
 *
 * Simulates an electric water heater that operates primarily
 * during low-tariff hours to minimize electricity costs.
 */

const BaseAppliance = require('./BaseAppliance');
const { TARIFF_SCHEDULE } = require('../config/devices');

class WaterHeaterSimulator extends BaseAppliance {
    constructor(config) {
        super(config);

        // Tank state
        this.tankTemperature = 40; // Start at lukewarm
        this.targetTemperature = config.heating.targetTemp;
        this.hysteresis = config.heating.hysteresis;
        this.isHeating = false;

        // Heat loss tracking
        this.lastHeatLossUpdate = Date.now();
    }

    /**
     * Simulate heat loss from the tank over time
     */
    updateHeatLoss(currentTime = new Date()) {
        const now = currentTime.getTime();
        const elapsedHours = (now - this.lastHeatLossUpdate) / (1000 * 60 * 60);
        const heatLoss = this.config.heating.heatLossPerHour * elapsedHours;

        // Ambient temperature affects heat loss (colder = more loss)
        const hour = currentTime.getHours();
        const ambientFactor = hour >= 6 && hour <= 22 ? 1.0 : 1.2; // More loss at night

        this.tankTemperature = Math.max(15, this.tankTemperature - (heatLoss * ambientFactor));
        this.lastHeatLossUpdate = now;
    }

    /**
     * Simulate water usage (hot water draw)
     */
    simulateWaterUsage(currentTime = new Date()) {
        const hour = currentTime.getHours();

        // Morning shower time (6-8 AM)
        if (hour >= 6 && hour <= 8) {
            if (Math.random() < 0.1) { // 10% chance per update
                const tempDrop = 5 + Math.random() * 10; // 5-15°C drop
                this.tankTemperature = Math.max(20, this.tankTemperature - tempDrop);
                console.log(`[${this.name}] Hot water used, tank temp: ${this.tankTemperature.toFixed(1)}°C`);
            }
        }

        // Evening usage (18-22)
        if (hour >= 18 && hour <= 22) {
            if (Math.random() < 0.05) { // 5% chance per update
                const tempDrop = 3 + Math.random() * 5;
                this.tankTemperature = Math.max(20, this.tankTemperature - tempDrop);
            }
        }
    }

    /**
     * Determine if heater should turn on
     * Prefers low-tariff hours but will heat if temperature is too low
     */
    shouldHeat(currentTime = new Date()) {
        const isLowTariff = TARIFF_SCHEDULE.isLowTariff(currentTime);
        const needsHeating = this.tankTemperature < (this.targetTemperature - this.hysteresis);
        const criticallyLow = this.tankTemperature < 35; // Emergency threshold

        // Already at target
        if (this.tankTemperature >= this.targetTemperature) {
            return false;
        }

        // Critical low - heat regardless of tariff
        if (criticallyLow) {
            return true;
        }

        // Normal operation - prefer low tariff
        if (isLowTariff && needsHeating) {
            return true;
        }

        return false;
    }

    /**
     * Update water heater state
     */
    update(currentTime = new Date()) {
        // Update heat loss
        this.updateHeatLoss(currentTime);

        // Simulate water usage
        this.simulateWaterUsage(currentTime);

        // Determine heating state
        const shouldHeatNow = this.shouldHeat(currentTime);

        if (shouldHeatNow && !this.isHeating) {
            // Start heating
            this.isHeating = true;
            this.isOn = true;
            this.currentPhase = 'heating';
            console.log(`[${this.name}] Started heating (${this.tankTemperature.toFixed(1)}°C → ${this.targetTemperature}°C)`);
        } else if (!shouldHeatNow && this.isHeating) {
            // Stop heating
            this.isHeating = false;
            this.currentPhase = 'standby';
            console.log(`[${this.name}] Reached target temperature: ${this.tankTemperature.toFixed(1)}°C`);
        }

        // Calculate power and heat gain
        if (this.isHeating) {
            this.currentPower = this.addVariation(this.config.power.heating, 0.03);
            this.isOn = true;

            // Simulate temperature increase while heating
            // ~1°C per minute for a 2.4kW heater in 80L tank
            const elapsedMinutes = 10 / 60; // Assuming 10-second intervals
            const tempGain = elapsedMinutes * (2400 / this.config.power.heating); // Scale by actual power
            this.tankTemperature = Math.min(
                this.targetTemperature + 2, // Allow slight overshoot
                this.tankTemperature + tempGain
            );
        } else {
            this.currentPower = this.config.power.standby;
            this.isOn = false;
        }

        return this.currentPower;
    }

    /**
     * Override status to include tank temperature
     */
    getStatus() {
        const baseStatus = super.getStatus();
        return {
            ...baseStatus,
            tankTemperature: Math.round(this.tankTemperature * 10) / 10,
            isHeating: this.isHeating,
            isLowTariff: TARIFF_SCHEDULE.isLowTariff()
        };
    }

    /**
     * Override extended message to include temperature in metadata
     * Standard generateMessage() produces pure Tasmota format for plug-and-play
     */
    generateExtendedMessage(timestamp) {
        const message = super.generateExtendedMessage(timestamp);
        message._meta.tankTemperature = Math.round(this.tankTemperature * 10) / 10;
        message._meta.isLowTariff = TARIFF_SCHEDULE.isLowTariff();
        return message;
    }
}

module.exports = WaterHeaterSimulator;