import logging
from typing import Callable, Optional

from fastapi import FastAPI, Request
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

EXCEPTION_CONFIG = {
    ModelNotTrainedError: (503, "warning", None),
    InsufficientDataError: (400, "warning", None),
    DatabaseConnectionError: (503, "error", "Service temporarily unavailable - database error"),
    PredictionError: (503, "error", "Prediction service temporarily unavailable"),
    ResourceLimitError: (429, "warning", None),
}


def _create_exception_handler(
    status_code: int, log_level: str, custom_detail: Optional[str]
) -> Callable:
    """Factory function to create standardized exception handlers."""

    async def handler(request: Request, exc):
        log_func = getattr(logger, log_level)
        log_func(f"{exc.__class__.__name__}: {exc.message}")

        detail = custom_detail if custom_detail else exc.message
        return JSONResponse(
            status_code=status_code,
            content={"detail": detail, "error_code": exc.error_code},
        )

    return handler


def setup_exception_handlers(app: FastAPI) -> None:
    """Setup all exception handlers for the FastAPI app."""
    for exc_class, (status_code, log_level, custom_detail) in EXCEPTION_CONFIG.items():
        handler = _create_exception_handler(status_code, log_level, custom_detail)
        app.add_exception_handler(exc_class, handler)
