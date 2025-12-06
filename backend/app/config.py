from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    frontend_origin: str = "http://localhost:5173"
    fernet_key: str
    default_ttl_seconds: int = 3600
    one_time_fallback_ttl_seconds: int = 604800

    model_config = SettingsConfigDict(env_file=".env", env_prefix="SECRET_", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
