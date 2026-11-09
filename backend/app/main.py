from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app import models  # noqa: F401
from app.config import settings
from app.database import Base, engine
from app.errors import register_exception_handlers
from app.routers import approval, auth, bookings, reports, rooms, users


def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning during Base.metadata.create_all: {e}")

    try:
        with engine.begin() as conn:
            # PostgreSQL trên Vercel / Supabase hỗ trợ ALTER TABLE IF NOT EXISTS
            if not settings.database_url_sqlalchemy.startswith("sqlite"):
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code VARCHAR(50);"))
            else:
                inspector = inspect(conn)
                if "users" in inspector.get_table_names():
                    cols = [c["name"] for c in inspector.get_columns("users")]
                    if "student_code" not in cols:
                        conn.execute(text("ALTER TABLE users ADD COLUMN student_code VARCHAR(50);"))
    except Exception as e:
        print(f"Warning during auto migration: {e}")


init_db()

app = FastAPI(title="RoomBook API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(rooms.router)
app.include_router(approval.router)   # phải đứng trước bookings
app.include_router(bookings.router)
app.include_router(reports.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}