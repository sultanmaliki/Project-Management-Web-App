"""Password hashing and JWT helpers."""

from datetime import UTC, datetime, timedelta
from functools import lru_cache

import bcrypt
import jwt

from .config import Settings

ALGORITHM = "HS256"
MAX_PASSWORD_BYTES = 72  # bcrypt only uses the first 72 bytes (bcrypt>=5 rejects longer input)


def hash_password(password: str, rounds: int = 12) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=rounds)).decode()


def verify_password(password: str, hashed: str) -> bool:
    raw = password.encode()
    if len(raw) > MAX_PASSWORD_BYTES:
        return False
    try:
        return bcrypt.checkpw(raw, hashed.encode())
    except ValueError:  # malformed hash
        return False


@lru_cache
def _dummy_hash() -> str:
    return hash_password("dummy-password-for-timing")


def verify_password_dummy(password: str) -> None:
    """Burn roughly the same CPU as a real check so unknown emails aren't distinguishable by latency."""
    verify_password(password, _dummy_hash())


def create_access_token(user_id: int, settings: Settings) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str, settings: Settings) -> int | None:
    """Return the user id in a valid token, or None if the token is invalid or expired."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]})
        return int(payload["sub"])
    except (jwt.PyJWTError, ValueError, KeyError):
        return None
