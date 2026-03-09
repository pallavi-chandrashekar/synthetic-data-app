import abc
import json
import logging

from fastapi import HTTPException
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a service that produces synthetic tabular data. "
    "Always return a JSON object that matches the provided schema "
    "and place all rows within the `rows` array."
)

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


class LLMProvider(abc.ABC):
    @abc.abstractmethod
    async def generate(self, prompt: str) -> str: ...

    @abc.abstractmethod
    async def health_check(self) -> bool: ...


# ---------------------------------------------------------------------------
# OpenAI
# ---------------------------------------------------------------------------
def _is_openai_retryable(exc):
    from openai import APIStatusError, APITimeoutError, APIConnectionError

    if isinstance(exc, (APITimeoutError, APIConnectionError)):
        return True
    if isinstance(exc, APIStatusError) and exc.status_code >= 500:
        return True
    return False


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        from openai import AsyncOpenAI, Timeout

        self._client = AsyncOpenAI(api_key=api_key, timeout=Timeout(timeout=25.0))
        self._model = model

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception(_is_openai_retryable),
        reraise=True,
    )
    async def generate(self, prompt: str) -> str:
        response = await self._client.responses.create(
            model=self._model,
            input=f"{SYSTEM_PROMPT}\n\nUser prompt: {prompt}",
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
            return response.output[0].content[0].text
        except (AttributeError, IndexError) as exc:
            raise HTTPException(
                status_code=502, detail="Malformed response from OpenAI"
            ) from exc

    async def health_check(self) -> bool:
        await self._client.models.list()
        return True


# ---------------------------------------------------------------------------
# Anthropic
# ---------------------------------------------------------------------------
def _is_anthropic_retryable(exc):
    from anthropic import APIStatusError, APITimeoutError, APIConnectionError

    if isinstance(exc, (APITimeoutError, APIConnectionError)):
        return True
    if isinstance(exc, APIStatusError) and exc.status_code >= 500:
        return True
    return False


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        from anthropic import AsyncAnthropic

        self._client = AsyncAnthropic(api_key=api_key, timeout=25.0)
        self._model = model

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception(_is_anthropic_retryable),
        reraise=True,
    )
    async def generate(self, prompt: str) -> str:
        schema_str = json.dumps(DATASET_SCHEMA, indent=2)
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=4096,
            system=(
                f"{SYSTEM_PROMPT}\n\n"
                "You MUST respond with ONLY a valid JSON object"
                f" matching this schema:\n{schema_str}\n"
                "Do not include any other text, markdown, or explanation."
            ),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
        )
        try:
            return response.content[0].text
        except (AttributeError, IndexError) as exc:
            raise HTTPException(
                status_code=502, detail="Malformed response from Anthropic"
            ) from exc

    async def health_check(self) -> bool:
        # Anthropic doesn't have a lightweight list endpoint; send a minimal request
        await self._client.messages.create(
            model=self._model,
            max_tokens=10,
            messages=[{"role": "user", "content": "ping"}],
        )
        return True


# ---------------------------------------------------------------------------
# Google Gemini
# ---------------------------------------------------------------------------
def _is_google_retryable(exc):
    # google-genai raises google.genai.errors.APIError for server errors
    try:
        from google.genai import errors as genai_errors

        if isinstance(exc, genai_errors.APIError) and getattr(exc, "code", 0) >= 500:
            return True
    except ImportError:
        pass
    if isinstance(exc, (TimeoutError, ConnectionError)):
        return True
    return False


class GoogleProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        from google import genai

        self._client = genai.Client(api_key=api_key)
        self._model = model

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception(_is_google_retryable),
        reraise=True,
    )
    async def generate(self, prompt: str) -> str:
        from google.genai import types

        schema_str = json.dumps(DATASET_SCHEMA, indent=2)
        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=(
                f"{SYSTEM_PROMPT}\n\n"
                f"Respond with a JSON object matching this schema:\n{schema_str}\n\n"
                f"User prompt: {prompt}"
            ),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4,
            ),
        )
        try:
            return response.text
        except (AttributeError, IndexError) as exc:
            raise HTTPException(
                status_code=502, detail="Malformed response from Google"
            ) from exc

    async def health_check(self) -> bool:
        await self._client.aio.models.get(model=self._model)
        return True
