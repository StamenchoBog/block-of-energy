import asyncio
import logging
import time
from fastapi import Request
from fastapi.responses import JSONResponse

from app.config import settings

logger = logging.getLogger(__name__)


async def timeout_middleware(request: Request, call_next):
    """Add timeout and resource protection."""
    try:
        start_time = time.time()
        response = await asyncio.wait_for(
            call_next(request), timeout=settings.REQUEST_TIMEOUT_SECONDS
        )
        process_time = time.time() - start_time

        # Add processing time header for monitoring
        response.headers["X-Process-Time"] = str(process_time)
        return response

    except asyncio.TimeoutError:
        logger.warning(f"Request timeout: {request.url}")
        return JSONResponse(
            status_code=408, content={"detail": "Request timeout - server overloaded"}
        )
    except Exception as e:
        logger.error(f"Unexpected error in request: {e}")
        return JSONResponse(
            status_code=500, content={"detail": "Internal server error"}
        )

