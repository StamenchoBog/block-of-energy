"""Time-series cross-validation with expanding window strategy."""

import pandas as pd
import numpy as np
from typing import List, Tuple, Generator
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class TimeSeriesCrossValidator:
    """
    Expanding window cross-validator for time series data.

    Unlike standard k-fold CV, this preserves temporal order:
    - Fold 1: Train on [0:n], Validate on [n:n+1]
    - Fold 2: Train on [0:n+1], Validate on [n+1:n+2]
    - ...and so on

    This prevents data leakage where future data would influence past predictions.
    """

    def __init__(
        self,
        n_splits: int = 4,
        min_train_days: int = 3,
        validation_days: int = 1,
    ):
        """
        Initialize the cross-validator.

        Args:
            n_splits: Number of cross-validation folds
            min_train_days: Minimum days of training data for first fold
            validation_days: Days of data to use for each validation fold
        """
        self.n_splits = n_splits
        self.min_train_days = min_train_days
        self.validation_days = validation_days

    def split(
        self, data: pd.DataFrame, timestamp_col: str = "timestamp"
    ) -> Generator[Tuple[pd.DataFrame, pd.DataFrame], None, None]:
        """
        Generate train/validation splits for time series data.

        Args:
            data: DataFrame with time series data
            timestamp_col: Name of timestamp column

        Yields:
            Tuple of (train_df, validation_df) for each fold
        """
        if timestamp_col not in data.columns:
            raise ValueError(f"Column '{timestamp_col}' not found in data")

        df = data.copy()
        df[timestamp_col] = pd.to_datetime(df[timestamp_col])
        df = df.sort_values(timestamp_col).reset_index(drop=True)

        min_date = df[timestamp_col].min()
        max_date = df[timestamp_col].max()
        total_days = (max_date - min_date).days

        required_days = self.min_train_days + (self.n_splits * self.validation_days)
        if total_days < required_days:
            logger.warning(
                f"Insufficient data for {self.n_splits} folds. "
                f"Have {total_days} days, need {required_days}. "
                f"Reducing number of splits."
            )
            self.n_splits = max(1, (total_days - self.min_train_days) // self.validation_days)

        for fold in range(self.n_splits):
            train_end_days = self.min_train_days + (fold * self.validation_days)
            val_end_days = train_end_days + self.validation_days

            train_end = min_date + timedelta(days=train_end_days)
            val_end = min_date + timedelta(days=val_end_days)

            train_mask = df[timestamp_col] < train_end
            val_mask = (df[timestamp_col] >= train_end) & (df[timestamp_col] < val_end)

            train_df = df[train_mask].copy()
            val_df = df[val_mask].copy()

            if len(train_df) == 0 or len(val_df) == 0:
                logger.warning(f"Fold {fold + 1}: Empty split, skipping")
                continue

            logger.debug(
                f"Fold {fold + 1}/{self.n_splits}: "
                f"Train={len(train_df)} points, Val={len(val_df)} points"
            )
            yield train_df, val_df

    def get_fold_info(self, data: pd.DataFrame, timestamp_col: str = "timestamp") -> List[dict]:
        """
        Get information about each fold without splitting.

        Returns:
            List of dicts with fold metadata
        """
        info = []
        for i, (train_df, val_df) in enumerate(self.split(data, timestamp_col)):
            info.append({
                "fold": i + 1,
                "train_size": len(train_df),
                "val_size": len(val_df),
                "train_start": train_df[timestamp_col].min(),
                "train_end": train_df[timestamp_col].max(),
                "val_start": val_df[timestamp_col].min(),
                "val_end": val_df[timestamp_col].max(),
            })
        return info
