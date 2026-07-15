import yaml
from pathlib import Path
from pydantic_settings import BaseSettings


def load_yaml_settings(file_path: str) -> dict:
    path = Path(file_path)
    if not path.is_file():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


# Load application.yml and application-dev.yml if they exist
yaml_settings: dict = {}
for yaml_file in ["src/main/resources/application.yml", "src/main/resources/application-dev.yml"]:
    yaml_settings.update(load_yaml_settings(yaml_file))


class Settings(BaseSettings):
    PROJECT_NAME: str = "Rebuild FastAPI"
    DEBUG: bool = False
    DATABASE_URL: str = "sqlite:///./test.db"
    SECRET_KEY: str = "rebuild-secret-key-change-in-production"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
