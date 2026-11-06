from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# SQLite cần tham số này để dùng được với FastAPI; PostgreSQL thì không
connect_args = (
    {"check_same_thread": False}
    if settings.database_url_sqlalchemy.startswith("sqlite")
    else {}
)

engine = create_engine(settings.database_url_sqlalchemy, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency: mỗi request dùng một session, xong thì đóng."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()