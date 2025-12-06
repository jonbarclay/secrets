from datetime import timedelta
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class ExpirationMethod(str, Enum):
    time_based = "time"
    one_time = "one_time"


class SecretCreateRequest(BaseModel):
    secret: str = Field(..., min_length=1, max_length=4096)
    passphrase: Optional[str] = Field(default=None, max_length=256)
    expiration_method: ExpirationMethod
    ttl_seconds: Optional[int] = Field(
        default=None,
        description="Time-to-live in seconds when using time-based expiration.",
    )

    @model_validator(mode="after")
    def validate_ttl(self) -> "SecretCreateRequest":
        if self.expiration_method == ExpirationMethod.time_based:
            if self.ttl_seconds is None:
                raise ValueError("ttl_seconds is required for time-based expiration")
            if self.ttl_seconds <= 0:
                raise ValueError("ttl_seconds must be greater than 0")
        return self


class SecretCreateResponse(BaseModel):
    id: str
    expires_in: int
    expiration_method: ExpirationMethod


class SecretMetadata(BaseModel):
    exists: bool
    requires_passphrase: bool = True
    expiration_method: ExpirationMethod


class UnlockRequest(BaseModel):
    passphrase: Optional[str] = Field(default=None, max_length=256)


class UnlockResponse(BaseModel):
    secret: str
