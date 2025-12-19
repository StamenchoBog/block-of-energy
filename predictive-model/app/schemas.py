from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal
from datetime import datetime

from app.config import settings


class ForecastPoint(BaseModel):
    timestamp: datetime
    predicted_power: float = Field(
        ge=0, description="Predicted power cannot be negative"
    )
    lower_bound: float = Field(ge=0, description="Lower bound cannot be negative")
    upper_bound: float


class ModelInfo(BaseModel):
    name: str
    accuracy_mape: float = Field(
        ge=0, le=1, description="MAPE should be between 0 and 1"
    )
    last_trained: str


class ForecastResponse(BaseModel):
    predictions: List[ForecastPoint]
    model_info: ModelInfo


class TrainingStatus(BaseModel):
    is_trained: bool
    last_trained: Optional[datetime] = None
    data_points_used: int = Field(ge=0, description="Data points cannot be negative")
    status: str


class AnomalyPoint(BaseModel):
    timestamp: datetime
    actual_power: float = Field(ge=0, description="Actual power cannot be negative")
    expected_power: float = Field(ge=0, description="Expected power cannot be negative")
    anomaly_score: float = Field(
        ge=0, le=1, description="Anomaly score should be between 0 and 1"
    )
    anomaly_type: Literal["spike", "dip", "pattern_change"]


class AnomalySummary(BaseModel):
    total_count: int = Field(ge=0, description="Total count cannot be negative")
    severity: Literal["low", "medium", "high"]


class AnomalyResponse(BaseModel):
    anomalies: List[AnomalyPoint]
    summary: AnomalySummary


class ForecastRequest(BaseModel):
    hours: int = Field(
        default=24,
        ge=settings.MIN_HOURS,
        le=settings.MAX_FORECAST_HOURS,
        description=f"Hours to forecast (must be between {settings.MIN_HOURS} and {settings.MAX_FORECAST_HOURS})",
    )


class AnomalyRequest(BaseModel):
    hours: int = Field(
        default=24,
        ge=settings.MIN_HOURS,
        le=settings.MAX_ANOMALY_HOURS,
        description=f"Hours to analyze (must be between {settings.MIN_HOURS} and {settings.MAX_ANOMALY_HOURS})",
    )
    sensitivity: float = Field(
        default=0.8,
        ge=settings.MIN_SENSITIVITY,
        le=settings.MAX_SENSITIVITY,
        description=f"Sensitivity (must be between {settings.MIN_SENSITIVITY} and {settings.MAX_SENSITIVITY})",
    )
