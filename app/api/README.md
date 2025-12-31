# Energy API Service

Express.js REST API for energy monitoring, reporting, and prediction proxy.

## Quick Start

```bash
pnpm install
pnpm dev
```

Or with Docker:
```bash
docker build -t energy-api .
docker run -p 3000:3000 \
  -e DATABASE_URL=mongodb://host:27017 \
  -e PREDICTION_SERVICE_URL=http://prediction:8000 \
  energy-api
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard_overview_data` | GET | Real-time metrics (power, voltage, hourly/daily data) |
| `/api/devices` | GET | List connected devices with last-seen timestamps |
| `/api/report` | GET | Generate daily/weekly/monthly reports |
| `/api/report/download` | GET | Download report as CSV |
| `/api/predictions/forecast` | GET | Energy forecast (proxy to ML service) |
| `/api/predictions/anomalies` | GET | Anomaly detection (proxy to ML service) |
| `/api/predictions/model/status` | GET | ML model training status |
| `/api/predictions/model/train` | POST | Trigger model retraining |

## Configuration

Environment variables (`.env` file supported):

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `DATABASE_URL` | Yes | MongoDB connection string |
| `DATABASE_NAME` | Yes | Database name |
| `PREDICTION_SERVICE_URL` | Yes | ML prediction service URL |
| `HIGH_TARIFF_RATE` | No | EVN high tariff rate (default: 5.57 MKD/kWh) |
| `LOW_TARIFF_RATE` | No | EVN low tariff rate (default: 2.78 MKD/kWh) |

## Features

- **Dashboard**: Real-time power metrics, 25-hour consumption history, 7-day summary
- **Reports**: Period comparison, device breakdown, cost calculation, CSV export
- **Predictions**: Proxies requests to ML service with caching (5-minute TTL)
- **Cost Calculation**: Macedonia EVN tariff-aware pricing with progressive blocks

## Project Structure

```
src/
├── config/         # Database, logger, tariff config
├── controllers/    # Request handlers
├── models/         # TypeScript interfaces
├── routes/         # Express route definitions
├── services/       # Business logic (dashboard, report, prediction, cost, cache)
└── types/          # Shared type definitions
```
