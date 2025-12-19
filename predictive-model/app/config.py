import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SERVICE_PORT: int = 8000
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "telemetry-db"
    MONGODB_COLLECTION: str = "sensor-measurements"

    # Database connection pooling
    MONGODB_MAX_POOL_SIZE: int = 10
    MONGODB_MIN_POOL_SIZE: int = 2
    MONGODB_MAX_IDLE_TIME_MS: int = 30000
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: int = 5000
    MONGODB_CONNECT_TIMEOUT_MS: int = 5000

    # Model parameters
    RETRAIN_INTERVAL_HOURS: int = 24
    MIN_TRAINING_DATA_POINTS: int = 48

    # Resource limits
    MAX_QUERY_LIMIT: int = 50000
    MAX_FORECAST_HOURS: int = 168  # 1 week
    MAX_ANOMALY_HOURS: int = 72  # 3 days
    REQUEST_TIMEOUT_SECONDS: int = 30

    # Input validation bounds
    MIN_HOURS: int = 1
    MAX_SENSITIVITY: float = 1.0
    MIN_SENSITIVITY: float = 0.1

    class Config:
        env_file = ".env"


settings = Settings()
