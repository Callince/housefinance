from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    DATABASE_URL: str = "sqlite:///./bachelor_finance.db"
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "finance@yourdomain.com"
    VAPID_PRIVATE_KEY_PATH: str = "vapid_private.pem"
    VAPID_PUBLIC_KEY: str = "BFj_94ya3ZSHukaY9hVIrKxFsSDEtPzURMFSYnQbCw8ZsqaoNL-alSrE82vcO_TejTUt-tfI0edaV2IuFCBUx0w"
    VAPID_EMAIL: str = "mailto:goodsoncallince@gmail.com"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    ALGORITHM: str = "HS256"
    # Comma-separated list of allowed CORS origins (e.g. "https://app.vercel.app,http://localhost:5173")
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
