# Secret Vault

A minimal one-time/expiring secret sharing service. Encrypts sensitive text with Fernet, stores the encrypted payload in Redis with either a TTL or one-time view semantics, and serves a React + Tailwind front-end for creating and unlocking secrets without leaking them to link previews.

## Features

- **Time- or view-based expiration**: Redis TTL clears time-based secrets automatically; one-time secrets are deleted immediately after first retrieval.
- **Client-friendly unlock flow**: Front-end collects the passphrase and calls the unlock endpoint so previews never see the secret.
- **Password generator**: Generate deterministic passwords from an input pattern through the `/api/generator` endpoint.
- **Hardened responses**: Custom middleware sets HSTS, X-Content-Type-Options, and X-Frame-Options headers for safer delivery.
- **Input sanitization**: HTML content is sanitized using bleach to prevent XSS attacks.

## Project Structure

```
├── backend/          # FastAPI application with Redis storage and encryption
│   └── app/
│       ├── main.py   # API endpoints and middleware
│       ├── config.py # Environment-based configuration
│       └── utils.py  # Encryption and sanitization helpers
├── frontend/         # Vite + React + Tailwind UI
├── docker-compose.yml
└── setup.sh          # Generates .env and self-signed certificates
```

## Quick Start

1. Run the setup script to create `.env` with a Fernet key and generate self-signed certificates:
   ```bash
   ./setup.sh
   ```

2. Start the stack:
   ```bash
   docker compose up --build
   ```

3. Access the UI at https://localhost:5173 and the API docs at https://localhost/docs.

## Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_FERNET_KEY` | Yes | — | Base64-encoded Fernet encryption key |
| `SECRET_REDIS_URL` | No | `redis://redis:6379/0` | Redis connection string |
| `SECRET_FRONTEND_ORIGIN` | No | `https://localhost` | Allowed origin for CORS |
| `SECRET_DEFAULT_TTL_SECONDS` | No | `3600` | Default TTL for time-based secrets |
| `SECRET_ONE_TIME_FALLBACK_TTL_SECONDS` | No | `604800` | Fallback TTL for one-time secrets |
| `VITE_API_BASE` | No | `https://localhost/api` | Frontend API base URL |

Generate a Fernet key with:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Manual Development Setup

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

## Production Deployment

For production use:

1. **Use proper TLS certificates** (e.g., Let's Encrypt) instead of self-signed certificates.
2. **Set `SECRET_FRONTEND_ORIGIN`** to your production domain for CORS.
3. **Configure Redis persistence** if you need secrets to survive container restarts.
4. **Use strong, unique passphrases** for sensitive secrets.

## Security Notes

- Secrets are encrypted at rest using Fernet symmetric encryption.
- The encryption key (`SECRET_FERNET_KEY`) must be kept secure and never committed to version control.
- One-time secrets are immediately deleted from Redis after retrieval.
- All secrets have a maximum TTL to prevent indefinite storage.

## License

MIT
