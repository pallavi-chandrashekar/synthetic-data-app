# Synthetic Data Generator

![CI](https://github.com/pallavi-chandrashekar/synthetic-data-app/actions/workflows/ci.yml/badge.svg?branch=main)
![License](https://img.shields.io/github/license/pallavi-chandrashekar/synthetic-data-app)

A production-grade full-stack application that generates structured synthetic datasets from natural language prompts using **OpenAI**, **Anthropic Claude**, or **Google Gemini**. Built with **FastAPI**, **React**, and **Material UI**, featuring Bring-Your-Own-Key (BYOK) support, server-side caching, retry logic with exponential backoff, Sentry observability, rate limiting, and a comprehensive CI/CD pipeline with 90%+ test coverage.

https://github.com/user-attachments/assets/3580e31e-9b7a-4b60-9081-b2c7f358df70

---

## Highlights

- **Multi-provider AI** &mdash; Supports OpenAI, Anthropic Claude, and Google Gemini with provider selection dropdown and structured output/JSON schema enforcement
- **Bring Your Own Key (BYOK)** &mdash; Users can supply their own API keys via a Settings dialog; keys are stored in localStorage and sent as HTTP headers, overriding server defaults
- **Production-hardened backend** &mdash; Retry with exponential backoff (tenacity), server-side TTL caching (bypassed for user-key requests), rate limiting, input validation, and structured JSON logging
- **Observability** &mdash; Sentry integration on both frontend and backend for error tracking; deep health check endpoint for container orchestration
- **Comprehensive testing** &mdash; 19 backend unit tests, 19 frontend unit tests, 19 E2E scenarios (Playwright), enforced coverage thresholds in CI
- **Containerized deployment** &mdash; Docker Compose with health checks, resource limits, isolated networking, and multi-worker Gunicorn

---

## Tech Stack

| Layer          | Technology                                              |
|----------------|---------------------------------------------------------|
| **Frontend**   | React 18, Vite, Material UI 5, MUI DataGrid            |
| **Backend**    | FastAPI, Pydantic, AsyncOpenAI, AsyncAnthropic, Google GenAI |
| **Resilience** | tenacity (retry/backoff per provider), cachetools (TTL cache), slowapi (rate limiting) |
| **Observability** | Sentry SDK (frontend + backend), python-json-logger (structured logging) |
| **Testing**    | pytest + pytest-cov, Vitest + v8 coverage, Playwright (E2E) |
| **CI/CD**      | GitHub Actions (lint, security scan, tests, Docker build, E2E) |
| **Infra**      | Docker, Docker Compose, Gunicorn (multi-worker), pre-commit hooks |

---

## Architecture

```
                  +-----------+       +-------------------+       +-----------+
  User  ───────>  |  React    | ────> |  FastAPI           | ────> |  OpenAI   |
                  |  (Vite)   | <──── |  + Retry/Cache     | <──── |  Anthropic|
                  +-----------+       +-------------------+       |  Google   |
                        |                      |                  +-----------+
                   Sentry SDK            Sentry SDK
                   localStorage          Structured Logs
                   API Keys (BYOK)       Provider Registry
```

**Backend** (`backend/main.py`, `backend/providers.py`) &mdash; FastAPI with Pydantic validation, multi-provider LLM abstraction (OpenAI, Anthropic, Google), server-side SHA256 response cache (TTL 10 min, bypassed for user-key requests), tenacity retry decorator (3 attempts, exponential backoff on 5xx/timeout per provider), rate limiting (10 req/min per IP), BYOK header resolution, and structured JSON logging.

**Frontend** (`frontend/src/`) &mdash; React 18 with custom hooks architecture (`useDataGeneration`, `usePromptHistory`, `useThemeMode`, `useApiKeys`), Settings dialog for BYOK, component composition via slot pattern, client-side caching, localStorage with quota-safe persistence, and Sentry error capture.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design document.

---

## Features

| Category | Details |
|----------|---------|
| **Data Generation** | Natural language to structured dataset via OpenAI, Anthropic, or Google; JSON and CSV formats; configurable row count |
| **Multi-Provider** | Provider selection dropdown; server-configured and/or user-supplied keys; automatic provider discovery |
| **BYOK (Bring Your Own Key)** | Settings dialog with password fields for OpenAI, Anthropic, and Google API keys; show/hide toggle; keys persisted in localStorage; sent via HTTP headers |
| **Data Preview** | MUI DataGrid with per-column filtering (contains, starts with, regex), sorting, pagination |
| **Export** | One-click download (JSON/CSV), copy to clipboard |
| **UX** | Sample prompt chips, random prompt, dataset summary badge, dark/light mode, loading states |
| **History** | Prompt history (localStorage) with restore, delete with undo, clear all |
| **Reliability** | Server-side caching (bypassed for user keys), client-side caching, retry with exponential backoff, localStorage quota handling |
| **Security** | Input validation (Pydantic), rate limiting, CORS with API key headers, Bandit security scans, npm audit, user keys sent via headers (not logged) |
| **Observability** | Sentry on frontend + backend, structured JSON logs, deep health check (`/health?deep=true`) |
| **Error Handling** | React Error Boundary, graceful API error display, Sentry exception capture |

---

## Project Structure

```
synthetic-data-app/
├── backend/
│   ├── main.py                  # FastAPI app: routes, provider resolution, caching, BYOK headers
│   ├── providers.py             # LLM provider abstraction (OpenAI, Anthropic, Google) with retry
│   ├── config.py                # pydantic-settings for environment validation (warns if no keys)
│   ├── conftest.py              # pytest fixtures
│   ├── test_main.py             # 19 unit tests
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Root component with theme, settings, layout, snackbar
│   │   ├── DataTable.jsx        # MUI DataGrid with per-column filtering
│   │   ├── ErrorBoundary.jsx    # React error boundary
│   │   ├── components/
│   │   │   ├── PromptForm.jsx   # Prompt input with slot-based action bar
│   │   │   ├── ActionBar.jsx    # Generate, download, copy, regenerate controls
│   │   │   ├── HistoryPanel.jsx # Prompt history sidebar
│   │   │   └── SettingsDialog.jsx # BYOK API key settings dialog
│   │   ├── hooks/
│   │   │   ├── useDataGeneration.js  # API calls, caching, headers, Sentry capture
│   │   │   ├── usePromptHistory.js   # localStorage with shared storage utility
│   │   │   ├── useApiKeys.js         # API key state, persistence, header generation
│   │   │   └── useThemeMode.js       # Dark/light mode toggle
│   │   ├── utils/
│   │   │   └── storage.js       # Shared safePersist/safeRead localStorage utility
│   │   └── *.test.jsx           # 19 unit tests
│   ├── e2e/                     # 19 Playwright E2E scenarios
│   ├── playwright.config.js
│   ├── vitest.config.coverage.js
│   ├── Dockerfile
│   └── package.json
├── .github/
│   ├── workflows/ci.yml         # 4-job CI: backend, frontend, docker, e2e
│   ├── dependabot.yaml          # Weekly dependency updates (npm + pip)
│   └── ISSUE_TEMPLATE/
├── docker-compose.yml           # Orchestration with health checks + resource limits
├── .pre-commit-config.yaml      # black, flake8, eslint, trailing whitespace
├── ARCHITECTURE.md
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- At least one LLM API key: [OpenAI](https://platform.openai.com/api-keys), [Anthropic](https://console.anthropic.com/), or [Google AI](https://aistudio.google.com/apikey)

### 1. Clone the repo

```bash
git clone https://github.com/pallavi-chandrashekar/synthetic-data-app.git
cd synthetic-data-app
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # Add your API key(s) — or leave empty for BYOK-only mode
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

> **BYOK-only mode:** The backend starts successfully with zero server-side keys. Users must provide their own keys via the Settings dialog in the frontend.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

To use BYOK: click **Settings** in the top bar, enter your API key(s), and close the dialog. The provider dropdown updates automatically.

### Docker (alternative)

```bash
# Optionally set API keys in backend/.env (not required for BYOK mode)
docker compose up --build
```

Starts backend (port 8000) and frontend (port 3000) with health checks, resource limits, and automatic restart.

---

## API Reference

### `GET /providers`

Returns the list of available LLM providers. Accepts optional user API key headers to include user-provisioned providers.

**Headers (optional):**

| Header | Description |
|--------|-------------|
| `X-OpenAI-API-Key` | User's OpenAI API key |
| `X-Anthropic-API-Key` | User's Anthropic API key |
| `X-Google-API-Key` | User's Google API key |

```bash
curl http://localhost:8000/providers
```

```json
{
  "providers": ["openai", "anthropic"],
  "default": "openai"
}
```

### `GET /health`

Health check with optional deep probe.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `deep` | bool | `false` | When `true`, verifies provider API connectivity |

```bash
curl http://localhost:8000/health?deep=true
```

```json
{
  "status": "healthy",
  "checks": {
    "any_provider_configured": "pass",
    "openai_reachable": "pass"
  }
}
```

### `POST /generate-data`

Generate synthetic data from a natural language prompt. Rate limited to **10 req/min per IP**.

Accepts the same user API key headers as `/providers`. When a user key is provided, it overrides the server-configured provider and **bypasses the server-side cache** (prevents cross-user data leakage).

**Request:**
```json
{
  "prompt": "Generate 10 users with name, email, and country",
  "format": "json",
  "provider": "openai"
}
```

**Response (JSON):**
```json
{
  "json": [
    { "name": "Alice", "email": "alice@example.com", "country": "US" },
    { "name": "Bob", "email": "bob@example.com", "country": "UK" }
  ]
}
```

**Response (CSV):**
```json
{
  "csv": "name,email,country\nAlice,alice@example.com,US\nBob,bob@example.com,UK\n"
}
```

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `400` | Invalid or unconfigured provider |
| `422` | Validation error (empty/too-long prompt, invalid format) |
| `429` | Rate limit exceeded |
| `502` | Provider error or malformed response |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No* | &mdash; | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4.1` | OpenAI model for data generation |
| `ANTHROPIC_API_KEY` | No* | &mdash; | Anthropic API key |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-20250514` | Anthropic model |
| `GOOGLE_API_KEY` | No* | &mdash; | Google AI API key |
| `GOOGLE_MODEL` | No | `gemini-2.0-flash` | Google model |
| `MAX_PROMPT_LENGTH` | No | `2000` | Max prompt character length |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed origins |
| `SENTRY_DSN` | No | &mdash; | Sentry DSN for backend error tracking |

*At least one server-side key is recommended; without any, users must provide their own keys via the frontend Settings dialog (BYOK mode).

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend API base URL |
| `VITE_SENTRY_DSN` | No | &mdash; | Sentry DSN for frontend error tracking |

---

## Testing

### Backend

```bash
cd backend
pytest --cov=main --cov-report=term-missing --cov-fail-under=70
```

**19 tests** covering: health endpoint (shallow + deep), JSON extraction (valid input, rows wrapper, extra text, array preference, deeply nested), error cases (invalid JSON, non-list, non-dict rows), generate endpoint (JSON + CSV formats), error propagation, input validation, BYOK user key override, provider union with user keys, and cache bypass for user-key requests.

### Frontend

```bash
cd frontend
npm run test:coverage
```

**19 tests** covering: App rendering, format selector, prompt input, sample chips, prompt history, generate flow, API error handling, Settings button rendering, Settings dialog interaction, DataTable (empty/invalid/valid data), and ErrorBoundary (normal rendering + crash recovery).

### E2E

```bash
cd frontend
npx playwright test
```

**19 Playwright scenarios** running against a live dev server in Chromium: app load, dark mode toggle, Settings dialog, API key entry with visibility toggle, clear keys, sample prompt, JSON generation, copy to clipboard, JSON download, CSV switch + generation, CSV download, keyboard shortcut, prompt history, restore from history, delete history item, undo deletion, re-generate, clear history, and error handling.

### CI Pipeline

The GitHub Actions CI runs 4 parallel jobs on every push and PR:

| Job | Steps |
|-----|-------|
| **backend** | flake8 lint, Bandit security scan, pytest with coverage threshold |
| **frontend** | ESLint, npm audit, Vitest with coverage thresholds |
| **docker** | Build verification for both Docker images |
| **e2e** | Playwright E2E tests with report artifact upload |

---

## Sample Prompts

```
Generate 50 fake customer profiles with name, email, age, and country
Generate 100 sales records with product, quantity, revenue, and date
Generate a dataset of employee records with id, name, role, and joining_date
Generate 25 SaaS subscriptions with plan_name, mrr, user_count, and status
```

---

## Contributing

Contributions are welcome. Please open an issue first to discuss proposed changes.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
