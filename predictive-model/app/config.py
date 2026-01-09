import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SERVICE_PORT: int = 8000
    DATABASE_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "telemetry-db"
    DATABASE_COLLECTION: str = "sensor-measurements"

    # Database connection pooling
    DATABASE_MAX_POOL_SIZE: int = 10
    DATABASE_MIN_POOL_SIZE: int = 2
    DATABASE_MAX_IDLE_TIME_MS: int = 30000
    DATABASE_SERVER_SELECTION_TIMEOUT_MS: int = 5000
    DATABASE_CONNECT_TIMEOUT_MS: int = 5000

    # Model parameters
    RETRAIN_INTERVAL_HOURS: int = 24
    MIN_TRAINING_DATA_POINTS: int = 48
    MIN_RELIABLE_DATA_DAYS: int = 0

    # Hyperparameter tuning settings
    TUNING_INTERVAL_DAYS: int = 7
    TUNING_CV_FOLDS: int = 4
    TUNING_MIN_TRAIN_DAYS: int = 3
    BEST_PARAMS_FILE: str = "best_params.json"
    ENABLE_AUTO_TUNING: bool = True

    # Resource limits
    MAX_QUERY_LIMIT: int = 50000
    MAX_FORECAST_HOURS: int = 48
    MAX_ANOMALY_HOURS: int = 48
    REQUEST_TIMEOUT_SECONDS: int = 30

    # Input validation bounds
    MIN_HOURS: int = 1
    MAX_SENSITIVITY: float = 1.0
    MIN_SENSITIVITY: float = 0.1

    # Anomaly detection thresholds
    ANOMALY_MIN_POWER_DIFF: int = 50  # Minimum power difference (watts) to catch appliance degradation
    ANOMALY_SPIKE_THRESHOLD: float = 1.5  # Multiplier for spike detection (actual > expected * threshold)
    ANOMALY_DIP_THRESHOLD: float = 0.5  # Multiplier for dip detection (actual < expected * threshold)
    ANOMALY_SEVERITY_HIGH_COUNT: int = 10  # Count threshold for high severity
    ANOMALY_SEVERITY_MEDIUM_COUNT: int = 5  # Count threshold for medium severity
    ANOMALY_SEVERITY_HIGH_SCORE: float = 0.8  # Score threshold for high severity
    ANOMALY_SEVERITY_MEDIUM_SCORE: float = 0.6  # Score threshold for medium severity

    # Feature extraction settings
    ROLLING_WINDOW_SIZE: int = 24  # Window size for rolling statistics (24 hours captures daily patterns)

    # Forecaster cache settings
    FORECAST_CACHE_TTL_SECONDS: int = 3600  # 1 hour cache TTL

    class Config:
        env_file = ".env"


settings = Settings()
