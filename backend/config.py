import logging

from pydantic_settings import BaseSettings
from pydantic import Field, model_validator

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    openai_api_key: str = Field(default="")
    openai_model: str = Field(default="gpt-4.1")
    anthropic_api_key: str = Field(default="")
    anthropic_model: str = Field(default="claude-sonnet-4-20250514")
    google_api_key: str = Field(default="")
    google_model: str = Field(default="gemini-2.0-flash")
    max_prompt_length: int = Field(default=2000)
    cors_origins: str = Field(default="http://localhost:3000")
    sentry_dsn: str = Field(default="")

    @model_validator(mode="after")
    def at_least_one_key(self):
        if not any([self.openai_api_key, self.anthropic_api_key, self.google_api_key]):
            logger.warning(
                "No server-side LLM API keys configured. "
                "Users must provide their own keys via headers."
            )
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def available_providers(self) -> list[str]:
        providers = []
        if self.openai_api_key:
            providers.append("openai")
        if self.anthropic_api_key:
            providers.append("anthropic")
        if self.google_api_key:
            providers.append("google")
        return providers
