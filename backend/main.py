import hashlib
import logging
import json

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import AsyncOpenAI, Timeout
from typing import List, Literal
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import pandas as pd
import sentry_sdk
from cachetools import TTLCache
from pythonjsonlogger.json import JsonFormatter

from config import Settings

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

client = AsyncOpenAI(
    api_key=settings.openai_api_key,
    timeout=Timeout(timeout=30.0),
)

_response_cache = TTLCache(maxsize=256, ttl=600)  # 10-min TTL


def _cache_key(prompt: str) -> str:
    return hashlib.sha256(prompt.encode()).hexdigest()


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
    allow_headers=["Content-Type"],
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


DATASET_SCHEMA = {
    "type": "object",
    "properties": {
        "rows": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": {
                    "anyOf": [
                        {"type": "string"},
                        {"type": "number"},
                        {"type": "boolean"},
                        {"type": "null"},
                    ]
                },
            },
        }
    },
    "required": ["rows"],
    "additionalProperties": False,
}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
async def health(deep: bool = Query(False)):
    checks = {}
    healthy = True

    # Check 1: API key configured (always runs)
    api_key_set = bool(settings.openai_api_key)
    checks["api_key_configured"] = "pass" if api_key_set else "fail"
    if not api_key_set:
        healthy = False

    # Check 2: OpenAI reachable (only with ?deep=true)
    if deep:
        try:
            await client.models.list()
            checks["openai_reachable"] = "pass"
        except Exception as exc:
            logger.warning("Deep health check failed", extra={"error": str(exc)})
            checks["openai_reachable"] = "fail"
            healthy = False

    status_code = 200 if healthy else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": "healthy" if healthy else "degraded", "checks": checks},
    )


@app.post("/generate-data")
@limiter.limit("10/minute")
async def generate_data(request: Request, data_request: DataRequest):
    logger.info(
        "generate-data request received",
        extra={
            "prompt_prefix": data_request.prompt[:80],
            "format": data_request.format,
        },
    )
    try:
        key = _cache_key(data_request.prompt)
        cached = _response_cache.get(key)
        if cached is not None:
            logger.info("cache hit", extra={"cache_key": key[:12]})
            content = cached
        else:
            content = await request_dataset_from_openai(data_request.prompt)
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
# OpenAI helpers
# ---------------------------------------------------------------------------
async def request_dataset_from_openai(
    prompt: str,
) -> str:
    response = await client.responses.create(
        model=settings.openai_model,
        input=(
            "You are a service that produces synthetic "
            "tabular data. Always return a JSON object "
            "that matches the provided schema and place "
            "all rows within the `rows` array."
            f"\n\nUser prompt: {prompt}"
        ),
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "synthetic_dataset",
                "schema": DATASET_SCHEMA,
                "strict": True,
            },
        },
        temperature=0.4,
    )

    try:
        first_output = response.output[0]
        first_content = first_output.content[0]
        return first_content.text
    except (AttributeError, IndexError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Malformed response from OpenAI",
        ) from exc


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
