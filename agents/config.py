from typing import Literal, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Multi-provider LLM configuration.

    Default: Groq (free tier, fast, no credit card required).
    Alternatives: Gemini (free tier) or Ollama (fully local).

    Switch providers via the LLM_PROVIDER env var.
    """

    # Provider selection — drives which LLM client gets instantiated
    llm_provider: Literal["groq", "gemini", "ollama"] = "groq"

    # Groq (PRIMARY — free, fast, https://console.groq.com)
    groq_api_key: Optional[str] = None
    groq_model: str = "llama-3.3-70b-versatile"

    # Gemini (free tier — https://aistudio.google.com/apikey)
    google_api_key: Optional[str] = None
    gemini_model: str = "gemini-1.5-flash"

    # Ollama (fully local — install from ollama.com)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"

    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
