# Synthetic Data Generator

![CI](https://github.com/pallavi-chandrashekar/synthetic-data-app/actions/workflows/ci.yml/badge.svg?branch=main)
![License](https://img.shields.io/github/license/pallavi-chandrashekar/synthetic-data-app)

A production-grade full-stack application that generates structured synthetic datasets from natural language prompts using OpenAI. Built with **FastAPI**, **React**, and **Material UI**, featuring server-side caching, retry logic with exponential backoff, Sentry observability, rate limiting, and a comprehensive CI/CD pipeline with 90%+ test coverage.

https://github.com/user-attachments/assets/3580e31e-9b7a-4b60-9081-b2c7f358df70

---

## Highlights

- **AI-powered data generation** &mdash; Converts natural language prompts into structured tabular datasets using OpenAI structured output with enforced JSON schemas
- **Production-hardened backend** &mdash; Retry with exponential backoff (tenacity), server-side TTL caching, rate limiting, input validation, and structured JSON logging
- **Observability** &mdash; Sentry integration on both frontend and backend for error tracking; deep health check endpoint for container orchestration
- **Comprehensive testing** &mdash; 16 backend unit tests (83% coverage), 17 frontend unit tests (80% coverage), 16 E2E scenarios (Playwright), enforced coverage thresholds in CI
- **Containerized deployment** &mdash; Docker Compose with health checks, resource limits, isolated networking, and multi-worker Gunicorn

---

## Tech Stack

| Layer          | Technology                                              |
|----------------|---------------------------------------------------------|
| **Frontend**   | React 18, Vite, Material UI 5, MUI DataGrid            |
| **Backend**    | FastAPI, Pydantic, AsyncOpenAI (structured output)      |
| **Resilience** | tenacity (retry/backoff), cachetools (TTL cache), slowapi (rate limiting) |
| **Observability** | Sentry SDK (frontend + backend), python-json-logger (structured logging) |
| **Testing**    | pytest + pytest-cov, Vitest + v8 coverage, Playwright (E2E) |
| **CI/CD**      | GitHub Actions (lint, security scan, tests, Docker build, E2E) |
| **Infra**      | Docker, Docker Compose, Gunicorn (multi-worker), pre-commit hooks |

---

## Architecture

```
                  +-----------+       +-------------------+       +-----------+
  User  ───────>  |  React    | ────> |  FastAPI           | ────> |  OpenAI   |
                  |  (Vite)   | <──── |  + Retry/Cache     | <──── |  API      |
                  +-----------+       +-------------------+       +-----------+
                        |                      |
                   Sentry SDK            Sentry SDK
                   localStorage          Structured Logs
```

**Backend** (`backend/main.py`) &mdash; FastAPI with Pydantic validation, server-side SHA256 response cache (TTL 10 min), tenacity retry decorator (3 attempts, exponential backoff on 5xx/timeout), rate limiting (10 req/min per IP), and structured JSON logging.

**Frontend** (`frontend/src/`) &mdash; React 18 with custom hooks architecture (`useDataGeneration`, `usePromptHistory`, `useThemeMode`), component composition via slot pattern, client-side caching, localStorage with quota-safe persistence, and Sentry error capture.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design document.

---

## Features

| Category | Details |
|----------|---------|
| **Data Generation** | Natural language to structured dataset via OpenAI; JSON and CSV formats; configurable row count |
| **Data Preview** | MUI DataGrid with per-column filtering (contains, starts with, regex), sorting, pagination |
| **Export** | One-click download (JSON/CSV), copy to clipboard |
| **UX** | Sample prompt chips, random prompt, dataset summary badge, dark/light mode, loading states |
| **History** | Prompt history (localStorage) with restore, delete with undo, clear all |
| **Reliability** | Server-side caching, client-side caching, retry with exponential backoff, localStorage quota handling |
| **Security** | Input validation (Pydantic), rate limiting, CORS, Bandit security scans, npm audit, `.env` not in git history |
| **Observability** | Sentry on frontend + backend, structured JSON logs, deep health check (`/health?deep=true`) |
| **Error Handling** | React Error Boundary, graceful API error display, Sentry exception capture |

---

## Project Structure

```
synthetic-data-app/
├── backend/
│   ├── main.py                  # FastAPI app: routes, OpenAI integration, caching, retry logic
│   ├── config.py                # pydantic-settings for environment validation
│   ├── conftest.py              # pytest fixtures
│   ├── test_main.py             # 16 unit tests (83% coverage)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Root component with theme, layout, snackbar
│   │   ├── DataTable.jsx        # MUI DataGrid with per-column filtering
│   │   ├── ErrorBoundary.jsx    # React error boundary
│   │   ├── components/
│   │   │   ├── PromptForm.jsx   # Prompt input with slot-based action bar
│   │   │   ├── ActionBar.jsx    # Generate, download, copy, regenerate controls
│   │   │   └── HistoryPanel.jsx # Prompt history sidebar
│   │   ├── hooks/
│   │   │   ├── useDataGeneration.js  # API calls, caching, Sentry capture
│   │   │   ├── usePromptHistory.js   # localStorage with quota-safe persistence
│   │   │   └── useThemeMode.js       # Dark/light mode toggle
│   │   └── *.test.jsx           # 17 unit tests (80% coverage)
│   ├── e2e/                     # 16 Playwright E2E scenarios
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
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Clone the repo

```bash
git clone https://github.com/pallavi-chandrashekar/synthetic-data-app.git
cd synthetic-data-app
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # Add your OPENAI_API_KEY
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Docker (alternative)

```bash
# Set OPENAI_API_KEY in backend/.env first
docker compose up --build
```

Starts backend (port 8000) and frontend (port 3000) with health checks, resource limits, and automatic restart.

---

## API Reference

### `GET /health`

Health check with optional deep probe.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `deep` | bool | `false` | When `true`, verifies OpenAI API connectivity |

```bash
curl http://localhost:8000/health?deep=true
```

```json
{
  "status": "healthy",
  "checks": {
    "api_key_configured": "pass",
    "openai_reachable": "pass"
  }
}
```

### `POST /generate-data`

Generate synthetic data from a natural language prompt. Rate limited to **10 req/min per IP**.

**Request:**
```json
{
  "prompt": "Generate 10 users with name, email, and country",
  "format": "json"
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
| `422` | Validation error (empty/too-long prompt, invalid format) |
| `429` | Rate limit exceeded |
| `502` | OpenAI error or malformed response |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | &mdash; | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4.1` | Model for data generation |
| `MAX_PROMPT_LENGTH` | No | `2000` | Max prompt character length |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed origins |
| `SENTRY_DSN` | No | &mdash; | Sentry DSN for backend error tracking |

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

**16 tests** covering: health endpoint (shallow + deep), JSON extraction (valid input, rows wrapper, extra text, array preference, deeply nested), error cases (invalid JSON, non-list, non-dict rows), generate endpoint (JSON + CSV formats), error propagation, and input validation.

### Frontend

```bash
cd frontend
npm run test:coverage
```

**17 tests** covering: App rendering, format selector, prompt input, sample chips, prompt history, generate flow, API error handling, DataTable (empty/invalid/valid data), and ErrorBoundary (normal rendering + crash recovery).

### E2E

```bash
cd frontend
npx playwright test
```

**16 Playwright scenarios** running against a live dev server in Chromium.

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
