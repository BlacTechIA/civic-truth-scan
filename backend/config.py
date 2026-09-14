import os

from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")

MODEL = "claude-sonnet-4-6"


def allowed_origins_list() -> list[str]:
    return [origin.strip() for origin in ALLOWED_ORIGINS.split(",") if origin.strip()]
