import asyncio
import logging
from datetime import datetime, timedelta

from app.config import settings
from app.models.forecaster import forecaster
from app.models.anomaly_detector import anomaly_detector
from app.services.data_service import data_service
from app.tuning.hyperparameter_tuner import tuner

logger = logging.getLogger(__name__)

# Global scheduler reference for health checks
scheduler = None


async def tune_models_job():
    """Background task to tune hyperparameters (runs weekly)."""
    if not settings.ENABLE_AUTO_TUNING:
        logger.info("Auto-tuning disabled, skipping")
        return

    logger.info("Starting scheduled hyperparameter tuning...")
    try:
        data = await data_service.get_training_data(days=7)
        if data and len(data) >= settings.MIN_TRAINING_DATA_POINTS:
            # Run tuning in thread pool (CPU-intensive)
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, tuner.tune_all, data)
            logger.info("Hyperparameter tuning completed successfully")
            # Trigger retraining with new params
            await train_models_job()
        else:
            logger.warning(
                f"Insufficient data for tuning: {len(data) if data else 0} points"
            )
    except Exception as e:
        logger.error(f"Hyperparameter tuning failed: {e}")


async def train_models_job():
    """Background task to retrain both forecaster and anomaly detector.

    Uses parallel training for Prophet and Isolation Forest to reduce
    total training time by ~40%.
    """
    logger.info("Starting scheduled model training...")
    try:
        # Load any cached params before training
        tuner.load_params()

        # Fetch hourly downsampled data for forecaster (fast training)
        forecaster_data = await data_service.get_training_data(
            days=7, downsample_hourly=True
        )
        # Fetch raw data for anomaly detector (needs granular data)
        anomaly_data = await data_service.get_training_data(
            days=7, downsample_hourly=False
        )

        if not forecaster_data and not anomaly_data:
            logger.warning("No data found for training")
            return

        # Train both models in parallel for faster completion
        async def train_forecaster():
            if forecaster_data:
                success = await forecaster.train_async(forecaster_data)
                if success:
                    logger.info("Forecaster training successful")
                    await forecaster.warm_cache()
                return success
            return False

        async def train_anomaly_detector():
            if anomaly_data:
                success = await anomaly_detector.train_async(anomaly_data)
                if success:
                    logger.info("Anomaly detector training successful")
                return success
            return False

        # Run training in parallel
        results = await asyncio.gather(
            train_forecaster(),
            train_anomaly_detector(),
            return_exceptions=True,
        )

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                model_name = "forecaster" if i == 0 else "anomaly_detector"
                logger.error(f"{model_name} training failed: {result}")

    except Exception as e:
        logger.error(f"Training failed: {e}")


def is_model_stale(max_age_hours: int = 24) -> bool:
    """Check if any model is older than the specified age."""
    if not forecaster.is_trained or not anomaly_detector.is_trained:
        return True

    now = datetime.utcnow()
    max_age = timedelta(hours=max_age_hours)

    forecaster_age = now - forecaster.last_trained if forecaster.last_trained else None
    anomaly_age = now - anomaly_detector.last_trained if anomaly_detector.last_trained else None

    if forecaster_age and forecaster_age > max_age:
        logger.info(f"Forecaster model is stale ({forecaster_age.total_seconds() / 3600:.1f}h old)")
        return True
    if anomaly_age and anomaly_age > max_age:
        logger.info(f"Anomaly detector model is stale ({anomaly_age.total_seconds() / 3600:.1f}h old)")
        return True

    return False


def get_scheduler_status() -> dict:
    """Get scheduler status for health checks."""
    if scheduler is None:
        return {"status": "not_initialized"}

    if scheduler.running:
        jobs = scheduler.get_jobs()
        return {
            "status": "running",
            "job_count": len(jobs),
            "jobs": [
                {
                    "id": job.id,
                    "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                }
                for job in jobs
            ],
        }
    return {"status": "stopped"}


async def setup_lifespan(app, db_client):
    """Setup application lifespan management."""

    logger.info("Connecting to MongoDB...")
    data_service.connect(db_client)

    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    global scheduler
    # Configure scheduler with generous misfire grace time
    # This ensures jobs run even if container was stopped during scheduled time
    scheduler = AsyncIOScheduler(
        job_defaults={
            "misfire_grace_time": 3600,  # Allow 1 hour grace period for missed jobs
            "coalesce": True,  # Combine multiple missed runs into one
        }
    )

    # Daily training job (every 24 hours)
    scheduler.add_job(
        train_models_job,
        "interval",
        hours=settings.RETRAIN_INTERVAL_HOURS,
        id="training_job",
    )
    logger.info(f"Scheduled model training every {settings.RETRAIN_INTERVAL_HOURS} hours")

    # Weekly hyperparameter tuning job
    if settings.ENABLE_AUTO_TUNING:
        scheduler.add_job(
            tune_models_job,
            "interval",
            days=settings.TUNING_INTERVAL_DAYS,
            id="tuning_job",
        )
        logger.info(
            f"Scheduled hyperparameter tuning every {settings.TUNING_INTERVAL_DAYS} days"
        )

    scheduler.start()

    # Load cached params
    tuner.load_params()

    # Check model freshness on startup - retrain if stale or not trained
    # This handles the case where container restarts and models are outdated
    if is_model_stale(max_age_hours=settings.RETRAIN_INTERVAL_HOURS):
        logger.info("Models are stale or not trained - triggering immediate training")
        asyncio.create_task(train_models_job())
    else:
        logger.info("Models are fresh - skipping startup training")

    yield

    scheduler.shutdown()
    db_client.close()
