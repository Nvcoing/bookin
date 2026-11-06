from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = str(Path(__file__).resolve().parent.parent / ".env")
_VALID_LIBPQ_PARAMS = {
    "sslmode", "connect_timeout", "application_name",
    "sslrootcert", "sslcert", "sslkey", "keepalives",
    "keepalives_idle", "keepalives_interval", "keepalives_count",
}


class Settings(BaseSettings):
    DATABASE_URL: str = Field(
        default="sqlite:///./roombook.db",
        validation_alias=AliasChoices("DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"),
    )
    SECRET_KEY: str = Field(
        default="doi-thanh-chuoi-ngau-nhien-dai",
        validation_alias=AliasChoices("SECRET_KEY", "SUPABASE_JWT_SECRET"),
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173"
    PENDING_EXPIRE_HOURS: int = 48

    model_config = SettingsConfigDict(env_file=(_ENV_FILE, ".env"), extra="ignore")

    @property
    def database_url_sqlalchemy(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

        # Lọc bỏ các tham số không phải libpq chuẩn do Vercel/Prisma tự thêm vào (ví dụ: supa, pgbouncer)
        parsed = urlparse(url)
        if parsed.query:
            qs = parse_qs(parsed.query)
            filtered_qs = {k: v for k, v in qs.items() if k.lower() in _VALID_LIBPQ_PARAMS}
            new_query = urlencode(filtered_qs, doseq=True)
            url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))

        return url

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()  # type: ignore