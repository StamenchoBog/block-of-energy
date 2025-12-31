"""Shared validation utilities for API endpoints."""

from fastapi import HTTPException


def validate_range(
    value: float, min_val: float, max_val: float, param_name: str
) -> None:
    """
    Validate that a value is within a specified range.

    Args:
        value: The value to validate
        min_val: Minimum allowed value (inclusive)
        max_val: Maximum allowed value (inclusive)
        param_name: Name of the parameter (for error messages)

    Raises:
        HTTPException: If value is outside the allowed range
    """
    if value < min_val or value > max_val:
        raise HTTPException(
            status_code=400,
            detail=f"{param_name} must be between {min_val} and {max_val}",
        )