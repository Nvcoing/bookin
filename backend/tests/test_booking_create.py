import threading
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401
from app.database import Base
from app.enums import Role
from app.errors import AppError
from app.models import Room, User
from app.services.booking_create import create_booking
from app.services.scoring import Criteria


@pytest.fixture()
def session_factory(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False)
    with factory() as db:
        for code in ("R1", "R2"):
            db.add(Room(code=code, name=code, building="A", floor=1,
                        has_elevator=True, capacity=40, facilities=[],
                        preferred_faculties=[]))
        for i in range(5):
            db.add(User(email=f"u{i}@t.vn", full_name=f"U{i}",
                        hashed_password="x", role=Role.student, special_needs=[]))
        db.commit()
    yield factory
    engine.dispose()


def _criteria(start, hours=2):
    return Criteria(start=start, end=start + timedelta(hours=hours), attendee_count=10)


def _room_id(db, code):
    return db.scalar(select(Room.id).where(Room.code == code))


def test_concurrent_bookings_only_one_wins(session_factory):
    start = datetime.now(timezone.utc) + timedelta(days=1)
    results = []
    barrier = threading.Barrier(5)

    def worker(user_id):
        with session_factory() as db:
            user = db.get(User, user_id)
            room_id = _room_id(db, "R1")
            barrier.wait()
            try:
                create_booking(db, user, room_id, _criteria(start), "test")
                results.append("ok")
            except AppError as e:
                results.append(e.code)

    with session_factory() as db:
        user_ids = [u.id for u in db.scalars(select(User)).all()]
    threads = [threading.Thread(target=worker, args=(uid,)) for uid in user_ids]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert results.count("ok") == 1
    assert results.count("ROOM_CONFLICT") == 4


def test_conflict_returns_suggestions(session_factory):
    start = datetime.now(timezone.utc) + timedelta(days=1)
    with session_factory() as db:
        users = db.scalars(select(User)).all()
        r1 = _room_id(db, "R1")
        create_booking(db, users[0], r1, _criteria(start), "first")
        with pytest.raises(AppError) as exc:
            create_booking(db, users[1], r1, _criteria(start), "second")

    assert exc.value.status_code == 409
    suggestions = exc.value.details["suggestions"]
    assert 1 <= len(suggestions) <= 3
    assert any(s["room"]["code"] == "R2" for s in suggestions)


def test_back_to_back_is_not_a_conflict(session_factory):
    start = datetime.now(timezone.utc) + timedelta(days=1)
    with session_factory() as db:
        users = db.scalars(select(User)).all()
        r1 = _room_id(db, "R1")
        create_booking(db, users[0], r1, _criteria(start), "morning")
        second = create_booking(db, users[1], r1,
                                _criteria(start + timedelta(hours=2)), "next")
    assert second.id is not None