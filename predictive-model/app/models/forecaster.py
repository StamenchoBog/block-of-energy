import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Any, Optional

from app.config import settings
from app.models.base_model import BaseModelAsync

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 3600  # 1 hour
MAX_FORECAST_HOURS = 168  # Cache this once, slice for smaller requests


class EnergyForecaster(BaseModelAsync):
    def __init__(self):
        super().__init__()
        self._cache: Optional[tuple[datetime, List[Dict[str, Any]]]] = None

    async def train_async(self, data: List[Dict[str, Any]]) -> bool:
        """Async training method that runs Prophet training in a thread pool."""
        async with self._training_lock:
            if len(data) < settings.MIN_TRAINING_DATA_POINTS:
                logger.warning(f"Insufficient data to train: {len(data)} points")
                return False

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

        logger.info(f"Training model on {len(df)} data points...")

        # Initialize Prophet with energy-specific tuning
        # yearly_seasonality=False (unless you have a year of data)
        # daily_seasonality=True (energy usage patterns repeat daily)
        m = Prophet(
            daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False
        )
        m.fit(df)

        self.model = m
        self._cache = None
        self._update_training_status(len(df))
        return True

    def _get_cached(self, hours: int) -> Optional[List[Dict[str, Any]]]:
        """Return sliced predictions from cache if valid."""
        if self._cache is None:
            return None
        created_at, predictions = self._cache
        if datetime.utcnow() - created_at > timedelta(seconds=CACHE_TTL_SECONDS):
            self._cache = None
            return None
        return predictions[:hours]

    async def predict_async(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Async prediction method with caching."""
        if not self.is_trained:
            return []

        cached = self._get_cached(hours)
        if cached is not None:
            logger.debug(f"Cache hit for {hours}h forecast (sliced from {MAX_FORECAST_HOURS}h)")
            return cached

        # Compute max horizon and cache it
        result = await self._run_in_executor(self._predict_sync, MAX_FORECAST_HOURS)
        if result:
            self._cache = (datetime.utcnow(), result)
            return result[:hours]
        return []

    async def warm_cache(self) -> None:
        """Pre-compute max horizon predictions."""
        if not self.is_trained:
            return
        await self.predict_async(MAX_FORECAST_HOURS)
        logger.info(f"Cache warmed with {MAX_FORECAST_HOURS}h forecast")

    def predict(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Synchronous prediction method for backward compatibility."""
        return self._predict_sync(hours)

    def _predict_sync(self, hours: int) -> List[Dict[str, Any]]:
        """Internal synchronous prediction method."""
        # Create future dataframe
        future = self.model.make_future_dataframe(periods=hours, freq="H")
        forecast = self.model.predict(future)

        # Filter only future predictions
        now = datetime.utcnow()
        # Note: We filter slightly loosely to ensure we cover the requested range
        future_forecast = forecast[forecast["ds"] > (now - timedelta(hours=1))]

        results = []
        for _, row in future_forecast.iterrows():
            results.append(
                {
                    "timestamp": row["ds"],
                    "predicted_power": max(0, row["yhat"]),  # No negative energy
                    "lower_bound": max(0, row["yhat_lower"]),
                    "upper_bound": row["yhat_upper"],
                }
            )

        return results[:hours]


# Global singleton instance
forecaster = EnergyForecaster()
