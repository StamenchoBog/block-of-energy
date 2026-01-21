"""Grid search hyperparameter tuning for Prophet and Isolation Forest models."""

import json
import logging
import os
from datetime import datetime
from itertools import product
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from prophet import Prophet
from sklearn.ensemble import IsolationForest
from sklearn.metrics import mean_absolute_error

from app.tuning.cross_validation import TimeSeriesCrossValidator
from app.utils.feature_extraction import extract_time_series_features

logger = logging.getLogger(__name__)

# Prophet parameter grid (32 combinations)
PROPHET_PARAM_GRID = {
    "changepoint_prior_scale": [0.001, 0.01, 0.1, 0.5],
    "seasonality_prior_scale": [0.01, 0.1, 1.0, 10.0],
    "seasonality_mode": ["additive", "multiplicative"],
}

# Isolation Forest parameter grid (27 combinations)
# Note: contamination capped at 0.02 to prevent over-detection of anomalies
ISOLATION_FOREST_PARAM_GRID = {
    "n_estimators": [50, 100, 200],
    "contamination": [0.005, 0.01, 0.02],
    "max_features": [0.5, 0.75, 1.0],
}

# Default parameters (fallback when no tuned params available)
DEFAULT_PROPHET_PARAMS = {
    "changepoint_prior_scale": 0.05,
    "seasonality_prior_scale": 1.0,
    "seasonality_mode": "additive",
    "daily_seasonality": True,
    "weekly_seasonality": True,
    "yearly_seasonality": False,
}

DEFAULT_ISOLATION_FOREST_PARAMS = {
    "n_estimators": 100,
    "contamination": 0.01,
    "max_features": 1.0,
    "random_state": 42,
    "n_jobs": -1,
}


class HyperparameterTuner:
    """
    Grid search tuner for Prophet forecaster and Isolation Forest anomaly detector.

    Performs exhaustive search over parameter grids using time-series
    cross-validation to find optimal hyperparameters.
    """

    def __init__(
        self,
        params_file: str = "best_params.json",
        cv_folds: int = 4,
        min_train_days: int = 3,
    ):
        """
        Initialize the tuner.

        Args:
            params_file: Path to save/load best parameters
            cv_folds: Number of cross-validation folds
            min_train_days: Minimum training days for first CV fold
        """
        self.params_file = Path(params_file)
        self.cv = TimeSeriesCrossValidator(
            n_splits=cv_folds,
            min_train_days=min_train_days,
        )
        self._best_params: Optional[Dict[str, Any]] = None
        self._tuning_history: List[Dict[str, Any]] = []

    def tune_prophet(
        self, data: List[Dict[str, Any]], param_grid: Optional[Dict] = None
    ) -> Tuple[Dict[str, Any], float]:
        """
        Tune Prophet hyperparameters using grid search with CV.

        Args:
            data: Training data with 'timestamp' and 'value' keys
            param_grid: Custom parameter grid (uses default if None)

        Returns:
            Tuple of (best_params, best_mae)
        """
        if param_grid is None:
            param_grid = PROPHET_PARAM_GRID

        df = pd.DataFrame(data)
        df = df.rename(columns={"timestamp": "ds", "value": "y"})
        if df["ds"].dt.tz is not None:
            df["ds"] = df["ds"].dt.tz_convert(None)

        param_combinations = list(product(*param_grid.values()))
        param_names = list(param_grid.keys())

        best_params = DEFAULT_PROPHET_PARAMS.copy()
        best_mae = float("inf")

        total_combos = len(param_combinations)
        logger.info(f"Starting Prophet tuning: {total_combos} parameter combinations")

        for i, combo in enumerate(param_combinations):
            params = dict(zip(param_names, combo))
            fold_maes = []

            try:
                for train_df, val_df in self.cv.split(df, "ds"):
                    # Prepare Prophet format
                    train_prophet = train_df[["ds", "y"]].copy()
                    val_prophet = val_df[["ds", "y"]].copy()

                    # Train with current params
                    model = Prophet(
                        daily_seasonality=True,
                        weekly_seasonality=True,
                        yearly_seasonality=False,
                        **params,
                    )
                    model.fit(train_prophet)

                    # Predict on validation set
                    forecast = model.predict(val_prophet[["ds"]])
                    mae = mean_absolute_error(val_prophet["y"], forecast["yhat"])
                    fold_maes.append(mae)

                avg_mae = np.mean(fold_maes)

                if avg_mae < best_mae:
                    best_mae = avg_mae
                    best_params = {**DEFAULT_PROPHET_PARAMS, **params}
                    logger.info(f"New best Prophet params (MAE={best_mae:.2f}): {params}")

                self._tuning_history.append({
                    "model": "prophet",
                    "params": params,
                    "mae": avg_mae,
                    "timestamp": datetime.utcnow().isoformat(),
                })

            except Exception as e:
                logger.warning(f"Prophet combo {i + 1}/{total_combos} failed: {e}")
                continue

            if (i + 1) % 10 == 0:
                logger.info(f"Prophet tuning progress: {i + 1}/{total_combos}")

        logger.info(f"Prophet tuning complete. Best MAE: {best_mae:.2f}")
        return best_params, best_mae

    def tune_isolation_forest(
        self, data: List[Dict[str, Any]], param_grid: Optional[Dict] = None
    ) -> Tuple[Dict[str, Any], float]:
        """
        Tune Isolation Forest hyperparameters.

        For anomaly detection, we use reconstruction error as a proxy metric
        since we don't have labeled anomalies.

        Args:
            data: Training data with 'timestamp' and 'value' keys
            param_grid: Custom parameter grid (uses default if None)

        Returns:
            Tuple of (best_params, best_score)
        """
        if param_grid is None:
            param_grid = ISOLATION_FOREST_PARAM_GRID

        df = pd.DataFrame(data)
        features = extract_time_series_features(df)

        param_combinations = list(product(*param_grid.values()))
        param_names = list(param_grid.keys())

        best_params = DEFAULT_ISOLATION_FOREST_PARAMS.copy()
        best_score = float("-inf")

        total_combos = len(param_combinations)
        logger.info(f"Starting Isolation Forest tuning: {total_combos} combinations")

        for i, combo in enumerate(param_combinations):
            params = dict(zip(param_names, combo))

            try:
                model = IsolationForest(
                    random_state=42,
                    n_jobs=-1,
                    **params,
                )
                model.fit(features)

                # Use average path length as quality metric
                # Higher (less negative) decision function = better normal point separation
                scores = model.decision_function(features)
                avg_score = np.mean(scores)

                if avg_score > best_score:
                    best_score = avg_score
                    best_params = {**DEFAULT_ISOLATION_FOREST_PARAMS, **params}
                    logger.info(
                        f"New best IF params (score={best_score:.4f}): {params}"
                    )

                self._tuning_history.append({
                    "model": "isolation_forest",
                    "params": params,
                    "score": avg_score,
                    "timestamp": datetime.utcnow().isoformat(),
                })

            except Exception as e:
                logger.warning(f"IF combo {i + 1}/{total_combos} failed: {e}")
                continue

        logger.info(f"Isolation Forest tuning complete. Best score: {best_score:.4f}")
        return best_params, best_score

    def tune_all(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Tune both models and save results.

        Args:
            data: Training data

        Returns:
            Dict with best parameters for both models
        """
        logger.info("Starting full hyperparameter tuning...")

        prophet_params, prophet_mae = self.tune_prophet(data)
        if_params, if_score = self.tune_isolation_forest(data)

        self._best_params = {
            "prophet": prophet_params,
            "isolation_forest": if_params,
            "tuned_at": datetime.utcnow().isoformat(),
            "metrics": {
                "prophet_mae": prophet_mae,
                "isolation_forest_score": if_score,
            },
        }

        self.save_params()
        return self._best_params

    def save_params(self) -> None:
        """Save best parameters to JSON file."""
        if self._best_params is None:
            logger.warning("No parameters to save")
            return

        self.params_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.params_file, "w") as f:
            json.dump(self._best_params, f, indent=2, default=str)
        logger.info(f"Saved best parameters to {self.params_file}")

    def load_params(self) -> Optional[Dict[str, Any]]:
        """Load best parameters from JSON file."""
        if not self.params_file.exists():
            logger.info("No cached parameters found, using defaults")
            return None

        try:
            with open(self.params_file) as f:
                self._best_params = json.load(f)
            logger.info(f"Loaded parameters from {self.params_file}")
            return self._best_params
        except Exception as e:
            logger.error(f"Failed to load parameters: {e}")
            return None

    def _get_params(self, model_key: str, defaults: Dict[str, Any]) -> Dict[str, Any]:
        """Generic parameter getter for any model type."""
        if self._best_params is None:
            self.load_params()

        if self._best_params and model_key in self._best_params:
            return self._best_params[model_key]
        return defaults.copy()

    def get_prophet_params(self) -> Dict[str, Any]:
        """Get Prophet parameters (tuned or default)."""
        return self._get_params("prophet", DEFAULT_PROPHET_PARAMS)

    def get_isolation_forest_params(self) -> Dict[str, Any]:
        """Get Isolation Forest parameters (tuned or default)."""
        return self._get_params("isolation_forest", DEFAULT_ISOLATION_FOREST_PARAMS)

    @property
    def tuning_history(self) -> List[Dict[str, Any]]:
        """Get tuning history for analysis."""
        return self._tuning_history


# Global singleton instance
tuner = HyperparameterTuner()