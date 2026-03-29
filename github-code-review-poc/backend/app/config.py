from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    db_host: str = "postgres"
    db_port: int = 5432
    db_name: str = "codereview"
    db_user: str = "codereview"
    db_password: str = "codereview"
    db_pool_size: int = 10

    github_api_url: str = "https://api.github.com"
    default_github_token: str = ""

    ai_provider: str = "disabled"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    ai_model: str = "claude-opus-4-6"

    encryption_key: str = "0" * 64
    scheduler_timezone: str = "UTC"
    cors_origins: str = "http://localhost:3000,http://frontend:80"

    @property
    def database_url(self) -> str:
        return (f"postgresql://{self.db_user}:{self.db_password}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}")

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()
