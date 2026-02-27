# Synthetic Data Generator

![Build Status](https://github.com/pallavi-chandrashekar/synthetic-data-app/actions/workflows/ci.yml/badge.svg?branch=main)
![License](https://img.shields.io/github/license/pallavi-chandrashekar/synthetic-data-app)

A full-stack web application that uses OpenAI to generate synthetic datasets from natural language prompts. Supports JSON and CSV export, interactive preview with per-column filtering, prompt history, dark mode, and more.

---

## Demo

https://github.com/user-attachments/assets/e162c9fc-aa12-474c-aa22-39945f136571

---

## Features

- Natural language prompt to structured dataset (via OpenAI structured output)
- JSON and CSV format selection
- Interactive MUI DataGrid with per-column filtering (contains, starts with, regex), sorting, and pagination
- Sample prompt chips and random prompt button
- Dataset summary badge (rows, columns, format)
- One-click download (JSON/CSV)
- Prompt history with restore, delete (with confirmation), undo, and clear
- Client-side caching of previous results
- Dark / light mode toggle
- Error boundary for graceful crash recovery
- Rate limiting (10 requests/minute per IP)
- Configurable OpenAI model via environment variable
- Structured backend logging

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 18 + Vite                   |
| UI          | Material UI (MUI) 5 + DataGrid    |
| Backend     | FastAPI + Pydantic                |
| LLM         | OpenAI API (structured output)    |
| Rate Limit  | slowapi                           |
| CSV Parsing | PapaParse (frontend)              |
| State       | React Hooks + LocalStorage        |
| Testing     | pytest (backend), Vitest (frontend) |

---

## Project Structure

```
synthetic-data-app/
├── backend/
│   ├── main.py               # FastAPI app: /health, /generate-data
│   ├── test_main.py           # Backend unit tests (pytest, 12 tests)
│   ├── requirements.txt
│   ├── .env.example           # Environment variable template
│   ├── .dockerignore
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main application component
│   │   ├── DataTable.jsx      # DataGrid with per-column filtering
│   │   ├── ErrorBoundary.jsx  # React error boundary
│   │   ├── main.jsx           # Entry point
│   │   ├── App.test.jsx       # App tests (11 tests)
│   │   ├── DataTable.test.jsx # DataTable tests (4 tests)
│   │   └── ErrorBoundary.test.jsx # ErrorBoundary tests (2 tests)
│   ├── package.json
│   ├── vite.config.js
│   ├── setupTests.js
│   ├── .dockerignore
│   └── Dockerfile
├── .github/
│   ├── workflows/ci.yml       # CI: lint, security scan, tests
│   ├── dependabot.yaml
│   └── ISSUE_TEMPLATE/
├── .gitignore
├── .pre-commit-config.yaml
├── docker-compose.yml
├── ARCHITECTURE.md
└── README.md
```

---

## API Reference

### `GET /health`

Returns service status.

```json
{ "status": "ok" }
```

### `POST /generate-data`

Generate synthetic data from a natural language prompt. Rate limited to **10 requests/minute** per IP.

**Request:**
```json
{
  "prompt": "Generate 10 users with name and email",
  "format": "json"
}
```

**Response (JSON):**
```json
{
  "json": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Bob", "email": "bob@example.com" }
  ]
}
```

**Response (CSV):**
```json
{
  "csv": "name,email\nAlice,alice@example.com\nBob,bob@example.com\n"
}
```

**Error responses:**
| Status | Meaning |
|--------|---------|
| 422    | Invalid request (empty prompt, bad format) |
| 429    | Rate limit exceeded |
| 502    | OpenAI error or malformed response |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/pallavi-chandrashekar/synthetic-data-app.git
cd synthetic-data-app
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # then add your OpenAI API key
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

---

## Environment Variables

### Backend (`backend/.env`)

| Variable         | Required | Default   | Description                     |
|------------------|----------|-----------|---------------------------------|
| `OPENAI_API_KEY` | Yes      | -         | Your OpenAI API key             |
| `OPENAI_MODEL`   | No       | `gpt-4.1` | OpenAI model to use            |

### Frontend

| Variable       | Required | Default                | Description               |
|----------------|----------|------------------------|---------------------------|
| `VITE_API_URL` | No       | `http://localhost:8000` | Backend API base URL      |

---

## Docker

```bash
docker compose up --build
```

Starts both backend (port 8000) and frontend (port 3000). Set your `OPENAI_API_KEY` in `backend/.env` before building.

---

## Running Tests

### Backend

```bash
cd backend
pytest -v
```

12 tests covering: health endpoint, JSON extraction (valid, rows wrapper, extra text, array preference), error cases (invalid JSON, non-list, non-dict rows), generate endpoint (JSON/CSV), error handling, and input validation.

### Frontend

```bash
cd frontend
npx vitest run
```

17 tests covering: App rendering, format selector, prompt field, sample chips, prompt history, generate flow, API error handling, DataTable (empty/invalid/valid data), and ErrorBoundary (normal/crash).

---

## Sample Prompts

```
Generate 50 fake customer profiles with fields: name, email, age, country
Generate 100 sales records with product, quantity, revenue, and date
Generate a dataset of employee records with id, name, role, and joining_date
Generate 25 SaaS subscriptions with plan_name, mrr, user_count, and status
```

---


## Automated Dependency Updates

This repository uses [Dependabot](https://docs.github.com/en/code-security/supply-chain-security/keeping-your-dependencies-updated-automatically/about-dependabot-version-updates) to keep dependencies up to date:

- **Frontend**: npm dependencies checked weekly
- **Backend**: pip dependencies checked weekly

---

## Contributing

PRs are welcome! Please open an issue for feature requests or bugs.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
