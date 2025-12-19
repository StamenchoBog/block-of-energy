class PredictionServiceError(Exception):
    """Base exception for prediction service errors."""

    def __init__(self, message: str, error_code: str = "PREDICTION_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class ModelNotTrainedError(PredictionServiceError):
    """Raised when trying to use an untrained model."""

    def __init__(self, model_name: str):
        super().__init__(
            f"Model '{model_name}' is not trained. Please wait for training to complete.",
            "MODEL_NOT_TRAINED",
        )


class InsufficientDataError(PredictionServiceError):
    """Raised when there's insufficient data for training."""

    def __init__(self, data_points: int, required: int):
        super().__init__(
            f"Insufficient data: {data_points} points available, {required} required",
            "INSUFFICIENT_DATA",
        )


class DatabaseConnectionError(PredictionServiceError):
    """Raised when database connection fails."""

    def __init__(self, message: str = "Database connection failed"):
        super().__init__(message, "DATABASE_CONNECTION_ERROR")


class ModelTrainingError(PredictionServiceError):
    """Raised when model training fails."""

    def __init__(self, model_name: str, reason: str):
        super().__init__(
            f"Training failed for model '{model_name}': {reason}",
            "MODEL_TRAINING_ERROR",
        )


class PredictionError(PredictionServiceError):
    """Raised when prediction fails."""

    def __init__(self, model_name: str, reason: str):
        super().__init__(
            f"Prediction failed for model '{model_name}': {reason}", "PREDICTION_ERROR"
        )


class ResourceLimitError(PredictionServiceError):
    """Raised when resource limits are exceeded."""

    def __init__(self, resource: str, limit: str):
        super().__init__(
            f"Resource limit exceeded for {resource}: {limit}",
            "RESOURCE_LIMIT_EXCEEDED",
        )
