import logging
import uuid as uuid_module

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import redis.asyncio as redis
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND, HTTP_429_TOO_MANY_REQUESTS

from .config import get_settings
from .models import (
    ExpirationMethod,
    SecretCreateRequest,
    SecretCreateResponse,
    SecretMetadata,
    UnlockRequest,
    UnlockResponse,
)
from .utils import (
    DEFAULT_PASSWORD,
    build_secret_payload,
    generate_password_from_pattern,
    generate_uuid,
    get_fernet,
    hash_passphrase,
    parse_one_time,
    verify_passphrase,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Secret Vault", version="0.1.0")
app.state.limiter = limiter

redis_client = redis.from_url(settings.redis_url, decode_responses=True)
fernet = get_fernet(settings.fernet_key)


def is_valid_uuid(value: str) -> bool:
    """Validate that a string is a valid UUID v4."""
    try:
        uuid_obj = uuid_module.UUID(value, version=4)
        return str(uuid_obj) == value
    except (ValueError, AttributeError):
        return False


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        return response


def get_default_passphrase_hash() -> str:
    return hash_passphrase(DEFAULT_PASSWORD)


@app.on_event("shutdown")
async def shutdown_event():
    await redis_client.close()


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    client_ip = get_remote_address(request)
    logger.warning("Rate limit exceeded for IP %s on %s", client_ip, request.url.path)
    return JSONResponse(
        status_code=HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Too many requests. Please try again later."},
    )


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.post("/api/secret", response_model=SecretCreateResponse)
@limiter.limit("10/minute")
async def create_secret(request: Request, payload: SecretCreateRequest):
    one_time = payload.expiration_method == ExpirationMethod.one_time
    ttl = (
        payload.ttl_seconds
        if payload.expiration_method == ExpirationMethod.time_based
        else settings.one_time_fallback_ttl_seconds
    )

    passphrase = payload.passphrase or DEFAULT_PASSWORD
    passphrase_hash = hash_passphrase(passphrase)

    ciphertext = fernet.encrypt(payload.secret.encode())
    secret_id = generate_uuid()

    await redis_client.hset(secret_id, mapping=build_secret_payload(ciphertext, passphrase_hash, one_time))
    await redis_client.expire(secret_id, ttl)

    client_ip = get_remote_address(request)
    logger.info(
        "Secret created: id=%s, expiration=%s, ttl=%d, one_time=%s, client_ip=%s",
        secret_id,
        payload.expiration_method.value,
        ttl,
        one_time,
        client_ip,
    )

    return SecretCreateResponse(id=secret_id, expires_in=ttl, expiration_method=payload.expiration_method)


@app.get("/api/secret/{secret_id}", response_model=SecretMetadata)
async def get_secret_metadata(secret_id: str):
    if not is_valid_uuid(secret_id):
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Secret not found or expired")

    stored = await redis_client.hgetall(secret_id)
    if not stored:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Secret not found or expired")

    one_time = parse_one_time(stored.get("one_time", "false"))
    return SecretMetadata(exists=True, requires_passphrase=True, expiration_method=ExpirationMethod.one_time if one_time else ExpirationMethod.time_based)


@app.post("/api/secret/{secret_id}/unlock", response_model=UnlockResponse)
@limiter.limit("5/minute")
async def unlock_secret(request: Request, secret_id: str, payload: UnlockRequest):
    client_ip = get_remote_address(request)

    if not is_valid_uuid(secret_id):
        logger.warning("Invalid UUID format attempted: secret_id=%s, client_ip=%s", secret_id, client_ip)
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Secret not found or expired")

    stored = await redis_client.hgetall(secret_id)
    if not stored:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Secret not found or expired")

    provided_passphrase = payload.passphrase or DEFAULT_PASSWORD
    stored_hash = stored.get("passphrase_hash")

    if not stored_hash or not verify_passphrase(provided_passphrase, stored_hash):
        logger.warning("Failed unlock attempt: secret_id=%s, client_ip=%s", secret_id, client_ip)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Invalid passphrase")

    ciphertext = stored.get("ciphertext")
    if ciphertext is None:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Secret not found or expired")

    plaintext = fernet.decrypt(ciphertext.encode()).decode()

    one_time = parse_one_time(stored.get("one_time", "false"))
    if one_time:
        await redis_client.delete(secret_id)
        logger.info("One-time secret retrieved and destroyed: secret_id=%s, client_ip=%s", secret_id, client_ip)
    else:
        logger.info("Secret unlocked: secret_id=%s, client_ip=%s", secret_id, client_ip)

    return UnlockResponse(secret=plaintext)


@app.get("/api/generator")
@limiter.limit("20/minute")
async def generate_password(request: Request, pattern: str):
    password = generate_password_from_pattern(pattern)
    return {"password": password}
