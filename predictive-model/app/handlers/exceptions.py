import logging
from fastapi import Request
from fastapi.responses import JSONResponse

from app.exceptions import (
    ModelNotTrainedError,
    InsufficientDataError,
    DatabaseConnectionError,
    ModelTrainingError,
    PredictionError,
    ResourceLimitError,
)

logger = logging.getLogger(__name__)


def setup_exception_handlers(app):
    """Setup all exception handlers for the FastAPI app."""

    @app.exception_handler(ModelNotTrainedError)
    async def model_not_trained_handler(request: Request, exc: ModelNotTrainedError):
        logger.warning(f"Model not trained: {exc.message}")
        return JSONResponse(
            status_code=503,
            content={"detail": exc.message, "error_code": exc.error_code},
        )

    @app.exception_handler(InsufficientDataError)
    async def insufficient_data_handler(request: Request, exc: InsufficientDataError):
        logger.warning(f"Insufficient data: {exc.message}")
        return JSONResponse(
            status_code=400,
            content={"detail": exc.message, "error_code": exc.error_code},
        )

    @app.exception_handler(DatabaseConnectionError)
    async def database_error_handler(request: Request, exc: DatabaseConnectionError):
        logger.error(f"Database error: {exc.message}")
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Service temporarily unavailable - database error",
                "error_code": exc.error_code,
            },
        )

    @app.exception_handler(PredictionError)
    async def prediction_error_handler(request: Request, exc: PredictionError):
        logger.error(f"Prediction error: {exc.message}")
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Prediction service temporarily unavailable",
                "error_code": exc.error_code,
            },
        )

    @app.exception_handler(ResourceLimitError)
    async def resource_limit_handler(request: Request, exc: ResourceLimitError):
        logger.warning(f"Resource limit exceeded: {exc.message}")
        return JSONResponse(
            status_code=429,
            content={"detail": exc.message, "error_code": exc.error_code},
        )
