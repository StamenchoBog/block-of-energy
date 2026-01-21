/**
 * Shelly Pro 3EM Simulator
 *
 * Simulates a Shelly Pro 3EM whole-house energy meter.
 * Aggregates power from individual appliances and adds household base load.
 * Outputs data in Shelly's native MQTT format.
 */

class ShellyPro3EMSimulator {
    constructor(config) {
        this.config = config;
        this.id = config.id;
        this.name = config.name;
        this.location = config.location;
        this.mqttTopics = config.mqtt;

        // Connected appliance simulators (set via setAppliances)
        this.appliances = {};

        // Phase-to-appliance mapping
        this.phaseMapping = config.phaseMapping;

        // Energy accumulation per phase
        this.phaseEnergy = {
            a: { total: 0, returned: 0 },
            b: { total: 0, returned: 0 },
            c: { total: 0, returned: 0 }
        };
        this.lastEnergyUpdate = Date.now();

        // Base load for 3-person household
        this.baseLoads = this.initializeBaseLoads();
    }

    /**
     * Initialize base loads for a 3-person household
     * These are always-on or frequently-used devices not individually monitored
     */
    initializeBaseLoads() {
        return {
            // Phase A - Kitchen circuit
            a: {
                fridge: { min: 60, max: 150, cyclical: true, cycleMinutes: 20 },
                router: { constant: 12 },
                standbyDevices: { min: 10, max: 25 }
            },
            // Phase B - Living areas
            b: {
                tv: { min: 0, max: 120, activeHours: [6, 7, 8, 18, 19, 20, 21, 22, 23] },
                lights: { min: 0, max: 100, activeHours: [6, 7, 18, 19, 20, 21, 22, 23] },
                computers: { min: 0, max: 200, activeHours: [8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20, 21] },
                standbyDevices: { min: 15, max: 30 }
            },
            // Phase C - Bedrooms and other
            c: {
                chargers: { min: 5, max: 45, activeHours: [22, 23, 0, 1, 2, 3, 4, 5, 6] },
                nightLights: { min: 0, max: 15, activeHours: [22, 23, 0, 1, 2, 3, 4, 5] },
                standbyDevices: { min: 8, max: 20 }
            }
        };
    }

    /**
     * Set reference to appliance simulators
     */
    setAppliances(appliances) {
        this.appliances = appliances;
    }

    /**
     * Calculate base load for a phase at current time
     */
    calculateBaseLoad(phase, currentTime = new Date()) {
        const hour = currentTime.getHours();
        const loads = this.baseLoads[phase];
        let totalPower = 0;

        for (const [device, config] of Object.entries(loads)) {
            if (config.constant) {
                totalPower += config.constant;
            } else if (config.cyclical) {
                // Fridge-style cycling (on/off periods)
                const minuteOfHour = currentTime.getMinutes();
                const isOn = (minuteOfHour % (config.cycleMinutes * 2)) < config.cycleMinutes;
                totalPower += isOn ? config.max : config.min;
            } else if (config.activeHours) {
                // Time-based activity
                if (config.activeHours.includes(hour)) {
                    // Random activity within active hours (70-100% to reduce noise)
                    const activity = 0.7 + Math.random() * 0.3;
                    totalPower += config.min + (config.max - config.min) * activity;
                } else {
                    totalPower += config.min;
                }
            } else {
                // Random within range
                totalPower += config.min + Math.random() * (config.max - config.min);
            }
        }

        // Add some random variation (±2% to reduce noise)
        return totalPower * (0.98 + Math.random() * 0.04);
    }

    /**
     * Get appliance power contribution to a specific phase
     */
    getAppliancePowerForPhase(phase) {
        let power = 0;

        for (const [applianceKey, phaseAssignment] of Object.entries(this.phaseMapping)) {
            if (phaseAssignment === phase && this.appliances[applianceKey]) {
                power += this.appliances[applianceKey].currentPower || 0;
            }
        }

        return power;
    }

    /**
     * Update energy accumulation for all phases
     */
    updateEnergyAccumulation(phasePowers) {
        const now = Date.now();
        const elapsedHours = (now - this.lastEnergyUpdate) / (1000 * 60 * 60);

        for (const phase of ['a', 'b', 'c']) {
            const energyConsumed = (phasePowers[phase] * elapsedHours) / 1000; // kWh
            this.phaseEnergy[phase].total += energyConsumed;
        }

        this.lastEnergyUpdate = now;
    }

    /**
     * Generate Shelly Pro 3EM compatible message
     * Matches the real device's MQTT output format
     */
    generateMessage(timestamp = new Date().toISOString()) {
        const currentTime = new Date(timestamp);

        // Calculate power for each phase
        const phasePowers = {
            a: this.calculateBaseLoad('a', currentTime) + this.getAppliancePowerForPhase('a'),
            b: this.calculateBaseLoad('b', currentTime) + this.getAppliancePowerForPhase('b'),
            c: this.calculateBaseLoad('c', currentTime) + this.getAppliancePowerForPhase('c')
        };

        // Update energy accumulation
        this.updateEnergyAccumulation(phasePowers);

        // Standard voltage and frequency for Macedonia (230V, 50Hz)
        const baseVoltage = 230;
        const frequency = 50 + (Math.random() - 0.5) * 0.2;

        // Generate phase-specific readings
        const phaseData = {};
        for (const phase of ['a', 'b', 'c']) {
            const power = phasePowers[phase];
            const voltage = baseVoltage + (Math.random() - 0.5) * 6; // ±3V variation
            const powerFactor = 0.85 + Math.random() * 0.12;
            const current = power / (voltage * powerFactor);
            const apparentPower = power / powerFactor;

            phaseData[phase] = {
                voltage: Math.round(voltage * 10) / 10,
                current: Math.round(current * 1000) / 1000,
                act_power: Math.round(power * 10) / 10,        // Active power (W)
                aprt_power: Math.round(apparentPower * 10) / 10, // Apparent power (VA)
                pf: Math.round(powerFactor * 100) / 100,
                freq: Math.round(frequency * 10) / 10
            };
        }

        // Total power across all phases
        const totalPower = phasePowers.a + phasePowers.b + phasePowers.c;

        // Shelly Pro 3EM native format (em:0 status)
        return {
            id: 0,
            // Phase A
            a_current: phaseData.a.current,
            a_voltage: phaseData.a.voltage,
            a_act_power: phaseData.a.act_power,
            a_aprt_power: phaseData.a.aprt_power,
            a_pf: phaseData.a.pf,
            a_freq: phaseData.a.freq,
            // Phase B
            b_current: phaseData.b.current,
            b_voltage: phaseData.b.voltage,
            b_act_power: phaseData.b.act_power,
            b_aprt_power: phaseData.b.aprt_power,
            b_pf: phaseData.b.pf,
            b_freq: phaseData.b.freq,
            // Phase C
            c_current: phaseData.c.current,
            c_voltage: phaseData.c.voltage,
            c_act_power: phaseData.c.act_power,
            c_aprt_power: phaseData.c.aprt_power,
            c_pf: phaseData.c.pf,
            c_freq: phaseData.c.freq,
            // Neutral current (calculated)
            n_current: Math.round(Math.abs(
                phaseData.a.current - phaseData.b.current + phaseData.c.current
            ) * 100) / 100,
            // Total
            total_current: Math.round((
                phaseData.a.current + phaseData.b.current + phaseData.c.current
            ) * 1000) / 1000,
            total_act_power: Math.round(totalPower * 10) / 10,
            total_aprt_power: Math.round((
                phaseData.a.aprt_power + phaseData.b.aprt_power + phaseData.c.aprt_power
            ) * 10) / 10,
            // Extended metadata (our addition for the app)
            _meta: {
                deviceId: this.id,
                deviceName: this.name,
                location: this.location,
                timestamp: timestamp,
                phaseBreakdown: {
                    a: { power: phasePowers.a, appliances: this.getAppliancesOnPhase('a') },
                    b: { power: phasePowers.b, appliances: this.getAppliancesOnPhase('b') },
                    c: { power: phasePowers.c, appliances: this.getAppliancesOnPhase('c') }
                }
            }
        };
    }

    /**
     * Get list of active appliances on a phase
     */
    getAppliancesOnPhase(phase) {
        const active = [];

        for (const [applianceKey, phaseAssignment] of Object.entries(this.phaseMapping)) {
            if (phaseAssignment === phase && this.appliances[applianceKey]) {
                const appliance = this.appliances[applianceKey];
                if (appliance.currentPower > 10) { // More than standby
                    active.push({
                        name: appliance.name,
                        power: Math.round(appliance.currentPower)
                    });
                }
            }
        }

        return active;
    }

    /**
     * Generate energy totals message (emdata:0 status)
     */
    generateEnergyTotalsMessage() {
        return {
            id: 0,
            a_total_act_energy: Math.round(this.phaseEnergy.a.total * 1000) / 1000,
            a_total_act_ret_energy: 0, // No solar/return in this simulation
            b_total_act_energy: Math.round(this.phaseEnergy.b.total * 1000) / 1000,
            b_total_act_ret_energy: 0,
            c_total_act_energy: Math.round(this.phaseEnergy.c.total * 1000) / 1000,
            c_total_act_ret_energy: 0,
            total_act: Math.round(
                (this.phaseEnergy.a.total + this.phaseEnergy.b.total + this.phaseEnergy.c.total) * 1000
            ) / 1000,
            total_act_ret: 0
        };
    }

    /**
     * Get current status
     */
    getStatus() {
        const totalPower =
            this.calculateBaseLoad('a') + this.getAppliancePowerForPhase('a') +
            this.calculateBaseLoad('b') + this.getAppliancePowerForPhase('b') +
            this.calculateBaseLoad('c') + this.getAppliancePowerForPhase('c');

        return {
            id: this.id,
            name: this.name,
            totalPower: Math.round(totalPower),
            totalEnergy: Math.round(
                (this.phaseEnergy.a.total + this.phaseEnergy.b.total + this.phaseEnergy.c.total) * 1000
            ) / 1000,
            phases: {
                a: Math.round(this.calculateBaseLoad('a') + this.getAppliancePowerForPhase('a')),
                b: Math.round(this.calculateBaseLoad('b') + this.getAppliancePowerForPhase('b')),
                c: Math.round(this.calculateBaseLoad('c') + this.getAppliancePowerForPhase('c'))
            }
        };
    }
}

module.exports = ShellyPro3EMSimulator;