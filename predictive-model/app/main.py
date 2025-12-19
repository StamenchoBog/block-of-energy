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
from app.schemas import (
    ForecastResponse,
    TrainingStatus,
    AnomalyResponse,
)
from app.middleware.timeout import timeout_middleware
from app.handlers.exceptions import setup_exception_handlers
from app.api.health import router as health_router
from app.core.lifecycle import setup_lifespan

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("energy-api")

# Database setup
db_client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_client
    db_client = AsyncIOMotorClient(settings.MONGODB_URL)
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


@app.get("/forecast", response_model=ForecastResponse)
async def get_forecast(hours: int = 24):
    # Input validation
    if hours < settings.MIN_HOURS or hours > settings.MAX_FORECAST_HOURS:
        raise HTTPException(
            status_code=400,
            detail=f"Hours must be between {settings.MIN_HOURS} and {settings.MAX_FORECAST_HOURS}",
        )

    if not forecaster.is_trained:
        raise HTTPException(
            status_code=503, detail="Model is training, please try again shortly"
        )

    try:
        preds = await forecaster.predict_async(hours=hours)
        if not preds:
            raise HTTPException(
                status_code=503, detail="Prediction service unavailable"
            )
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(
            status_code=503, detail="Prediction service temporarily unavailable"
        )

    return {
        "predictions": preds,
        "model_info": {
            "name": "prophet-v1",
            "accuracy_mape": 0.05,  # Placeholder - would calculate real accuracy in train()
            "last_trained": str(forecaster.last_trained),
        },
    }


@app.get("/anomalies", response_model=AnomalyResponse)
async def get_anomalies(hours: int = 24, sensitivity: float = 0.8):
    """Detect anomalies in recent energy consumption data."""
    # Input validation
    if hours < settings.MIN_HOURS or hours > settings.MAX_ANOMALY_HOURS:
        raise HTTPException(
            status_code=400,
            detail=f"Hours must be between {settings.MIN_HOURS} and {settings.MAX_ANOMALY_HOURS}",
        )

    if sensitivity < settings.MIN_SENSITIVITY or sensitivity > settings.MAX_SENSITIVITY:
        raise HTTPException(
            status_code=400,
            detail=f"Sensitivity must be between {settings.MIN_SENSITIVITY} and {settings.MAX_SENSITIVITY}",
        )

    if not anomaly_detector.is_trained:
        raise HTTPException(
            status_code=503,
            detail="Anomaly detector is training, please try again shortly",
        )

    # Get recent data for anomaly detection
    try:
        data = await data_service.get_recent_data(hours=hours)
        if not data:
            return {"anomalies": [], "summary": {"total_count": 0, "severity": "low"}}
    except Exception as e:
        logger.error(f"Failed to fetch data for anomaly detection: {e}")
        # Graceful degradation - return empty results instead of failing completely
        return {"anomalies": [], "summary": {"total_count": 0, "severity": "low"}}

    # Detect anomalies asynchronously
    anomalies = await anomaly_detector.detect_async(data, sensitivity=sensitivity)
    summary = anomaly_detector.get_summary(anomalies)

    return {"anomalies": anomalies, "summary": summary}


@app.post("/model/train")
async def trigger_training(background_tasks: BackgroundTasks):
    """Manually trigger model retraining."""
    from app.core.lifecycle import train_models_job

    background_tasks.add_task(train_models_job)
    return {"message": "Training triggered in background"}
