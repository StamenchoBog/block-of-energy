import asyncio
import logging

from app.config import settings
from app.models.forecaster import forecaster
from app.models.anomaly_detector import anomaly_detector
from app.services.data_service import data_service

logger = logging.getLogger(__name__)


async def train_models_job():
    """Background task to retrain both forecaster and anomaly detector."""
    logger.info("Starting scheduled model training...")
    try:
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
    scheduler.add_job(
        train_models_job, "interval", hours=settings.RETRAIN_INTERVAL_HOURS
    )
    scheduler.start()
    asyncio.create_task(train_models_job())

    yield

    scheduler.shutdown()
    db_client.close()
