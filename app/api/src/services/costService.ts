/**
 * Cost Calculation Service - Macedonia EVN Tariffs
 */

import { loadTariffConfig, TariffConfig } from '../config/tariffConfig';
import { CostBreakdown, CostEstimate } from '../models/energy';

export class CostService {
  private config: TariffConfig;

  constructor() {
    this.config = loadTariffConfig();
  }

  /**
   * Check if timestamp falls within low tariff hours
   * - Weekdays: 13:00-15:00 and 22:00-07:00
   * - Weekend: Saturday 22:00 to Monday 07:00
   */
  isLowTariffTime(timestamp: Date): boolean {
    const hour = timestamp.getHours();
    const day = timestamp.getDay(); // 0=Sunday, 6=Saturday

    // Check weekend period (Sat 22:00 - Mon 07:00)
    if (day === 0) return true; // All of Sunday
    if (day === 6 && hour >= 22) return true; // Saturday after 22:00
    if (day === 1 && hour < 7) return true; // Monday before 07:00

    // Weekday low-tariff windows
    if (hour >= 13 && hour < 15) return true; // Afternoon: 13:00-15:00
    if (hour >= 22 || hour < 7) return true;  // Overnight: 22:00-07:00

    return false;
  }

  /**
   * Calculate cost using progressive block tariff
   */
  calculateBlockCost(energyKwh: number, cumulativeMonthlyKwh: number = 0): number {
    const blocks = this.config.highTariff.blocks;
    let remaining = energyKwh;
    let position = cumulativeMonthlyKwh;
    let totalCost = 0;

    for (const block of blocks) {
      if (remaining <= 0) break;
      if (position >= block.max) continue;

      const blockStart = Math.max(position, block.min);
      const blockEnd = Math.min(position + remaining, block.max);
      const energyInBlock = blockEnd - blockStart;

      if (energyInBlock > 0) {
        totalCost += energyInBlock * block.rate;
        remaining -= energyInBlock;
        position += energyInBlock;
      }
    }

    return Math.round(totalCost * 100) / 100;
  }

  getEffectiveRate(cumulativeMonthlyKwh: number): number {
    for (const block of this.config.highTariff.blocks) {
      if (cumulativeMonthlyKwh <= block.max) return block.rate;
    }
    return this.config.highTariff.blocks[this.config.highTariff.blocks.length - 1].rate;
  }

  calculateReadingCost(energyKwh: number, timestamp: Date, cumulativeMonthlyKwh: number = 0): CostBreakdown {
    const isLowTariff = this.isLowTariffTime(timestamp);

    if (isLowTariff) {
      return {
        cost: Math.round(energyKwh * this.config.lowTariff.rate * 100) / 100,
        tariffType: 'low',
        rate: this.config.lowTariff.rate,
        currency: this.config.currency
      };
    }

    return {
      cost: this.calculateBlockCost(energyKwh, cumulativeMonthlyKwh),
      tariffType: 'high',
      rate: this.getEffectiveRate(cumulativeMonthlyKwh + energyKwh),
      currency: this.config.currency
    };
  }

  calculateTodayEstimate(energyToday: number, currentHour: number): CostEstimate {
    // Assume 60% high tariff, 40% low tariff (rough EVN average)
    const highEnergy = energyToday * 0.6;
    const lowEnergy = energyToday * 0.4;

    const avgHighRate = (this.config.highTariff.blocks[0].rate + this.config.highTariff.blocks[1].rate) / 2;
    const estimatedCost = (highEnergy * avgHighRate) + (lowEnergy * this.config.lowTariff.rate);

    const hoursElapsed = Math.max(currentHour, 1);
    const projectedDaily = (estimatedCost / hoursElapsed) * 24;

    return {
      value: Math.round(estimatedCost * 100) / 100,
      currency: this.config.currency,
      confidence: hoursElapsed < 8 ? 'low' : hoursElapsed < 16 ? 'medium' : 'high',
      projectedDaily: Math.round(projectedDaily * 100) / 100
    };
  }

  getTariffConfig(): TariffConfig {
    return this.config;
  }
}

let instance: CostService | null = null;
export const getCostService = () => instance || (instance = new CostService());