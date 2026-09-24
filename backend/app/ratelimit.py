"""A small in-memory sliding-window rate limiter.

State is per process: behind several workers or replicas the effective limit is multiplied.
Use a shared store (e.g. Redis) or a proxy-level limiter if you scale out.
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status

from .config import Settings, get_settings

_lock = threading.Lock()
_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def reset_rate_limits() -> None:
    with _lock:
        _hits.clear()


def check_rate_limit(scope: str, key: str, limit: int, window_seconds: int) -> None:
    """Record a hit for (scope, key); raise 429 if it exceeds `limit` hits per `window_seconds`."""
    now = time.monotonic()
    with _lock:
        hits = _hits[(scope, key)]
        while hits and now - hits[0] >= window_seconds:
            hits.popleft()
        if len(hits) >= limit:
            retry_after = max(1, int(window_seconds - (now - hits[0])) + 1)
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )
        hits.append(now)


def rate_limit_by_ip(scope: str, limit: int, window_seconds: int):
    """Dependency factory limiting requests per client IP."""

    def dependency(request: Request, settings: Settings = Depends(get_settings)) -> None:
        if settings.rate_limit_enabled:
            client = request.client.host if request.client else "unknown"
            check_rate_limit(scope, client, limit, window_seconds)

    return dependency
