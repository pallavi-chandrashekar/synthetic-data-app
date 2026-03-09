import hashlib
import logging
import json

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import pandas as pd
import sentry_sdk
from cachetools import TTLCache
from pythonjsonlogger.json import JsonFormatter

from config import Settings
from providers import OpenAIProvider, AnthropicProvider, GoogleProvider, LLMProvider

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
settings = Settings()

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        send_default_pii=False,
    )

# Build provider registry
_providers: dict[str, LLMProvider] = {}
if settings.openai_api_key:
    _providers["openai"] = OpenAIProvider(
        settings.openai_api_key, settings.openai_model
    )
if settings.anthropic_api_key:
    _providers["anthropic"] = AnthropicProvider(
        settings.anthropic_api_key, settings.anthropic_model
    )
if settings.google_api_key:
    _providers["google"] = GoogleProvider(
        settings.google_api_key, settings.google_model
    )

_default_provider = (
    settings.available_providers[0] if settings.available_providers else None
)

_response_cache = TTLCache(maxsize=256, ttl=600)  # 10-min TTL

# Header-to-provider mapping for BYOK
_HEADER_PROVIDER_MAP = {
    "x-openai-api-key": ("openai", OpenAIProvider, settings.openai_model),
    "x-anthropic-api-key": ("anthropic", AnthropicProvider, settings.anthropic_model),
    "x-google-api-key": ("google", GoogleProvider, settings.google_model),
}


def _user_key_providers(request: Request) -> dict[str, LLMProvider]:
    """Build ephemeral provider instances from user-supplied API key headers."""
    user_providers: dict[str, LLMProvider] = {}
    for header, (name, cls, model) in _HEADER_PROVIDER_MAP.items():
        key = request.headers.get(header, "").strip()
        if key:
            user_providers[name] = cls(key, model)
    return user_providers


def _resolve_provider(
    request: Request, provider_name: str | None
) -> tuple[str, LLMProvider, bool]:
    """Return (provider_name, provider_instance, is_user_key).

    User-supplied headers override server defaults.
    """
    user_provs = _user_key_providers(request)
    name = provider_name or (
        list(user_provs.keys())[0] if user_provs else _default_provider
    )
    if name and name in user_provs:
        return name, user_provs[name], True
    if name and name in _providers:
        return name, _providers[name], False
    available = list({**_providers, **user_provs}.keys())
    raise HTTPException(
        status_code=400,
        detail=f"Invalid or unconfigured provider: {name}. Available: {available}",
    )


def _cache_key(provider: str, prompt: str) -> str:
    return hashlib.sha256(f"{provider}:{prompt}".encode()).hexdigest()


# ---------------------------------------------------------------------------
# Logging (structured JSON)
# ---------------------------------------------------------------------------
_handler = logging.StreamHandler()
_handler.setFormatter(
    JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level"},
    )
)
logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App & middleware
# ---------------------------------------------------------------------------
app = FastAPI()

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "X-OpenAI-API-Key",
        "X-Anthropic-API-Key",
        "X-Google-API-Key",
    ],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    raise HTTPException(
        status_code=429,
        detail="Too many requests \u2013 please try again later.",
    )


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class DataRequest(BaseModel):
    prompt: str = Field(
        ...,
        min_length=1,
        max_length=settings.max_prompt_length,
        description="Prompt describing the dataset to generate",
    )
    format: Literal["json", "csv"] = "json"
    provider: Optional[str] = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/providers")
async def get_providers(request: Request):
    user_provs = _user_key_providers(request)
    all_providers = list(
        dict.fromkeys(list(_providers.keys()) + list(user_provs.keys()))
    )
    default = _default_provider or (all_providers[0] if all_providers else None)
    return {
        "providers": all_providers,
        "default": default,
    }


@app.get("/health")
async def health(deep: bool = Query(False)):
    checks = {}
    healthy = True

    # Check 1: At least one provider configured
    any_configured = len(_providers) > 0
    checks["any_provider_configured"] = "pass" if any_configured else "fail"
    if not any_configured:
        healthy = False

    # Check 2: Provider reachability (only with ?deep=true)
    if deep:
        for name, provider in _providers.items():
            try:
                await provider.health_check()
                checks[f"{name}_reachable"] = "pass"
            except Exception as exc:
                logger.warning(
                    "Deep health check failed for %s", name, extra={"error": str(exc)}
                )
                checks[f"{name}_reachable"] = "fail"
                healthy = False

    status_code = 200 if healthy else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": "healthy" if healthy else "degraded", "checks": checks},
    )


@app.post("/generate-data")
@limiter.limit("10/minute")
async def generate_data(request: Request, data_request: DataRequest):
    # Resolve provider (user headers override server defaults)
    provider_name, provider, is_user_key = _resolve_provider(
        request, data_request.provider
    )

    logger.info(
        "generate-data request received",
        extra={
            "prompt_prefix": data_request.prompt[:80],
            "format": data_request.format,
            "provider": provider_name,
            "user_key": is_user_key,
        },
    )
    try:
        # Skip server-side cache when user key is used (avoids cross-user leakage)
        if is_user_key:
            content = await provider.generate(data_request.prompt)
        else:
            key = _cache_key(provider_name, data_request.prompt)
            cached = _response_cache.get(key)
            if cached is not None:
                logger.info("cache hit", extra={"cache_key": key[:12]})
                content = cached
            else:
                content = await provider.generate(data_request.prompt)
                _response_cache[key] = content
        data = extract_json(content)

        if data_request.format == "csv":
            df = pd.DataFrame(data)
            return {"csv": df.to_csv(index=False)}

        return {"json": data}

    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning("Bad value: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error")
        raise HTTPException(
            status_code=502,
            detail="Failed to generate synthetic data",
        ) from exc


# ---------------------------------------------------------------------------
# JSON parsing helpers
# ---------------------------------------------------------------------------
def _find_balanced(content: str, open_ch: str, close_ch: str):
    """Return the first balanced substring delimited by open_ch/close_ch, or None."""
    start = content.find(open_ch)
    if start == -1:
        return None
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(content)):
        ch = content[i]
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return content[start : i + 1]
    return None


def extract_json(content: str) -> List[dict]:
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        balanced = _find_balanced(content, "[", "]")
        if balanced:
            parsed = json.loads(balanced)
        else:
            balanced = _find_balanced(content, "{", "}")
            if not balanced:
                raise ValueError("Response did not contain valid JSON")
            parsed = json.loads(balanced)

    if isinstance(parsed, dict) and "rows" in parsed:
        rows = parsed["rows"]
    else:
        rows = parsed

    if not isinstance(rows, list):
        raise ValueError("Response JSON must include an array of rows")

    for idx, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"Row {idx} must be an object")

    return rows
