from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import redis.asyncio as redis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND

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
    SanitizationError,
    build_secret_payload,
    generate_password_from_pattern,
    generate_uuid,
    get_fernet,
    hash_passphrase,
    parse_one_time,
    sanitize_plaintext,
    verify_passphrase,
)

settings = get_settings()
app = FastAPI(title="Secret Vault", version="0.1.0")
redis_client = redis.from_url(settings.redis_url, decode_responses=True)
fernet = get_fernet(settings.fernet_key)


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


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "https://localhost",
        "https://localhost:443",
        "http://localhost",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(SanitizationError)
async def sanitization_exception_handler(_: Request, exc: SanitizationError):
    return JSONResponse(status_code=HTTP_400_BAD_REQUEST, content={"detail": str(exc)})


@app.post("/api/secret", response_model=SecretCreateResponse)
async def create_secret(payload: SecretCreateRequest):
    sanitized_secret = sanitize_plaintext(payload.secret)

    one_time = payload.expiration_method == ExpirationMethod.one_time
    ttl = (
        payload.ttl_seconds
        if payload.expiration_method == ExpirationMethod.time_based
        else settings.one_time_fallback_ttl_seconds
    )

    passphrase = payload.passphrase or DEFAULT_PASSWORD
    passphrase_hash = hash_passphrase(passphrase)

    ciphertext = fernet.encrypt(sanitized_secret.encode())
    secret_id = generate_uuid()

    await redis_client.hset(secret_id, mapping=build_secret_payload(ciphertext, passphrase_hash, one_time))
    await redis_client.expire(secret_id, ttl)

    return SecretCreateResponse(id=secret_id, expires_in=ttl, expiration_method=payload.expiration_method)


@app.get("/api/secret/{secret_id}", response_model=SecretMetadata)
async def get_secret_metadata(secret_id: str):
    stored = await redis_client.hgetall(secret_id)
    if not stored:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Secret not found")

    one_time = parse_one_time(stored.get("one_time", "false"))
    return SecretMetadata(exists=True, requires_passphrase=True, expiration_method=ExpirationMethod.one_time if one_time else ExpirationMethod.time_based)


@app.post("/api/secret/{secret_id}/unlock", response_model=UnlockResponse)
async def unlock_secret(secret_id: str, payload: UnlockRequest):
    stored = await redis_client.hgetall(secret_id)
    if not stored:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Secret not found")

    provided_passphrase = payload.passphrase or DEFAULT_PASSWORD
    stored_hash = stored.get("passphrase_hash")

    if not stored_hash or not verify_passphrase(provided_passphrase, stored_hash):
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Invalid passphrase")

    ciphertext = stored.get("ciphertext")
    if ciphertext is None:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Secret not found")

    plaintext = fernet.decrypt(ciphertext.encode()).decode()

    one_time = parse_one_time(stored.get("one_time", "false"))
    if one_time:
        await redis_client.delete(secret_id)

    return UnlockResponse(secret=plaintext)


@app.get("/api/generator")
async def generate_password(pattern: str):
    password = generate_password_from_pattern(pattern)
    return {"password": password}
