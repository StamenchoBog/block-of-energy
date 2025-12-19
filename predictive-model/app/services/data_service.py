from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import logging
import asyncio

from app.config import settings

logger = logging.getLogger(__name__)


class DataService:
    """Service for fetching sensor data from MongoDB."""

    def __init__(self):
        self._client: Optional[AsyncIOMotorClient] = None
        self._db: Optional[AsyncIOMotorDatabase] = None

    def connect(self, client: AsyncIOMotorClient):
        """Set the MongoDB client connection with connection pooling."""
        self._client = client
        self._db = client[settings.MONGODB_DATABASE]
        # Create indexes for better query performance
        asyncio.create_task(self._create_indexes())

    async def _create_indexes(self):
        """Create database indexes for optimal query performance."""
        try:
            collection = self.collection
            # Create index on processingTimestamp for time-based queries
            await collection.create_index([("processingTimestamp", 1)])
            # Create compound index for common query patterns
            await collection.create_index(
                [("processingTimestamp", 1), ("payload.ENERGY.Power", 1)]
            )
            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")

    @property
    def collection(self):
        """Get the sensor measurements collection."""
        if self._db is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._db[settings.MONGODB_COLLECTION]

    async def _fetch_and_transform_data(
        self, start_date: datetime, limit: int = None
    ) -> List[Dict[str, Any]]:
        """Common method to fetch and transform data from MongoDB."""
        start_date_iso = start_date.isoformat()

        cursor = self.collection.find(
            {
                "processingTimestamp": {"$gte": start_date_iso},
                "payload.ENERGY.Power": {"$exists": True},
            },
            {"processingTimestamp": 1, "payload.ENERGY.Power": 1, "_id": 0},
        ).sort("processingTimestamp", 1)

        limit = limit or settings.MAX_QUERY_LIMIT
        raw_data = await cursor.to_list(length=limit)

        # Transform to expected format with 'timestamp' and 'value' keys
        data = []
        for doc in raw_data:
            try:
                timestamp = datetime.fromisoformat(
                    doc["processingTimestamp"].replace("Z", "+00:00")
                )
                value = doc["payload"]["ENERGY"]["Power"]
                data.append({"timestamp": timestamp, "value": value})
            except (KeyError, ValueError) as e:
                logger.warning(f"Skipping malformed document: {e}")
                continue

        return data

    async def get_training_data(self, days: int = 7) -> List[Dict[str, Any]]:
        """Fetch historical data for model training."""
        start_date = datetime.utcnow() - timedelta(days=days)
        data = await self._fetch_and_transform_data(start_date)
        logger.info(f"Fetched {len(data)} data points for training (last {days} days)")
        return data

    async def get_recent_data(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Fetch recent data for anomaly detection."""
        start_date = datetime.utcnow() - timedelta(hours=hours)
        data = await self._fetch_and_transform_data(
            start_date, min(settings.MAX_QUERY_LIMIT, 10000)
        )
        logger.info(f"Fetched {len(data)} recent data points (last {hours} hours)")
        return data


data_service = DataService()
