"""Shared feature extraction utilities for ML models."""

import numpy as np
import pandas as pd


def extract_time_series_features(
    df: pd.DataFrame,
    value_column: str = "value",
    timestamp_column: str = "timestamp",
    rolling_window: int = 5,
) -> np.ndarray:
    """
    Extract features from time series data for ML models.

    Features include:
    - Raw value
    - Hour of day (cyclical encoding using sin/cos)
    - Day of week (cyclical encoding using sin/cos)
    - Rolling statistics (mean, std, diff from mean)

    Args:
        df: DataFrame containing time series data
        value_column: Name of the column containing values
        timestamp_column: Name of the column containing timestamps
        rolling_window: Window size for rolling statistics

    Returns:
        numpy array of extracted features
    """
    features = pd.DataFrame()

    # Raw value
    features["value"] = df[value_column]

    # Ensure timestamp is datetime
    timestamps = df[timestamp_column]
    if not pd.api.types.is_datetime64_any_dtype(timestamps):
        timestamps = pd.to_datetime(timestamps)

    # Time-based features (cyclical encoding)
    # Using sin/cos preserves the circular nature of time
    features["hour_sin"] = np.sin(2 * np.pi * timestamps.dt.hour / 24)
    features["hour_cos"] = np.cos(2 * np.pi * timestamps.dt.hour / 24)
    features["dow_sin"] = np.sin(2 * np.pi * timestamps.dt.dayofweek / 7)
    features["dow_cos"] = np.cos(2 * np.pi * timestamps.dt.dayofweek / 7)

    # Rolling statistics (handle NaN at edges)
    features["rolling_mean"] = (
        df[value_column].rolling(window=rolling_window, min_periods=1).mean()
    )
    features["rolling_std"] = (
        df[value_column].rolling(window=rolling_window, min_periods=1).std().fillna(0)
    )

    # Difference from rolling mean
    features["diff_from_mean"] = df[value_column] - features["rolling_mean"]

    return features.values
