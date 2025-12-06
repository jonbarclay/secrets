# Secret Vault

Secret Vault is a minimal one-time/expiring secret sharing service. It exposes a FastAPI backend that encrypts sensitive text with Fernet, stores the encrypted payload in Redis with either a TTL or one-time view semantics, and serves a React + Tailwind front-end for creating and unlocking secrets without leaking them to link previews.

## Features
- **Time- or view-based expiration**: Redis TTL clears time-based secrets automatically; one-time secrets are deleted immediately after first retrieval.
- **Client-friendly unlock flow**: Front-end collects the passphrase (default `uvu`) and calls the unlock endpoint so previews never see the secret.
- **Password generator**: Generate deterministic passwords from an input pattern through the `/api/generator` endpoint.
- **Hardened responses**: Custom middleware sets HSTS, X-Content-Type-Options, and X-Frame-Options headers for safer delivery.

## Project structure
- `backend/` – FastAPI application (`backend/app/main.py`) with Redis storage, encryption helpers, and request models. Dockerfile builds a production image.
- `frontend/` – Vite + React UI that talks to the API and prompts for the passphrase. Tailwind is configured via `tailwind.config.js`.
- `docker-compose.yml` – Orchestrates Redis, the backend, and the frontend for local development.

## Prerequisites
- Docker and Docker Compose
- A Fernet key for encryption. You can generate one with:
  ```bash
  python - <<'PY'
  from cryptography.fernet import Fernet
  print(Fernet.generate_key().decode())
  PY
  ```

## Configuration
The services read their settings from environment variables:

### Backend
- `SECRET_REDIS_URL` – Redis connection string (defaults to `redis://redis:6379/0` in Compose).
- `SECRET_FRONTEND_ORIGIN` – Allowed origin for CORS (defaults to `http://localhost:5173`).
- `SECRET_FERNET_KEY` – Base64-encoded Fernet key **(required)**.
- `SECRET_DEFAULT_TTL_SECONDS` – Default TTL for time-based secrets (defaults to 3600).
- `SECRET_ONE_TIME_FALLBACK_TTL_SECONDS` – TTL applied to one-time secrets if not set by client (see `backend/app/config.py`).

### Frontend
- `VITE_API_BASE` – Base URL for API calls (defaults to `https://localhost/api` in Compose).

## Running with Docker Compose
1. Run the setup script to create `.env` with a Fernet key and generate a self-signed certificate + key for HTTPS:
   ```bash
   ./setup.sh
   ```
2. Start the stack:
   ```bash
   docker compose up --build
   ```
3. Access the UI at https://localhost:5173 and the API at https://localhost/docs.

Compose automatically starts Redis and wires the backend and frontend together. Stopping the Compose stack will clear in-memory secrets unless you add Redis persistence. The backend listens on port `SECRET_BACKEND_PORT` (default 8443) and is exposed on host port 443 via Docker Compose.

## Manual development setup
If you prefer running services manually:

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export SECRET_REDIS_URL="redis://localhost:6379/0"
export SECRET_FRONTEND_ORIGIN="http://localhost:5173"
export SECRET_FERNET_KEY="<your-generated-key>"
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
VITE_API_BASE="http://localhost:8000/api" npm run dev -- --host --port 5173
```

With both services running, the UI will create secrets via the FastAPI endpoints and Redis will handle TTL and one-time deletion automatically.
