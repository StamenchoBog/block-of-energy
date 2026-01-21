/**
 * Dishwasher Simulator
 *
 * Simulates a dishwasher that runs every 2nd day with realistic
 * cycle phases: fill, heat, wash, rinse, dry.
 */

const BaseAppliance = require('./BaseAppliance');

class DishwasherSimulator extends BaseAppliance {
    constructor(config) {
        super(config);
        this.phases = config.cycle.phases;
        this.totalCycleDuration = config.cycle.totalDuration;
    }

    /**
     * Check if dishwasher should start a new cycle
     * Runs every 2nd day during preferred evening hours
     */
    shouldStartCycle(currentTime = new Date()) {
        if (this.isOn) return false;

        const today = currentTime.toISOString().split('T')[0];
        const hour = currentTime.getHours();
        const schedule = this.config.schedule;

        // Check if we already ran today
        if (this.lastRunDate === today) return false;

        // Check if it's a running day (every Nth day)
        if (this.lastRunDate) {
            const lastRun = new Date(this.lastRunDate);
            const daysSinceLastRun = Math.floor(
                (currentTime - lastRun) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastRun < schedule.frequencyDays) return false;
        }

        // Check if it's a preferred hour
        if (!schedule.preferredHours.includes(hour)) return false;

        // Random chance to start (adds natural variation)
        // Higher chance as we get later in preferred hours
        const hourIndex = schedule.preferredHours.indexOf(hour);
        const startProbability = 0.3 + (hourIndex * 0.2);

        return Math.random() < startProbability;
    }

    /**
     * Update dishwasher state during cycle
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

                // Get power for this phase with realistic variation
                const basePower = this.config.power[phase.power];
                // Resistive heating is very stable (±2%), motors vary slightly more (±3%)
                const variation = phase.power === 'heating' ? 0.02 : 0.03;
                this.currentPower = this.addVariation(basePower, variation);

                break;
            }
            elapsedMinutes += phase.duration;
        }

        return this.currentPower;
    }
}

module.exports = DishwasherSimulator;