"""
Rate limiting middleware using in-memory store.
For production, replace with Redis.
"""
import time
import logging
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# In-memory rate limit store: {user_id: [(timestamp, count)]}
_store: dict = defaultdict(list)

# Rate limit configs per endpoint group
LIMITS = {
    "/api/chat/stream":           {"requests": 30,  "window": 60},   # 30 per minute
    "/api/symptoms/patterns":     {"requests": 10,  "window": 60},   # 10 per minute
    "/api/consultations/generate":{"requests": 5,   "window": 60},   # 5 per minute
    "default":                    {"requests": 120, "window": 60},   # 120 per minute
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Get rate limit config
        path = request.url.path
        limit_config = LIMITS.get(path, LIMITS["default"])
        max_requests = limit_config["requests"]
        window = limit_config["window"]

        # Identify user (by auth header or IP)
        auth = request.headers.get("authorization", "")
        identifier = auth[-20:] if auth else request.client.host if request.client else "unknown"
        key = f"{path}:{identifier}"

        now = time.time()
        window_start = now - window

        # Clean old entries
        _store[key] = [ts for ts in _store[key] if ts > window_start]

        if len(_store[key]) >= max_requests:
            logger.warning(f"Rate limit hit: {key}")
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Too many requests",
                    "retry_after": window,
                    "message": f"You can make {max_requests} requests per {window} seconds on this endpoint.",
                }
            )

        _store[key].append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max_requests - len(_store[key]))
        return response
