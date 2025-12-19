import logging
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.forecaster import forecaster
from app.models.anomaly_detector import anomaly_detector
from app.services.data_service import data_service
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health/detailed")
async def detailed_health():
    """Detailed health check including database and models."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": {"status": "unknown"},
            "forecaster": {"status": "unknown"},
            "anomaly_detector": {"status": "unknown"},
            "scheduler": {"status": "unknown"},
        },
    }

    # Check database connection
    try:
        if data_service._client:
            # Ping the database
            await data_service._client.admin.command("ping")
            health_status["services"]["database"] = {
                "status": "healthy",
                "details": f"Connected to {settings.MONGODB_DATABASE}",
            }
        else:
            health_status["services"]["database"] = {
                "status": "unhealthy",
                "details": "No database connection",
            }
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "details": f"Connection failed: {str(e)}",
        }
        health_status["status"] = "degraded"

    # Check forecaster
    try:
        if forecaster.is_trained:
            health_status["services"]["forecaster"] = {
                "status": "healthy",
                "details": f"Trained with {forecaster.data_points_used} points",
                "last_trained": forecaster.last_trained.isoformat()
                if forecaster.last_trained
                else None,
            }
        else:
            health_status["services"]["forecaster"] = {
                "status": "initializing",
                "details": "Model not yet trained",
            }
            if health_status["status"] == "healthy":
                health_status["status"] = "initializing"
    except Exception as e:
        health_status["services"]["forecaster"] = {
            "status": "unhealthy",
            "details": f"Error: {str(e)}",
        }
        health_status["status"] = "degraded"

    # Check anomaly detector
    try:
        if anomaly_detector.is_trained:
            health_status["services"]["anomaly_detector"] = {
                "status": "healthy",
                "details": f"Trained with {anomaly_detector.data_points_used} points",
                "last_trained": anomaly_detector.last_trained.isoformat()
                if anomaly_detector.last_trained
                else None,
            }
        else:
            health_status["services"]["anomaly_detector"] = {
                "status": "initializing",
                "details": "Model not yet trained",
            }
            if health_status["status"] == "healthy":
                health_status["status"] = "initializing"
    except Exception as e:
        health_status["services"]["anomaly_detector"] = {
            "status": "unhealthy",
            "details": f"Error: {str(e)}",
        }
        health_status["status"] = "degraded"

    # Return appropriate HTTP status based on overall health
    if health_status["status"] == "healthy":
        return health_status
    elif health_status["status"] == "initializing":
        return JSONResponse(status_code=202, content=health_status)
    else:
        return JSONResponse(status_code=503, content=health_status)
