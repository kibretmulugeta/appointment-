import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Scheduler Application"
    ENV: str = os.getenv("NODE_ENV", "development")
    PORT: int = int(os.getenv("PORT", "5000"))
    
    # MongoDB Atlas
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb+srv://google-db:google-google@cluster0.vfutu6u.mongodb.net/scheduler?retryWrites=true&w=majority")
    
    # JWT Authentication
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_jwt_key_production_2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 30
    
    # Frontend & Backend URLs
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:5000")
    
    # Google OAuth & APIs
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_CALLBACK_URL: str = os.getenv("GOOGLE_CALLBACK_URL", "http://localhost:5000/api/auth/google/callback")
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    
    # GitHub OAuth
    GITHUB_CLIENT_ID: Optional[str] = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: Optional[str] = os.getenv("GITHUB_CLIENT_SECRET", "")
    GITHUB_CALLBACK_URL: str = os.getenv("GITHUB_CALLBACK_URL", "http://localhost:5000/api/auth/github/callback")
    
    # Email Provider (Resend / SMTP)
    EMAIL_PROVIDER: str = os.getenv("EMAIL_PROVIDER", "smtp")
    EMAIL_API_KEY: Optional[str] = os.getenv("EMAIL_API_KEY", "")
    EMAIL_HOST: str = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT: int = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USER: Optional[str] = os.getenv("EMAIL_USER", "")
    EMAIL_PASS: Optional[str] = os.getenv("EMAIL_PASS", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "Scheduler <noreply@scheduler.com>")
    
    # Twilio SMS
    TWILIO_ACCOUNT_SID: Optional[str] = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: Optional[str] = os.getenv("TWILIO_PHONE_NUMBER", "")
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
