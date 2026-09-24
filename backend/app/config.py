"""Application settings, loaded from environment variables (and an optional .env file)."""

import logging
import secrets
from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

MIN_SECRET_LENGTH = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"

    # Database. Any SQLAlchemy URL works; plain postgresql:// URLs are upgraded to the psycopg 3 driver.
    database_url: str = "sqlite:///./projectflow.db"
    auto_create_tables: bool | None = None  # default: on outside production (production uses Alembic)

    # Auth
    secret_key: str = ""
    access_token_expire_minutes: int = Field(default=60, ge=1, le=60 * 24 * 7)
    bcrypt_rounds: int = Field(default=12, ge=4, le=16)
    allow_signup: bool = True
    bootstrap_admin_email: str | None = None
    bootstrap_admin_password: str | None = None
    bootstrap_admin_name: str = "Administrator"

    # HTTP
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    enable_docs: bool | None = None  # default: on outside production
    static_dir: str | None = None  # built frontend to serve (used by the Docker image)
    rate_limit_enabled: bool = True

    # AI user-story generator (Groq)
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    @model_validator(mode="after")
    def _finalize(self) -> "Settings":
        if self.database_url.startswith("postgres://"):
            self.database_url = "postgresql+psycopg://" + self.database_url.removeprefix("postgres://")
        elif self.database_url.startswith("postgresql://"):
            self.database_url = "postgresql+psycopg://" + self.database_url.removeprefix("postgresql://")

        if not self.secret_key:
            if self.environment == "production":
                raise ValueError("SECRET_KEY must be set in production")
            # Ephemeral key: fine for development, but every restart invalidates all tokens.
            self.secret_key = secrets.token_urlsafe(48)
            logger.warning("SECRET_KEY is not set; generated a temporary one for this process.")
        elif self.environment == "production" and len(self.secret_key) < MIN_SECRET_LENGTH:
            raise ValueError(f"SECRET_KEY must be at least {MIN_SECRET_LENGTH} characters in production")

        if self.auto_create_tables is None:
            self.auto_create_tables = self.environment != "production"
        if self.enable_docs is None:
            self.enable_docs = self.environment != "production"
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
