/**
 * Macedonia EVN Electricity Tariff Configuration (2025)
 *
 * Source: https://www.evn.mk/AboutInvoices/TariffSystem.aspx
 * Effective from: 01.01.2025
 *
 * Pricing Structure:
 * - High tariff: Progressive block system (4 blocks)
 * - Low tariff: Flat rate regardless of consumption
 *
 * Low Tariff Hours:
 * - Weekdays: 13:00-15:00 and 22:00-07:00 (next day)
 * - Weekend: Saturday 22:00 to Monday 07:00
 */

export interface TariffBlock {
  min: number;        // Minimum kWh (inclusive)
  max: number;        // Maximum kWh (inclusive), Infinity for last block
  rate: number;       // MKD per kWh
}

export interface LowTariffPeriod {
  start: number;      // Hour (0-23)
  end: number;        // Hour (0-23), can be less than start for overnight
}

export interface TariffConfig {
  currency: string;
  currencySymbol: string;
  effectiveDate: string;
  highTariff: {
    blocks: TariffBlock[];
  };
  lowTariff: {
    rate: number;
  };
  lowTariffHours: {
    weekday: LowTariffPeriod[];
    weekendStart: { day: number; hour: number };  // 0=Sunday, 6=Saturday
    weekendEnd: { day: number; hour: number };
  };
}

/**
 * Default Macedonia EVN tariff configuration
 * All rates in MKD (Macedonian Denars) per kWh
 */
export const TARIFF_CONFIG: TariffConfig = {
  currency: 'MKD',
  currencySymbol: 'ден',
  effectiveDate: '2025-01-01',

  highTariff: {
    blocks: [
      { min: 0, max: 210, rate: 4.4376 },       // Block 1: Basic consumption
      { min: 211, max: 630, rate: 5.5664 },     // Block 2: Moderate consumption
      { min: 631, max: 1050, rate: 7.4314 },    // Block 3: High consumption
      { min: 1051, max: Infinity, rate: 18.3035 } // Block 4: Excessive consumption
    ]
  },

  lowTariff: {
    rate: 1.9765  // Flat rate for all low-tariff consumption
  },

  lowTariffHours: {
    // Weekday low-tariff windows
    weekday: [
      { start: 13, end: 15 },   // Afternoon: 13:00 - 15:00
      { start: 22, end: 7 }     // Overnight: 22:00 - 07:00 (next day)
    ],
    // Weekend low-tariff period (continuous)
    weekendStart: { day: 6, hour: 22 },  // Saturday 22:00
    weekendEnd: { day: 1, hour: 7 }      // Monday 07:00
  }
};

/**
 * Load tariff configuration with optional environment variable overrides
 * This allows customization without code changes
 */
export function loadTariffConfig(): TariffConfig {
  const config = { ...TARIFF_CONFIG };

  // Override rates from environment if provided
  if (process.env.TARIFF_LOW_RATE) {
    config.lowTariff.rate = parseFloat(process.env.TARIFF_LOW_RATE);
  }

  if (process.env.TARIFF_BLOCK1_RATE) {
    config.highTariff.blocks[0].rate = parseFloat(process.env.TARIFF_BLOCK1_RATE);
  }
  if (process.env.TARIFF_BLOCK2_RATE) {
    config.highTariff.blocks[1].rate = parseFloat(process.env.TARIFF_BLOCK2_RATE);
  }
  if (process.env.TARIFF_BLOCK3_RATE) {
    config.highTariff.blocks[2].rate = parseFloat(process.env.TARIFF_BLOCK3_RATE);
  }
  if (process.env.TARIFF_BLOCK4_RATE) {
    config.highTariff.blocks[3].rate = parseFloat(process.env.TARIFF_BLOCK4_RATE);
  }

  if (process.env.TARIFF_CURRENCY) {
    config.currency = process.env.TARIFF_CURRENCY;
  }

  return config;
}

export default TARIFF_CONFIG;