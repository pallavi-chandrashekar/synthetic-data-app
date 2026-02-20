import logging
import json
import os
import re

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from openai import AsyncOpenAI
from typing import List, Literal
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import pandas as pd

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
load_dotenv()

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1")
MAX_PROMPT_LENGTH = int(os.getenv("MAX_PROMPT_LENGTH", "2000"))

CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
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
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        max_length=MAX_PROMPT_LENGTH,
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
async def health():
    return {"status": "ok"}


@app.post("/generate-data")
@limiter.limit("10/minute")
async def generate_data(request: Request, data_request: DataRequest):
    logger.info(
        "generate-data  prompt=%r  format=%s",
        data_request.prompt[:80],
        data_request.format,
    )
    try:
        content = await request_dataset_from_openai(data_request.prompt)
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
        model=OPENAI_MODEL,
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


def extract_json(content: str) -> List[dict]:
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        array_match = re.search(r"\[.*\]", content, re.DOTALL)
        if array_match:
            parsed = json.loads(array_match.group(0))
        else:
            object_match = re.search(r"\{.*\}", content, re.DOTALL)
            if not object_match:
                raise ValueError("Response did not contain valid JSON")
            parsed = json.loads(object_match.group(0))

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
