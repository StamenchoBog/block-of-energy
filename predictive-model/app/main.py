from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware import Middleware
from fastapi.middleware.gzip import GZipMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging

from app.config import settings
from app.models.forecaster import forecaster
from app.models.anomaly_detector import anomaly_detector
from app.services.data_service import data_service
from app.utils.validation import validate_range
from app.schemas import (
    ForecastResponse,
    TrainingStatus,
    AnomalyResponse,
    DataCollectionStatus,
)
from app.middleware.timeout import timeout_middleware
from app.handlers.exceptions import setup_exception_handlers
from app.api.health import router as health_router
from app.core.lifecycle import setup_lifespan, tune_models_job
from app.tuning.hyperparameter_tuner import tuner

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("energy-api")

# Database setup
db_client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_client
    db_client = AsyncIOMotorClient(settings.DATABASE_URL)
    async for _ in setup_lifespan(app, db_client):
        yield


app = FastAPI(
    lifespan=lifespan,
    title="Energy Prediction Service",
    middleware=[Middleware(GZipMiddleware, minimum_size=1000)],
)

# Setup middleware and exception handlers
app.middleware("http")(timeout_middleware)
setup_exception_handlers(app)

# Include routers
app.include_router(health_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/model/status", response_model=TrainingStatus)
async def get_model_status():
    return {
        "is_trained": forecaster.is_trained,
        "last_trained": forecaster.last_trained,
        "data_points_used": forecaster.data_points_used,
        "status": "ready" if forecaster.is_trained else "initializing",
    }


async def check_data_sufficiency():
    """Check if we have enough data for reliable predictions."""
    is_sufficient, days_available, days_required = await data_service.has_sufficient_data()
    if not is_sufficient:
        progress = min(100.0, (days_available / days_required) * 100)
        days_remaining = max(0, days_required - days_available)
        return DataCollectionStatus(
            status="collecting_data",
            days_available=round(days_available, 1),
            days_required=days_required,
            progress_percent=round(progress, 1),
            message=f"Collecting data: {days_available:.1f} of {days_required} days. "
                    f"~{days_remaining:.1f} days remaining for reliable predictions."
        )
    return None


@app.get("/forecast")
async def get_forecast(hours: int = 24, past_context_hours: int = 0):
    """Get energy consumption forecast.

    Args:
        hours: Number of future hours to forecast (default: 24)
        past_context_hours: Hours of past data for context/hindcast (default: 0)

    Returns:
        ForecastResponse if sufficient data, DataCollectionStatus otherwise
    """
    # Check if we have enough data for reliable predictions
    collection_status = await check_data_sufficiency()
    if collection_status:
        return collection_status

    # Input validation
    validate_range(hours, settings.MIN_HOURS, settings.MAX_FORECAST_HOURS, "Hours")

    # Limit past context to 33% of forecast hours (max 16h)
    max_past_context = min(hours // 3, 16)
    past_context_hours = max(0, min(past_context_hours, max_past_context))

    # Custom exceptions (ModelNotTrainedError, PredictionError) are handled
    # by the global exception handlers registered in setup_exception_handlers()
    preds = await forecaster.predict_async(
        hours=hours, past_context_hours=past_context_hours
    )

    return {
        "predictions": preds,
        "model_info": {
            "name": "prophet-v1",
            "accuracy_mape": 0.05,  # Placeholder - would calculate real accuracy in train()
            "last_trained": str(forecaster.last_trained),
        },
    }


@app.get("/anomalies")
async def get_anomalies(hours: int = 24, sensitivity: float = 0.8):
    """Detect anomalies in recent energy consumption data.

    Returns:
        AnomalyResponse if sufficient data, DataCollectionStatus otherwise
    """
    from app.exceptions import DatabaseConnectionError

    # Check if we have enough data for reliable predictions
    collection_status = await check_data_sufficiency()
    if collection_status:
        return collection_status

    # Input validation
    validate_range(hours, settings.MIN_HOURS, settings.MAX_ANOMALY_HOURS, "Hours")
    validate_range(
        sensitivity, settings.MIN_SENSITIVITY, settings.MAX_SENSITIVITY, "Sensitivity"
    )

    # Get recent data for anomaly detection
    # Graceful degradation - return empty results on DB errors instead of failing
    try:
        data = await data_service.get_recent_data(hours=hours)
        if not data:
            return {"anomalies": [], "summary": {"total_count": 0, "severity": "low"}}
    except DatabaseConnectionError as e:
        logger.error(f"Database error during anomaly detection: {e.message}")
        return {"anomalies": [], "summary": {"total_count": 0, "severity": "low"}}

    # Custom exceptions (ModelNotTrainedError, PredictionError) are handled
    # by the global exception handlers registered in setup_exception_handlers()
    anomalies = await anomaly_detector.detect_async(data, sensitivity=sensitivity)
    summary = anomaly_detector.get_summary(anomalies)

    return {"anomalies": anomalies, "summary": summary}


@app.post("/model/train")
async def trigger_training(background_tasks: BackgroundTasks):
    """Manually trigger model retraining."""
    from app.core.lifecycle import train_models_job

    background_tasks.add_task(train_models_job)
    return {"message": "Training triggered in background"}


@app.get("/tuning/params")
async def get_tuning_params():
    """Get current hyperparameters (tuned or default)."""
    params = tuner.load_params()
    if params:
        return {
            "status": "tuned",
            "params": params,
        }
    return {
        "status": "default",
        "params": {
            "prophet": tuner.get_prophet_params(),
            "isolation_forest": tuner.get_isolation_forest_params(),
        },
    }


@app.post("/tuning/run")
async def trigger_tuning(background_tasks: BackgroundTasks):
    """Manually trigger hyperparameter tuning."""
    if not settings.ENABLE_AUTO_TUNING:
        raise HTTPException(
            status_code=400,
            detail="Auto-tuning is disabled. Set ENABLE_AUTO_TUNING=true in config.",
        )

    background_tasks.add_task(tune_models_job)
    return {
        "message": "Hyperparameter tuning triggered in background",
        "note": "This may take several minutes. Check /tuning/params for results.",
    }
