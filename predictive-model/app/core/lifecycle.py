import asyncio
import logging

from app.config import settings
from app.models.forecaster import forecaster
from app.models.anomaly_detector import anomaly_detector
from app.services.data_service import data_service
from app.tuning.hyperparameter_tuner import tuner

logger = logging.getLogger(__name__)


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
    """Background task to retrain both forecaster and anomaly detector."""
    logger.info("Starting scheduled model training...")
    try:
        # Load any cached params before training
        tuner.load_params()

        data = await data_service.get_training_data(days=7)
        if data:
            forecaster_success = await forecaster.train_async(data)
            if forecaster_success:
                logger.info("Forecaster training successful")
                await forecaster.warm_cache()

            anomaly_success = await anomaly_detector.train_async(data)
            if anomaly_success:
                logger.info("Anomaly detector training successful")
        else:
            logger.warning("No data found for training")
    except Exception as e:
        logger.error(f"Training failed: {e}")


async def setup_lifespan(app, db_client):
    """Setup application lifespan management."""

    logger.info("Connecting to MongoDB...")
    data_service.connect(db_client)

    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    global scheduler
    scheduler = AsyncIOScheduler()

    # Daily training job (every 24 hours)
    scheduler.add_job(
        train_models_job, "interval", hours=settings.RETRAIN_INTERVAL_HOURS
    )

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

    # Load cached params and train on startup
    tuner.load_params()
    asyncio.create_task(train_models_job())

    yield

    scheduler.shutdown()
    db_client.close()
