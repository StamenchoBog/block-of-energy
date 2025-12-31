# Energy Dashboard Frontend

Astro + React dashboard for energy monitoring, reporting, and anomaly visualization.

## Quick Start

```bash
pnpm install
pnpm dev
```

Or with Docker:
```bash
docker build -t energy-frontend .
docker run -p 4321:8080 energy-frontend
```

## Features

### Reports Tab
- **Period Selection**: Daily (hourly), Weekly, Monthly reports
- **Summary Cards**: Total energy, cost, peak power with period comparison
- **Device Breakdown**: Per-device consumption percentages
- **Data Table**: Detailed readings with dynamic columns
- **CSV Export**: Download reports for external analysis

### Charts Tab
- **Consumption Chart**: Power trends over selected period
- **Forecast Chart**: ML predictions with confidence bands
  - Hindcast (past 33%) shown as dashed line
  - Forecast (future 67%) shown as solid line
  - "Now" marker separating past/future
- **Anomaly Panel**: Detected inefficiencies with severity levels
  - Spike, dip, and pattern change classification
  - Anomaly score confidence percentage

## Configuration

Environment variables:

| Variable | Description |
|----------|-------------|
| `PUBLIC_API_URL` | Backend API base URL |

## Project Structure

```
src/
├── components/
│   ├── charts/       # EnergyChart, ForecastChart, AnomalyPanel
│   ├── layouts/      # BaseLayout, DashboardLayout
│   ├── reports/      # ReportsContainer, ReportTable, SummaryCards
│   └── ui/           # TabNavigation, LoadingStates, ErrorDisplay
├── hooks/
│   ├── useFormatters.js    # Date, currency, energy formatters
│   ├── usePredictions.js   # Forecast + anomaly fetching
│   └── useReportData.js    # Report generation
├── lib/
│   └── apiService.ts       # API client with error handling
└── pages/
    └── index.astro         # Main dashboard page
```

## Tech Stack

- **Astro** - Static site generation with islands architecture
- **React** - Interactive chart and report components
- **Tailwind CSS** - Utility-first styling
- **Chart.js** - Data visualization
