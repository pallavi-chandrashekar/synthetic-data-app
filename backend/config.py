from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    openai_api_key: str = Field(...)  # required — fail fast
    openai_model: str = Field(default="gpt-4.1")
    max_prompt_length: int = Field(default=2000)
    cors_origins: str = Field(default="http://localhost:3000")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]
