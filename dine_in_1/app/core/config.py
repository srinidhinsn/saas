# from pydantic import BaseSettings
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:Shanmugam%40143@localhost/saas_app"

    class Config:
        env_file = ".env"


settings = Settings()
