# Enterprise Improvements TODO

## Tier 1 — Security (fix before any public exposure)

- [x] **A. Fix ReDoS vulnerability in `extract_json()`** (`backend/main.py`)
  - Replace greedy `.*` regex patterns (`r"\[.*\]"`, `r"\{.*\}"` with `re.DOTALL`) with a bounded JSON parser or non-backtracking approach to prevent catastrophic backtracking on crafted input.

- [x] **B. Run containers as non-root** (both Dockerfiles)
  - Add a non-root user (`appuser`) to both backend and frontend Dockerfiles. Currently both run as root — if compromised, attacker gets full container access.

- [x] **C. Add request timeouts everywhere**
  - Backend: Add `timeout` to `AsyncOpenAI` client (e.g., 30s). A stalled OpenAI call currently hangs the worker forever.
  - Frontend: Add `timeout` to `axios.post()` calls. Loading state can spin indefinitely.
  - Consider adding a circuit breaker pattern so that if OpenAI is down, requests fail fast instead of blocking workers.

- [x] **D. Restrict CORS** (`backend/main.py`)
  - Change `allow_methods=["*"]` → `["GET", "POST", "OPTIONS"]`
  - Change `allow_headers=["*"]` → `["Content-Type"]`

- [x] **E. Add security headers to nginx** (`frontend/Dockerfile`)
  - Add `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`, and `Strict-Transport-Security` headers to the nginx config.

- [x] **F. Pin backend dependencies** (`backend/requirements.txt`)
  - All dependencies are unpinned. Pin with `==` to prevent silent breakage or vulnerability introduction on upgrades.

---

## Tier 2 — Architecture (scalability blockers)

- [x] **G. Refactor monolithic App.jsx** (573 lines)
  - Extract custom hooks:
    - `useDataGeneration()` — API calls, cache, loading state
    - `usePromptHistory()` — localStorage read/write, undo/delete
    - `useThemeMode()` — color mode toggle + theme creation
  - Extract components:
    - `PromptForm` — input, chips, format select, row count
    - `ActionBar` — generate, download, copy, re-generate buttons
    - `HistoryPanel` — history list + delete dialog

- [x] **H. Validate environment at startup** (`backend/main.py`)
  - If `OPENAI_API_KEY` is missing, the app boots fine and only fails on the first request. Use `pydantic-settings` `BaseSettings` to validate required config at startup — fail fast.

- [x] **I. Add server-side caching / deduplication**
  - Every identical prompt re-calls OpenAI (real cost per request). Add a server-side cache (Redis or in-memory with TTL) and/or request deduplication with idempotency keys.

- [x] **J. Run multiple uvicorn workers** (`backend/Dockerfile`)
  - Currently runs 1 worker. A single slow OpenAI call blocks all subsequent requests. Use `--workers` (CPU count) or switch to `gunicorn` with uvicorn workers.

---

## Tier 3 — Reliability & Observability

- [x] **K. Deep health check** (`backend/main.py`)
  - `GET /health` returns `{"status": "ok"}` unconditionally. Add a dependency check: validate API key is set, optionally ping OpenAI. Without this, load balancers route traffic to broken instances.

- [x] **L. Integrate error tracking service**
  - `ErrorBoundary` logs to `console.error`; backend returns generic 502s. Neither reports to an external service (Sentry, Datadog, etc.). Production errors will be invisible.

- [x] **M. Structured logging** (`backend/main.py`)
  - Replace plain-text `logging.info()` with JSON structured logs for log aggregator compatibility (ELK, CloudWatch, Datadog).

- [x] **N. Harden docker-compose.yml**
  - Add `restart: unless-stopped` policies
  - Add `mem_limit` / `cpus` resource constraints
  - Add `depends_on` with health check ordering
  - Add `networks` isolation (backend shouldn't be directly reachable from outside)
  - Fix `VITE_API_URL=http://localhost:8000` — baked at build time, won't work in deployed environments

---

## Tier 4 — CI/CD gaps

- [x] **O. Stop silently swallowing npm audit failures**
  - `npm audit --audit-level=moderate || true` means CI never fails on known vulnerabilities. Remove `|| true` or change to `--audit-level=high`.

- [x] **P. Add Docker build verification to CI**
  - CI never runs `docker build`. A broken Dockerfile won't be caught until someone tries to deploy.

- [x] **Q. Enforce coverage thresholds**
  - Both backend and frontend run coverage but don't enforce a minimum. Add `--cov-fail-under=70` (pytest) and a vitest threshold config. Without this, tests can be deleted and CI still passes.

- [x] **R. Wire E2E tests into CI**
  - A comprehensive 16-scenario Playwright test already exists (`e2e/video-demo.spec.js`) but is never run in CI. This is the most valuable test in the repo.
  - ~~E2E test had 3 broken locators~~ Fixed: `getByLabel("Prompt")` ambiguity, `role=progressbar` → `.MuiSkeleton-root`, case-insensitive `/Clear History/i`.

---

## Other fixes

- [x] **Fix eslint pre-commit hook** (`.pre-commit-config.yaml`)
  - Hook ran `npx --prefix frontend eslint` from repo root where no `eslint.config.js` exists. Fixed to `cd frontend` first.
