import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Any, Optional

from app.config import settings
from app.models.base_model import BaseModelAsync
from app.tuning.hyperparameter_tuner import tuner, DEFAULT_PROPHET_PARAMS
from app.exceptions import (
    InsufficientDataError,
    ModelNotTrainedError,
    ModelTrainingError,
    PredictionError,
)


logger = logging.getLogger(__name__)


class EnergyForecaster(BaseModelAsync):
    def __init__(self):
        super().__init__()
        self._cache: Optional[tuple[datetime, List[Dict[str, Any]]]] = None

    async def train_async(self, data: List[Dict[str, Any]]) -> bool:
        """Async training method that runs Prophet training in a thread pool."""
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
        # Prophet requires columns 'ds' (date) and 'y' (value)
        df = df.rename(columns={"timestamp": "ds", "value": "y"})

        # Ensure UTC and remove timezone info for Prophet (it prefers naive or consistent TZs)
        if df["ds"].dt.tz is not None:
            df["ds"] = df["ds"].dt.tz_convert(None)

        # Load tuned hyperparameters (falls back to defaults if none cached)
        params = tuner.get_prophet_params()
        logger.info(
            f"Training Prophet on {len(df)} data points with params: "
            f"changepoint_prior_scale={params.get('changepoint_prior_scale')}, "
            f"seasonality_prior_scale={params.get('seasonality_prior_scale')}, "
            f"seasonality_mode={params.get('seasonality_mode')}"
        )

        m = Prophet(
            daily_seasonality=params.get("daily_seasonality", True),
            weekly_seasonality=params.get("weekly_seasonality", True),
            yearly_seasonality=params.get("yearly_seasonality", False),
            changepoint_prior_scale=params.get("changepoint_prior_scale", 0.05),
            seasonality_prior_scale=params.get("seasonality_prior_scale", 1.0),
            seasonality_mode=params.get("seasonality_mode", "additive"),
        )
        try:
            m.fit(df)
        except Exception as e:
            raise ModelTrainingError("forecaster", str(e)) from e

        self.model = m
        self._cache = None
        self._update_training_status(len(df))
        return True

    def _get_cached(self, hours: int) -> Optional[List[Dict[str, Any]]]:
        """Return sliced predictions from cache if valid."""
        if self._cache is None:
            return None
        created_at, predictions = self._cache
        if datetime.utcnow() - created_at > timedelta(
            seconds=settings.FORECAST_CACHE_TTL_SECONDS
        ):
            self._cache = None
            return None
        return predictions[:hours]

    async def predict_async(
        self, hours: int = 24, past_context_hours: int = 0
    ) -> List[Dict[str, Any]]:
        """Async prediction method.

        Args:
            hours: Number of future hours to forecast
            past_context_hours: Number of past hours to include for context
        """
        if not self.is_trained:
            raise ModelNotTrainedError("forecaster")

        # When past_context is requested, skip cache for accurate time-based results
        if past_context_hours > 0:
            result = await self._run_in_executor(
                self._predict_sync, hours, past_context_hours
            )
            return result if result else []

        # Use cache only for pure future forecasts
        cached = self._get_cached(hours)
        if cached is not None:
            logger.debug(f"Cache hit for {hours}h forecast")
            return cached

        # Compute max horizon and cache it
        result = await self._run_in_executor(
            self._predict_sync, settings.MAX_FORECAST_HOURS, 0
        )
        if result:
            self._cache = (datetime.utcnow(), result)
            return result[:hours]
        return []

    async def warm_cache(self) -> None:
        """Pre-compute max horizon predictions."""
        if not self.is_trained:
            return
        await self.predict_async(settings.MAX_FORECAST_HOURS)
        logger.info(f"Cache warmed with {settings.MAX_FORECAST_HOURS}h forecast")

    def predict(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Synchronous prediction method for backward compatibility."""
        return self._predict_sync(hours)

    def _predict_sync(self, hours: int, past_context_hours: int = 0) -> List[Dict[str, Any]]:
        """Internal synchronous prediction method.

        Args:
            hours: Number of future hours to forecast
            past_context_hours: Number of past hours to include for context (hindcast)
        """
        try:
            now = datetime.utcnow()

            # Calculate required periods to reach now + hours, accounting for data gaps
            # Prophet extends from the last training timestamp, not from "now"
            training_end = self.model.history['ds'].max()
            hours_since_training = max(0, (now - training_end).total_seconds() / 3600)
            required_periods = int(hours + hours_since_training) + 1  # +1 for rounding safety

            if hours_since_training > 1:
                logger.info(
                    f"Training data ends {hours_since_training:.1f}h ago, "
                    f"extending forecast periods from {hours} to {required_periods}"
                )

            # Create future dataframe with enough periods to bridge any data gap
            future = self.model.make_future_dataframe(periods=required_periods, freq="H")
            forecast = self.model.predict(future)

            start_time = now - timedelta(hours=past_context_hours)
            end_time = now + timedelta(hours=hours)

            # Filter to time range and resample to hourly
            # This handles dense training data by keeping one point per hour
            forecast_filtered = forecast[
                (forecast["ds"] >= start_time) & (forecast["ds"] <= end_time)
            ].copy()

            # Round timestamps to nearest hour and deduplicate
            forecast_filtered["hour"] = forecast_filtered["ds"].dt.floor("H")
            forecast_hourly = forecast_filtered.groupby("hour").first().reset_index()

            results = []
            for _, row in forecast_hourly.iterrows():
                results.append(
                    {
                        "timestamp": row["hour"],
                        "predicted_power": max(0, row["yhat"]),
                        "lower_bound": max(0, row["yhat_lower"]),
                        "upper_bound": row["yhat_upper"],
                    }
                )

            return results
        except Exception as e:
            raise PredictionError("forecaster", f"forecast for {hours}h failed: {e}") from e


# Global singleton instance
forecaster = EnergyForecaster()
