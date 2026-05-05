from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:12345678@localhost:5432/order_inventory"
    UPLOAD_DIR: str = "uploads"
    API_V1_PREFIX: str = "/api/v1"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
