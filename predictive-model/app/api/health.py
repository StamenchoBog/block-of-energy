import logging
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.forecaster import forecaster
from app.models.anomaly_detector import anomaly_detector
from app.services.data_service import data_service
from app.config import settings
from app.core.lifecycle import get_scheduler_status

logger = logging.getLogger(__name__)

router = APIRouter()


def _check_model_health(model: Any, service_name: str, health_status: Dict) -> None:
    """Check health of a ML model and update health_status dict."""
    try:
        if model.is_trained:
            health_status["services"][service_name] = {
                "status": "healthy",
                "details": f"Trained with {model.data_points_used} points",
                "last_trained": (
                    model.last_trained.isoformat() if model.last_trained else None
                ),
            }
        else:
            health_status["services"][service_name] = {
                "status": "initializing",
                "details": "Model not yet trained",
            }
            if health_status["status"] == "healthy":
                health_status["status"] = "initializing"
    except Exception as e:
        health_status["services"][service_name] = {
            "status": "unhealthy",
            "details": f"Error: {str(e)}",
        }
        health_status["status"] = "degraded"


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
            await data_service._client.admin.command("ping")
            health_status["services"]["database"] = {
                "status": "healthy",
                "details": f"Connected to {settings.DATABASE_NAME}",
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

    # Check ML models health
    _check_model_health(forecaster, "forecaster", health_status)
    _check_model_health(anomaly_detector, "anomaly_detector", health_status)

    # Check scheduler health
    scheduler_status = get_scheduler_status()
    health_status["services"]["scheduler"] = scheduler_status

    # Return appropriate response based on status
    if health_status["status"] == "healthy":
        return health_status
    elif health_status["status"] == "initializing":
        return JSONResponse(status_code=202, content=health_status)
    else:
        return JSONResponse(status_code=503, content=health_status)
