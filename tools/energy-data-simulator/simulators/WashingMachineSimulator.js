/**
 * Washing Machine Simulator
 *
 * Simulates a washing machine that runs every 2 days with
 * realistic cycle phases: fill, heat, wash, rinse, spin.
 */

const BaseAppliance = require('./BaseAppliance');

class WashingMachineSimulator extends BaseAppliance {
    constructor(config) {
        super(config);
        this.phases = config.cycle.phases;
        this.totalCycleDuration = config.cycle.totalDuration;
    }

    /**
     * Check if washing machine should start a new cycle
     * Runs every 2nd day during morning or evening hours
     */
    shouldStartCycle(currentTime = new Date()) {
        if (this.isOn) return false;

        const today = currentTime.toISOString().split('T')[0];
        const hour = currentTime.getHours();
        const schedule = this.config.schedule;

        // Check if we already ran today
        if (this.lastRunDate === today) return false;

        // Check if enough days have passed
        if (this.lastRunDate) {
            const lastRun = new Date(this.lastRunDate);
            const daysSinceLastRun = Math.floor(
                (currentTime - lastRun) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastRun < schedule.frequencyDays) return false;
        }

        // Check if it's a preferred hour
        if (!schedule.preferredHours.includes(hour)) return false;

        // Random chance to start within preferred hours
        // Morning slots have slightly higher probability (people doing laundry before work)
        const isMorning = hour < 12;
        const startProbability = isMorning ? 0.4 : 0.25;

        return Math.random() < startProbability;
    }

    /**
     * Update washing machine state during cycle
     */
    update(currentTime = new Date()) {
        // Check if we should start a new cycle
        if (!this.isOn && this.shouldStartCycle(currentTime)) {
            this.startCycle();
        }

        // If not running, return standby power
        if (!this.isOn) {
            this.currentPower = this.config.power.standby;
            this.currentPhase = 'standby';
            return this.currentPower;
        }

        // Calculate current phase based on elapsed time
        const cycleMinutes = this.getCycleMinutes();

        // Check if cycle is complete
        if (cycleMinutes >= this.totalCycleDuration) {
            this.endCycle();
            return this.currentPower;
        }

        // Find current phase
        let elapsedMinutes = 0;
        for (let i = 0; i < this.phases.length; i++) {
            const phase = this.phases[i];
            if (cycleMinutes < elapsedMinutes + phase.duration) {
                this.currentPhase = phase.name;
                this.cyclePhaseIndex = i;

                // Get power for this phase
                const basePower = this.config.power[phase.power];

                // Spinning phases have variable power (ramping up)
                if (phase.power === 'spinning') {
                    const phaseProgress = (cycleMinutes - elapsedMinutes) / phase.duration;
                    // Spin starts slow, ramps up to full speed
                    const spinFactor = 0.5 + (phaseProgress * 0.5);
                    this.currentPower = this.addVariation(basePower * spinFactor, 0.1);
                } else {
                    this.currentPower = this.addVariation(basePower, 0.08);
                }

                break;
            }
            elapsedMinutes += phase.duration;
        }

        return this.currentPower;
    }

    /**
     * Override to log spin speed during spin cycles
     */
    getStatus() {
        const baseStatus = super.getStatus();

        if (this.currentPhase.includes('spin')) {
            const cycleMinutes = this.getCycleMinutes();
            let elapsedMinutes = 0;
            for (const phase of this.phases) {
                if (phase.name === this.currentPhase) {
                    const phaseProgress = (cycleMinutes - elapsedMinutes) / phase.duration;
                    baseStatus.spinRpm = Math.round(400 + phaseProgress * 800); // 400-1200 RPM
                    break;
                }
                elapsedMinutes += phase.duration;
            }
        }

        return baseStatus;
    }
}

module.exports = WashingMachineSimulator;
