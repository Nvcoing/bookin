from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401
from app.config import settings
from app.database import Base, engine
from app.errors import register_exception_handlers
from app.routers import approval, auth, bookings, reports, rooms, users

Base.metadata.create_all(bind=engine)

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