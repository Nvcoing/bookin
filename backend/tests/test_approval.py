from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401
from app.database import Base
from app.enums import BookingStatus, Role
from app.models import Booking, Room, User
from app.schemas_approval import RejectRequest
from app.services.approval import (
    cancel_future_bookings_for_room, expire_pending, list_pending,
)

NOW = datetime.now(timezone.utc)


@pytest.fixture()
def db(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 't.db'}",
                           connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine, autoflush=False)() as session:
        session.add(Room(code="R1", name="R1", building="A", floor=1,
                         has_elevator=True, capacity=40, facilities=[],
                         preferred_faculties=[]))
        session.add(User(email="s@t.vn", full_name="S", hashed_password="x",
                         role=Role.student, special_needs=[]))
        session.add(User(email="l@t.vn", full_name="L", hashed_password="x",
                         role=Role.lecturer, special_needs=[]))
        session.commit()
        yield session
    engine.dispose()


def add_booking(db, email, start_in_hours, status=BookingStatus.pending,
                created_ago_hours=0, expires_in_hours=None):
    user = db.scalar(select(User).where(User.email == email))
    room = db.scalar(select(Room))
    start = NOW + timedelta(hours=start_in_hours)
    b = Booking(
        user_id=user.id, room_id=room.id,
        start_time=start, end_time=start + timedelta(hours=1),
        attendee_count=5, purpose="x", status=status,
        created_at=NOW - timedelta(hours=created_ago_hours),
        expires_at=None if expires_in_hours is None
        else NOW + timedelta(hours=expires_in_hours),
    )
    db.add(b)
    db.commit()
    return b


def test_queue_puts_lecturer_first(db):
    add_booking(db, "s@t.vn", 24, created_ago_hours=5)   # sinh viên, đến trước
    add_booking(db, "l@t.vn", 48, created_ago_hours=1)   # giảng viên, đến sau
    rows, total = list_pending(db, page=1, size=20)
    assert total == 2
    assert rows[0].user.role == Role.lecturer
    assert rows[1].user.role == Role.student


def test_expire_pending_cancels_only_expired(db):
    expired = add_booking(db, "s@t.vn", 24, expires_in_hours=-1)
    alive = add_booking(db, "s@t.vn", 48, expires_in_hours=10)
    approved = add_booking(db, "l@t.vn", 72, status=BookingStatus.approved,
                           expires_in_hours=-1)
    assert expire_pending(db) == 1
    db.refresh(expired); db.refresh(alive); db.refresh(approved)
    assert expired.status == BookingStatus.cancelled
    assert alive.status == BookingStatus.pending
    assert approved.status == BookingStatus.approved


def test_maintenance_cancels_only_future_bookings(db):
    future_pending = add_booking(db, "s@t.vn", 24)
    future_approved = add_booking(db, "l@t.vn", 48, status=BookingStatus.approved)
    past = add_booking(db, "s@t.vn", -5, status=BookingStatus.approved)
    room_id = db.scalar(select(Room.id))

    n = cancel_future_bookings_for_room(db, room_id, "Bảo trì")
    db.commit()
    assert n == 2
    for b in (future_pending, future_approved, past):
        db.refresh(b)
    assert future_pending.status == BookingStatus.cancelled
    assert future_approved.status == BookingStatus.cancelled
    assert future_approved.reject_reason == "Bảo trì"
    assert past.status == BookingStatus.approved


def test_reject_requires_non_blank_reason():
    with pytest.raises(ValidationError):
        RejectRequest(reason="   ")
    with pytest.raises(ValidationError):
        RejectRequest(reason="")
    assert RejectRequest(reason="  Phòng bận  ").reason == "Phòng bận"