import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class BaseModelAsync:
    """Base class for async models providing common threading and state management."""

    def __init__(self):
        self.model: Any = None
        self.is_trained: bool = False
        self.last_trained: Optional[datetime] = None
        self.data_points_used: int = 0
        self._executor = ThreadPoolExecutor(max_workers=2)
        self._training_lock = asyncio.Lock()

    async def _run_in_executor(self, method, *args, **kwargs):
        """Run synchronous method in thread pool."""
        try:
            return await asyncio.get_event_loop().run_in_executor(
                self._executor, method, *args, **kwargs
            )
        except Exception as e:
            logger.error(f"Async operation failed: {e}")
            return None

    def _update_training_status(self, data_points: int):
        """Update training status after successful training."""
        self.is_trained = True
        self.last_trained = datetime.utcnow()
        self.data_points_used = data_points
        logger.info(f"Training completed with {data_points} data points")
