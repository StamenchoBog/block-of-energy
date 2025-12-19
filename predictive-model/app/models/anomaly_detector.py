import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from datetime import datetime
from typing import List, Dict, Any, Optional
import logging

from app.config import settings
from app.models.base_model import BaseModelAsync

logger = logging.getLogger(__name__)


class AnomalyDetector(BaseModelAsync):
    """Isolation Forest-based anomaly detection for energy consumption."""

    def __init__(self):
        super().__init__()
        # Contamination is the expected proportion of anomalies
        self.contamination = 0.05  # 5% of data expected to be anomalies

    async def train_async(self, data: List[Dict[str, Any]]) -> bool:
        """Async training method that runs in thread pool."""
        async with self._training_lock:
            if len(data) < settings.MIN_TRAINING_DATA_POINTS:
                logger.warning(
                    f"Insufficient data to train anomaly detector: {len(data)} points"
                )
                return False

            result = await self._run_in_executor(self._train_sync, data)
            return result if result is not None else False

    def train(self, data: List[Dict[str, Any]]) -> bool:
        """Synchronous training method for backward compatibility."""
        return self._train_sync(data)

    def _train_sync(self, data: List[Dict[str, Any]]) -> bool:
        """Internal synchronous training method."""
        df = pd.DataFrame(data)
        features = self._extract_features(df)

        logger.info(f"Training anomaly detector on {len(features)} data points...")

        self.model = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(features)

        self._update_training_status(len(features))
        logger.info("Anomaly detector training complete.")
        return True

    async def detect_async(
        self, data: List[Dict[str, Any]], sensitivity: float = 0.8
    ) -> List[Dict[str, Any]]:
        """Async anomaly detection method that runs in thread pool."""
        if not self.is_trained or self.model is None:
            logger.warning("Anomaly detector not trained")
            return []

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
        df = pd.DataFrame(data)
        features = self._extract_features(df)

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
            df["value"].rolling(window=5, min_periods=1, center=True).mean()
        )

        anomalies = []
        threshold = 1 - sensitivity  # Higher sensitivity = lower threshold

        for i, (pred, score) in enumerate(zip(predictions, normalized_scores)):
            if pred == -1 or score > threshold:
                actual = df.iloc[i]["value"]
                expected = df.iloc[i]["expected"]
                timestamp = df.iloc[i]["timestamp"]

                # Classify anomaly type
                if actual > expected * 1.5:
                    anomaly_type = "spike"
                elif actual < expected * 0.5:
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

    def _extract_features(self, df: pd.DataFrame) -> np.ndarray:
        """
        Extract features from time series data for anomaly detection.

        Features include:
        - Raw value
        - Hour of day (cyclical)
        - Day of week (cyclical)
        - Rolling statistics
        """
        features = pd.DataFrame()

        # Raw value
        features["value"] = df["value"]

        # Ensure timestamp is datetime
        if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
            df["timestamp"] = pd.to_datetime(df["timestamp"])

        # Time-based features (cyclical encoding)
        features["hour_sin"] = np.sin(2 * np.pi * df["timestamp"].dt.hour / 24)
        features["hour_cos"] = np.cos(2 * np.pi * df["timestamp"].dt.hour / 24)
        features["dow_sin"] = np.sin(2 * np.pi * df["timestamp"].dt.dayofweek / 7)
        features["dow_cos"] = np.cos(2 * np.pi * df["timestamp"].dt.dayofweek / 7)

        # Rolling statistics (handle NaN at edges)
        features["rolling_mean"] = df["value"].rolling(window=5, min_periods=1).mean()
        features["rolling_std"] = (
            df["value"].rolling(window=5, min_periods=1).std().fillna(0)
        )

        # Difference from rolling mean
        features["diff_from_mean"] = df["value"] - features["rolling_mean"]

        return features.values

    def get_summary(self, anomalies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate a summary of detected anomalies."""
        if not anomalies:
            return {"total_count": 0, "severity": "low"}

        count = len(anomalies)
        avg_score = np.mean([a["anomaly_score"] for a in anomalies])

        # Determine severity based on count and average score
        if count > 10 or avg_score > 0.8:
            severity = "high"
        elif count > 5 or avg_score > 0.6:
            severity = "medium"
        else:
            severity = "low"

        return {"total_count": count, "severity": severity}


anomaly_detector = AnomalyDetector()
