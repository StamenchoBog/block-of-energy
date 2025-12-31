import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from datetime import datetime
from typing import List, Dict, Any, Optional
import logging

from app.config import settings
from app.models.base_model import BaseModelAsync
from app.tuning.hyperparameter_tuner import tuner, DEFAULT_ISOLATION_FOREST_PARAMS
from app.utils.feature_extraction import extract_time_series_features
from app.exceptions import (
    InsufficientDataError,
    ModelNotTrainedError,
    ModelTrainingError,
    PredictionError,
)

logger = logging.getLogger(__name__)


def calculate_anomaly_threshold(sensitivity: float, normalized_scores: np.ndarray) -> float:
    """
    Calculate the anomaly detection threshold based on sensitivity and score distribution.

    Uses a hybrid approach combining:
    - Non-linear (quadratic) scaling to prevent overly aggressive detection
    - Percentile-based adaptation to actual data distribution

    Args:
        sensitivity: User-provided sensitivity value (0.1 to 1.0)
                    Higher values = more anomalies detected
        normalized_scores: Array of normalized anomaly scores (0-1, higher = more anomalous)

    Returns:
        threshold: Score threshold above which points are flagged as anomalies

    Examples:
        sensitivity=0.8 → targets ~top 10% most anomalous points
        sensitivity=0.5 → targets ~top 3% most anomalous points
        sensitivity=0.2 → targets ~top 0.5% most anomalous points
    """
    # Quadratic scaling: makes high sensitivity values less extreme
    # sensitivity=0.8 → scaled=0.64, sensitivity=0.5 → scaled=0.25
    scaled_sensitivity = sensitivity ** 2

    # Convert to target percentile (what percentage of points to flag)
    # Max ~15% at sensitivity=1.0, down to ~1% at sensitivity=0.1
    target_anomaly_percent = scaled_sensitivity * 15

    # Calculate percentile threshold from actual score distribution
    # Higher percentile = higher threshold = fewer anomalies flagged
    percentile_rank = 100 - target_anomaly_percent
    percentile_threshold = np.percentile(normalized_scores, percentile_rank)

    # Ensure minimum threshold of 0.5 to avoid flagging normal variations
    # Even at max sensitivity, we want scores to be notably high
    min_threshold = 0.5
    threshold = max(percentile_threshold, min_threshold)

    return threshold


class AnomalyDetector(BaseModelAsync):
    """Isolation Forest-based anomaly detection for energy consumption."""

    def __init__(self):
        super().__init__()
        # Contamination is the expected proportion of anomalies
        # Using "auto" lets the algorithm decide based on data distribution
        self.contamination = "auto"

    async def train_async(self, data: List[Dict[str, Any]]) -> bool:
        """Async training method that runs in thread pool."""
        async with self._training_lock:
            if len(data) < settings.MIN_TRAINING_DATA_POINTS:
                raise InsufficientDataError(len(data), settings.MIN_TRAINING_DATA_POINTS)

            result = await self._run_in_executor(self._train_sync, data)
            return result if result is not None else False

    def train(self, data: List[Dict[str, Any]]) -> bool:
        """Synchronous training method for backward compatibility."""
        return self._train_sync(data)

    def _train_sync(self, data: List[Dict[str, Any]]) -> bool:
        """Internal synchronous training method."""
        df = pd.DataFrame(data)
        features = extract_time_series_features(df)

        # Load tuned hyperparameters (falls back to defaults if none cached)
        params = tuner.get_isolation_forest_params()
        logger.info(
            f"Training Isolation Forest on {len(features)} data points with params: "
            f"n_estimators={params.get('n_estimators')}, "
            f"contamination={params.get('contamination')}, "
            f"max_features={params.get('max_features')}"
        )

        self.model = IsolationForest(
            n_estimators=params.get("n_estimators", 100),
            contamination=params.get("contamination", "auto"),
            max_features=params.get("max_features", 1.0),
            random_state=params.get("random_state", 42),
            n_jobs=params.get("n_jobs", -1),
        )
        try:
            self.model.fit(features)
        except Exception as e:
            raise ModelTrainingError("anomaly_detector", str(e)) from e

        self._update_training_status(len(features))
        logger.info("Anomaly detector training complete.")
        return True

    async def detect_async(
        self, data: List[Dict[str, Any]], sensitivity: float = 0.8
    ) -> List[Dict[str, Any]]:
        """Async anomaly detection method that runs in thread pool."""
        if not self.is_trained or self.model is None:
            raise ModelNotTrainedError("anomaly_detector")

        if not data:
            return []

        result = await self._run_in_executor(self._detect_sync, data, sensitivity)
        return result if result is not None else []

    def detect(
        self, data: List[Dict[str, Any]], sensitivity: float = 0.8
    ) -> List[Dict[str, Any]]:
        """Synchronous detection method for backward compatibility."""
        return self._detect_sync(data, sensitivity)

    def _detect_sync(
        self, data: List[Dict[str, Any]], sensitivity: float
    ) -> List[Dict[str, Any]]:
        """Internal synchronous detection method."""
        try:
            df = pd.DataFrame(data)
            features = extract_time_series_features(df)

            # Get anomaly scores (-1 for anomalies, 1 for normal)
            predictions = self.model.predict(features)
            # Get decision function scores (lower = more anomalous)
            scores = self.model.decision_function(features)

            # Normalize scores to 0-1 range (higher = more anomalous)
            min_score, max_score = scores.min(), scores.max()
            if max_score != min_score:
                normalized_scores = 1 - (scores - min_score) / (max_score - min_score)
            else:
                normalized_scores = np.zeros_like(scores)

            # Calculate expected values using rolling mean
            df["expected"] = (
                df["value"]
                .rolling(window=settings.ROLLING_WINDOW_SIZE, min_periods=1, center=True)
                .mean()
            )

            anomalies = []
            threshold = calculate_anomaly_threshold(sensitivity, normalized_scores)

            for i, (pred, score) in enumerate(zip(predictions, normalized_scores)):
                actual = df.iloc[i]["value"]
                expected = df.iloc[i]["expected"]
                power_diff = abs(actual - expected)
                is_statistical_anomaly = pred == -1 and score > threshold
                is_significant_change = power_diff >= settings.ANOMALY_MIN_POWER_DIFF

                if is_statistical_anomaly and is_significant_change:
                    timestamp = df.iloc[i]["timestamp"]

                    # Classify anomaly type
                    if actual > expected * settings.ANOMALY_SPIKE_THRESHOLD:
                        anomaly_type = "spike"
                    elif actual < expected * settings.ANOMALY_DIP_THRESHOLD:
                        anomaly_type = "dip"
                    else:
                        anomaly_type = "pattern_change"

                    anomalies.append(
                        {
                            "timestamp": timestamp,
                            "actual_power": float(actual),
                            "expected_power": float(expected),
                            "anomaly_score": float(score),
                            "anomaly_type": anomaly_type,
                        }
                    )

            return anomalies
        except Exception as e:
            raise PredictionError("anomaly_detector", f"detection failed: {e}") from e

    def get_summary(self, anomalies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate a summary of detected anomalies."""
        if not anomalies:
            return {"total_count": 0, "severity": "low"}

        count = len(anomalies)
        avg_score = np.mean([a["anomaly_score"] for a in anomalies])

        # Determine severity based on count and average score
        if (
            count > settings.ANOMALY_SEVERITY_HIGH_COUNT
            or avg_score > settings.ANOMALY_SEVERITY_HIGH_SCORE
        ):
            severity = "high"
        elif (
            count > settings.ANOMALY_SEVERITY_MEDIUM_COUNT
            or avg_score > settings.ANOMALY_SEVERITY_MEDIUM_SCORE
        ):
            severity = "medium"
        else:
            severity = "low"

        return {"total_count": count, "severity": severity}


anomaly_detector = AnomalyDetector()
