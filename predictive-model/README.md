# Energy Prediction Service

FastAPI microservice for energy consumption forecasting and anomaly detection using Prophet and Isolation Forest.

## Quick Start

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or with Docker:

```bash
docker build -t energy-prediction .
docker run -p 8000:8000 -e DATABASE_URL=mongodb://host:27017 energy-prediction
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/forecast` | GET | Energy forecast with optional hindcast |
| `/anomalies` | GET | Detect consumption anomalies |
| `/model/status` | GET | Model training status |
| `/model/train` | POST | Trigger manual retraining |
| `/tuning/params` | GET | View current hyperparameters |
| `/tuning/run` | POST | Trigger hyperparameter tuning |
| `/health` | GET | Service health check |

### Forecast Parameters

- `hours` (1-48): Future hours to forecast (default: 24)
- `past_context_hours` (0-16): Past hours for hindcast visualization (max 33% of forecast)

### Anomaly Parameters

- `hours` (1-48): Hours of data to analyze (default: 24)
- `sensitivity` (0.1-1.0): Detection sensitivity (default: 0.8)

## Data Sufficiency

Predictions require **7 days minimum** of historical data. Before this threshold, endpoints return:

```json
{
  "status": "collecting_data",
  "days_available": 3.5,
  "days_required": 7,
  "progress_percent": 50.0,
  "message": "Collecting data: 3.5 of 7 days. ~3.5 days remaining."
}
```

## Configuration

Environment variables (or `.env` file):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `mongodb://localhost:27017` | MongoDB connection |
| `DATABASE_NAME` | `telemetry-db` | Database name |
| `DATABASE_COLLECTION` | `sensor-measurements` | Collection name |
| `RETRAIN_INTERVAL_HOURS` | `24` | Model retraining frequency |
| `ENABLE_AUTO_TUNING` | `true` | Enable hyperparameter tuning |
| `TUNING_INTERVAL_DAYS` | `7` | Tuning frequency |
| `MIN_RELIABLE_DATA_DAYS` | `7` | Minimum data before predictions |

## Models

### Forecaster (Prophet)

- Daily and weekly seasonality patterns
- Tunable: `changepoint_prior_scale`, `seasonality_prior_scale`, `seasonality_mode`
- Returns predictions with confidence intervals (lower/upper bounds)

### Anomaly Detector (Isolation Forest)
- Detects appliance efficiency degradation (fridges, ACs, water heaters)
- 8 engineered features: cyclical time encoding, rolling statistics (24h window)
- Percentile-based threshold with quadratic sensitivity scaling
- Types: `spike`, `dip`, `pattern_change`

## Project Structure

```
app/
├── api/            # Health and utility routes
├── core/           # Lifecycle, training jobs
├── handlers/       # Exception handlers
├── middleware/     # Timeout middleware
├── models/         # Forecaster, AnomalyDetector
├── services/       # DataService (MongoDB access)
├── tuning/         # Hyperparameter grid search
├── utils/          # Validation utilities
├── config.py       # Settings and thresholds
├── schemas.py      # Pydantic response models
└── main.py         # FastAPI application
```

## Hyperparameter Tuning

Grid search with time-series cross-validation runs weekly (configurable). Results cached in `best_params.json`.

```
Weekly tuning → best_params.json → Daily training uses cached params
```

Manual trigger: `POST /tuning/run`
