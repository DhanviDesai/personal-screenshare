# Screenshare Backend

Python FastAPI service that mints short-lived LiveKit access tokens and enforces the single-presenter screen-share lock.

## Requirements

- Python 3.11+
- LiveKit project credentials (URL, API key, API secret)

## Setup

```bash
cd src/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env with your LiveKit credentials
```

## Environment variables

Loaded via `python-dotenv` from `src/backend/.env` (see `.env.example`). Process env vars still override `.env`. Never commit a real `.env`.

| Variable | Required | Description |
|---|---|---|
| `LIVEKIT_URL` | yes | LiveKit WebSocket URL (e.g. `wss://…livekit.cloud`) |
| `LIVEKIT_API_KEY` | yes | LiveKit API key |
| `LIVEKIT_API_SECRET` | yes | LiveKit API secret (server-side only; never returned to clients) |
| `FRONTEND_ORIGIN` | no | CORS origin (default `http://localhost:5173`) |
| `TOKEN_TTL_SECONDS` | no | Access token TTL (default `3600`) |

## Run

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/personal/screenshare/api/healthz`

## Tests

From the repository root (with `src/backend/.venv` activated):

```bash
export SKIP_ENV_VALIDATION=1
export LIVEKIT_URL=wss://test.livekit.example
export LIVEKIT_API_KEY=testkey_abcdefghijklmnopqrstuvwxyz012345
export LIVEKIT_API_SECRET=testsecret_abcdefghijklmnopqrstuvwxyz0123456789
pytest
```
