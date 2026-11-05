from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401
from app.database import Base
from app.enums import BookingStatus as S
from app.enums import Role
from app.errors import AppError
from app.models import Booking, Room, User
from app.services import reports

VN = timezone(timedelta(hours=7))
D_FROM, D_TO = date(2026, 11, 9), date(2026, 11, 15)


def utc(day, hour):
    return datetime(2026, 11, day, hour, tzinfo=VN).astimezone(timezone.utc)


def add(db, room_code, day, h1, h2, status):
    room = db.scalar(select(Room).where(Room.code == room_code))
    user = db.scalar(select(User))
    db.add(Booking(user_id=user.id, room_id=room.id, start_time=utc(day, h1),
                   end_time=utc(day, h2), attendee_count=5, purpose="x", status=status))
    db.commit()


@pytest.fixture()
def db(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 't.db'}",
                           connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine, autoflush=False)() as session:
        for code in ("R1", "R2"):
            session.add(Room(code=code, name=code, building="A", floor=1,
                             has_elevator=True, capacity=40, facilities=[],
                             preferred_faculties=[]))
        session.add(User(email="u@t.vn", full_name="U", hashed_password="x",
                         role=Role.student, special_needs=[]))
        session.commit()
        yield session
    engine.dispose()


@pytest.fixture()
def seeded(db):
    add(db, "R1", 9, 8, 10, S.approved)     # Thứ Hai
    add(db, "R1", 9, 14, 16, S.approved)    # Thứ Hai
    add(db, "R2", 10, 8, 11, S.approved)    # Thứ Ba
    add(db, "R1", 13, 10, 12, S.pending)    # Thứ Sáu
    add(db, "R2", 14, 8, 10, S.rejected)    # Thứ Bảy
    add(db, "R1", 15, 8, 10, S.cancelled)   # Chủ Nhật
    return db


def test_resolve_range_uses_vietnam_midnight():
    _, _, start, end = reports.resolve_range(date(2026, 11, 9), date(2026, 11, 9))
    assert start == datetime(2026, 11, 8, 17, tzinfo=timezone.utc)
    assert end == datetime(2026, 11, 9, 17, tzinfo=timezone.utc)


def test_resolve_range_rejects_bad_ranges():
    with pytest.raises(AppError):
        reports.resolve_range(date(2026, 11, 15), date(2026, 11, 9))
    with pytest.raises(AppError):
        reports.resolve_range(date(2025, 1, 1), date(2026, 11, 9))
    d_from, d_to, _, _ = reports.resolve_range(None, None)
    assert (d_to - d_from).days == 29


def test_summary_counts_every_status(seeded):
    _, _, start, end = reports.resolve_range(D_FROM, D_TO)
    result = reports.summary(seeded, start, end)
    assert result["total"] == 6
    assert result["by_status"] == {"pending": 1, "approved": 3, "rejected": 1, "cancelled": 1}


def test_peak_hours_counts_pending_and_approved(seeded):
    _, _, start, end = reports.resolve_range(D_FROM, D_TO)
    result = reports.peak_hours(seeded, start, end)
    assert len(result["by_hour"]) == 24 and len(result["by_weekday"]) == 7
    hours = {x["hour"]: x["count"] for x in result["by_hour"]}
    assert hours[8] == 2 and hours[10] == 1 and hours[14] == 1 and hours[9] == 0
    days = {x["weekday"]: x["count"] for x in result["by_weekday"]}
    assert days[1] == 2 and days[2] == 1 and days[5] == 1 and days[6] == 0


def test_occupancy_uses_approved_hours_only(seeded):
    rng = reports.resolve_range(D_FROM, D_TO)
    result = reports.occupancy(seeded, *rng)
    by_code = {i["code"]: i for i in result["items"]}
    assert by_code["R1"]["booked_hours"] == 4.0
    assert by_code["R1"]["available_hours"] == 98.0
    assert by_code["R1"]["occupancy_rate"] == 0.0408
    assert by_code["R2"]["occupancy_rate"] == 0.0306
    assert result["overall_occupancy_rate"] == 0.0357


def test_occupancy_ignores_hours_outside_opening_window(db):
    add(db, "R2", 12, 6, 8, S.approved)     # chỉ 07:00-08:00 được tính
    rng = reports.resolve_range(D_FROM, D_TO)
    by_code = {i["code"]: i for i in reports.occupancy(db, *rng)["items"]}
    assert by_code["R2"]["booked_hours"] == 1.0