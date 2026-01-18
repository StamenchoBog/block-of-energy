from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import logging
import asyncio

from app.config import settings
from app.exceptions import DatabaseConnectionError

logger = logging.getLogger(__name__)


class DataService:
    """Service for fetching sensor data from MongoDB."""

    def __init__(self):
        self._client: Optional[AsyncIOMotorClient] = None
        self._db: Optional[AsyncIOMotorDatabase] = None

    def connect(self, client: AsyncIOMotorClient):
        """Set the MongoDB client connection with connection pooling."""
        self._client = client
        self._db = client[settings.DATABASE_NAME]
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
            raise DatabaseConnectionError("Database not connected. Call connect() first.")
        return self._db[settings.DATABASE_COLLECTION]

    async def _fetch_and_transform_data(
        self, start_date: datetime, limit: int = None, most_recent: bool = True
    ) -> List[Dict[str, Any]]:
        """Common method to fetch and transform data from MongoDB.

        Args:
            start_date: Fetch data from this date onwards
            limit: Maximum number of documents to fetch
            most_recent: If True, fetch most recent data when limit applies.
                        Data is always returned in chronological order.
        """
        start_date_iso = start_date.isoformat()

        # Sort descending to get most recent data first when limit applies
        sort_order = -1 if most_recent else 1
        cursor = self.collection.find(
            {
                "processingTimestamp": {"$gte": start_date_iso},
                "payload.ENERGY.Power": {"$exists": True},
            },
            {"processingTimestamp": 1, "payload.ENERGY.Power": 1, "_id": 0},
        ).sort("processingTimestamp", sort_order)

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

        # Return in chronological order (Prophet requires ascending timestamps)
        if most_recent:
            data.reverse()

        return data

    async def get_training_data(
        self, days: int = 7, downsample_hourly: bool = True
    ) -> List[Dict[str, Any]]:
        """Fetch historical data for model training.

        Args:
            days: Number of days of historical data to fetch
            downsample_hourly: If True, aggregate to hourly means (much faster training)
        """
        start_date = datetime.utcnow() - timedelta(days=days)

        if downsample_hourly:
            data = await self._fetch_hourly_aggregated(start_date)
            logger.info(
                f"Fetched {len(data)} hourly data points for training (last {days} days)"
            )
        else:
            data = await self._fetch_and_transform_data(start_date)
            logger.info(
                f"Fetched {len(data)} raw data points for training (last {days} days)"
            )
        return data

    async def _fetch_hourly_aggregated(
        self, start_date: datetime
    ) -> List[Dict[str, Any]]:
        """Fetch data aggregated to hourly means using MongoDB aggregation.

        This dramatically reduces data volume (50k -> ~168 points for 7 days)
        while preserving the patterns Prophet needs for forecasting.
        """
        start_date_iso = start_date.isoformat()

        pipeline = [
            # Filter to date range and ensure Power field exists
            {
                "$match": {
                    "processingTimestamp": {"$gte": start_date_iso},
                    "payload.ENERGY.Power": {"$exists": True},
                }
            },
            # Parse timestamp and extract hour bucket
            {
                "$addFields": {
                    "parsedTimestamp": {"$dateFromString": {"dateString": "$processingTimestamp"}},
                }
            },
            {
                "$addFields": {
                    "hourBucket": {
                        "$dateTrunc": {"date": "$parsedTimestamp", "unit": "hour"}
                    }
                }
            },
            # Group by hour and calculate mean power
            {
                "$group": {
                    "_id": "$hourBucket",
                    "avgPower": {"$avg": "$payload.ENERGY.Power"},
                    "count": {"$sum": 1},
                }
            },
            # Sort by timestamp ascending (Prophet requires chronological order)
            {"$sort": {"_id": 1}},
        ]

        cursor = self.collection.aggregate(pipeline)
        raw_data = await cursor.to_list(length=None)

        # Transform to expected format
        data = []
        for doc in raw_data:
            if doc["_id"] is not None and doc["avgPower"] is not None:
                data.append({
                    "timestamp": doc["_id"],
                    "value": doc["avgPower"],
                })

        return data

    async def get_recent_data(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Fetch recent data for anomaly detection."""
        start_date = datetime.utcnow() - timedelta(hours=hours)
        data = await self._fetch_and_transform_data(
            start_date, min(settings.MAX_QUERY_LIMIT, 10000)
        )
        logger.info(f"Fetched {len(data)} recent data points (last {hours} hours)")
        return data

    async def get_data_age_days(self) -> float:
        """Get the age of the oldest data point in days."""
        try:
            oldest_doc = await self.collection.find_one(
                {"payload.ENERGY.Power": {"$exists": True}},
                {"processingTimestamp": 1, "_id": 0},
                sort=[("processingTimestamp", 1)]
            )

            if not oldest_doc:
                return 0.0

            oldest_timestamp = datetime.fromisoformat(
                oldest_doc["processingTimestamp"].replace("Z", "+00:00")
            )
            age = datetime.utcnow() - oldest_timestamp.replace(tzinfo=None)
            return age.total_seconds() / (24 * 3600)
        except Exception as e:
            logger.error(f"Failed to get data age: {e}")
            return 0.0

    async def has_sufficient_data(self) -> tuple[bool, float, int]:
        """
        Check if we have enough historical data for reliable predictions.

        Returns:
            Tuple of (is_sufficient, days_available, days_required)
        """
        days_available = await self.get_data_age_days()
        days_required = settings.MIN_RELIABLE_DATA_DAYS
        is_sufficient = days_available >= days_required
        return is_sufficient, days_available, days_required


data_service = DataService()
