from functools import lru_cache
from typing import List
from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    Security Note - Fernet Key Rotation:
        The fernet_key is used to encrypt all secrets. Key rotation is NOT
        supported without data loss. If the key is changed:
        - All existing encrypted secrets become unrecoverable
        - This is acceptable since secrets are ephemeral (TTL-based or one-time)
        - For production, ensure the key is backed up securely
        - Never commit the key to version control
    """

    redis_url: str = "redis://localhost:6379/0"
    frontend_origin: str = "https://localhost"
    fernet_key: str
    default_ttl_seconds: int = 3600
    one_time_fallback_ttl_seconds: int = 604800

    model_config = SettingsConfigDict(env_file=".env", env_prefix="SECRET_", case_sensitive=False)

    def get_cors_origins(self) -> List[str]:
        """Generate list of allowed CORS origins based on frontend_origin.

        Includes variations with/without ports and both http/https for development.
        """
        origins = set()

        # Add the configured origin
        origins.add(self.frontend_origin)

        # Parse the URL to get components
        parsed = urlparse(self.frontend_origin)
        domain = parsed.netloc.split(":")[0]  # Remove port if present

        # Add common variations
        origins.add(f"https://{domain}")
        origins.add(f"https://{domain}:443")

        # For localhost, also allow http for development
        if domain == "localhost":
            origins.add("http://localhost")
            origins.add("http://localhost:5173")
            origins.add("https://localhost:5173")

        return list(origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()
