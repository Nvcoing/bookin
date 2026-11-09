from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401
from app.database import Base, get_db
from app.enums import Role
from app.main import app
from app.models import Room, User
from app.security import hash_password

PASSWORD = "Passw0rd!"
PW_HASH = hash_password(PASSWORD)

USERS = [
    ("admin@roombook.test", Role.admin, []),
    ("lecturer@roombook.test", Role.lecturer, []),
    ("student@roombook.test", Role.student, []),
    ("injured@roombook.test", Role.student, ["leg_injury"]),
]
# (mã, tầng, thang máy, sức chứa, phòng đặc biệt)
ROOMS = [
    ("R-A", 1, False, 40, False),
    ("R-B", 2, True, 60, False),
    ("R-S", 3, True, 20, True),
]


@pytest.fixture()
def client(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'api.db'}",
                           connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False)
    with factory() as db:
        for email, role, needs in USERS:
            db.add(User(email=email, full_name=email.split("@")[0], hashed_password=PW_HASH,
                        role=role, faculty="CNTT", special_needs=needs))
        for code, floor, lift, cap, special in ROOMS:
            db.add(Room(code=code, name=code, building="T", floor=floor, has_elevator=lift,
                        capacity=cap, facilities=["projector"], is_special=special,
                        preferred_faculties=[]))
        db.commit()

    def override_get_db():
        db = factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    engine.dispose()


def login(client, email):
    r = client.post("/api/auth/login", data={"username": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def room_ids(client):
    r = client.get("/api/rooms", params={"size": 100}, headers=login(client, "admin@roombook.test"))
    return {x["code"]: x["id"] for x in r.json()["items"]}


def payload(room_id, days=3, hour=9, hours=2, attendees=10, **extra):
    start = (datetime.now(timezone.utc) + timedelta(days=days)).replace(
        hour=hour, minute=0, second=0, microsecond=0)
    data = {
        "room_id": room_id,
        "start_time": start.isoformat(),
        "end_time": (start + timedelta(hours=hours)).isoformat(),
        "attendee_count": attendees,
        "purpose": "Test",
        "required_facilities": [],
        "temp_special_needs": [],
    }
    data.update(extra)
    return data


def test_auth_flow(client):
    invalid = client.post("/api/auth/register", json={
        "email": "test@gmail.com", "password": "Matkhau@123", "full_name": "Test"
    })
    assert invalid.status_code == 400 and invalid.json()["code"] == "INVALID_EMAIL_DOMAIN"

    body = {"email": "new@vnu.edu.vn", "password": "Matkhau@123",
            "full_name": "New", "special_needs": ["wheelchair"]}
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 201 and r.json()["role"] == "student"

    dup = client.post("/api/auth/register", json=body)
    assert dup.status_code == 409 and dup.json()["code"] == "EMAIL_EXISTS"

    bad = client.post("/api/auth/login", data={"username": "new@vnu.edu.vn", "password": "sai"})
    assert bad.status_code == 401 and bad.json()["code"] == "INVALID_CREDENTIALS"

    me = client.get("/api/users/me", headers={"Authorization": "Bearer " + client.post(
        "/api/auth/login",
        data={"username": "new@vnu.edu.vn", "password": "Matkhau@123"},
    ).json()["access_token"]})
    assert me.status_code == 200 and me.json()["special_needs"] == ["wheelchair"]
    assert client.get("/api/users/me").status_code == 401

    # Email đuôi .test (như tài khoản seed) vẫn xem được hồ sơ
    admin_me = client.get("/api/users/me", headers=login(client, "admin@roombook.test"))
    assert admin_me.status_code == 200 and admin_me.json()["role"] == "admin"


def test_error_format_is_consistent(client):
    r = client.get("/api/users/me")
    assert r.status_code == 401 and set(r.json()) == {"code", "message", "details"}

    r = client.post("/api/auth/register",
                    json={"email": "x@school.edu.vn", "password": "123", "full_name": "X"})
    assert r.status_code == 422
    assert r.json()["code"] == "VALIDATION_ERROR" and r.json()["details"]["errors"]


def test_room_permissions(client):
    new_room = {"code": "N-1", "name": "New", "building": "N", "floor": 1, "capacity": 10}
    assert client.post("/api/rooms", json=new_room,
                       headers=login(client, "student@roombook.test")).status_code == 403
    admin = login(client, "admin@roombook.test")
    assert client.post("/api/rooms", json=new_room, headers=admin).status_code == 201
    dup = client.post("/api/rooms", json=new_room, headers=admin)
    assert dup.status_code == 409 and dup.json()["code"] == "ROOM_CODE_EXISTS"


def test_conflict_returns_suggestions(client):
    ids = room_ids(client)
    student = login(client, "student@roombook.test")
    lecturer = login(client, "lecturer@roombook.test")

    first = client.post("/api/bookings", json=payload(ids["R-B"]), headers=student)
    assert first.status_code == 201 and first.json()["status"] == "pending"

    clash = client.post("/api/bookings", json=payload(ids["R-B"], hour=10), headers=lecturer)
    assert clash.status_code == 409
    assert clash.json()["code"] == "ROOM_CONFLICT"
    assert 1 <= len(clash.json()["details"]["suggestions"]) <= 3

    adjacent = client.post("/api/bookings", json=payload(ids["R-B"], hour=11), headers=lecturer)
    assert adjacent.status_code == 201


def test_approval_flow_and_queue_priority(client):
    ids = room_ids(client)
    student = login(client, "student@roombook.test")
    lecturer = login(client, "lecturer@roombook.test")
    admin = login(client, "admin@roombook.test")

    b1 = client.post("/api/bookings", json=payload(ids["R-B"]), headers=student).json()["id"]
    b2 = client.post("/api/bookings", json=payload(ids["R-A"]), headers=lecturer).json()["id"]

    assert client.get("/api/bookings/pending", headers=student).status_code == 403
    queue = client.get("/api/bookings/pending", headers=admin).json()
    assert [i["id"] for i in queue["items"]] == [b2, b1]      # giảng viên đứng trước
    for item in queue["items"]:
        assert "special_needs" not in item and "special_needs" not in item["user"]

    ok = client.post(f"/api/bookings/{b2}/approve", headers=admin)
    assert ok.status_code == 200 and ok.json()["status"] == "approved"
    again = client.post(f"/api/bookings/{b2}/approve", headers=admin)
    assert again.status_code == 409 and again.json()["code"] == "BOOKING_NOT_PENDING"

    blank = client.post(f"/api/bookings/{b1}/reject", json={"reason": "   "}, headers=admin)
    assert blank.status_code == 422
    rejected = client.post(f"/api/bookings/{b1}/reject", json={"reason": "Phòng bận"}, headers=admin)
    assert rejected.status_code == 200 and rejected.json()["status"] == "rejected"

    mine = client.get("/api/bookings/me", headers=student).json()
    assert mine["items"][0]["status"] == "rejected"
    assert mine["items"][0]["reject_reason"] == "Phòng bận"


def test_cancel_rules(client):
    ids = room_ids(client)
    student = login(client, "student@roombook.test")
    lecturer = login(client, "lecturer@roombook.test")

    b = client.post("/api/bookings", json=payload(ids["R-B"]), headers=student).json()["id"]
    assert client.get(f"/api/bookings/{b}", headers=lecturer).status_code == 403
    assert client.post(f"/api/bookings/{b}/cancel", headers=lecturer).status_code == 403

    done = client.post(f"/api/bookings/{b}/cancel", headers=student)
    assert done.status_code == 200 and done.json()["status"] == "cancelled"
    again = client.post(f"/api/bookings/{b}/cancel", headers=student)
    assert again.status_code == 409 and again.json()["code"] == "BOOKING_NOT_CANCELLABLE"

    rebook = client.post("/api/bookings", json=payload(ids["R-B"]), headers=lecturer)
    assert rebook.status_code == 201      # phòng được giải phóng ngay


def test_injured_user_safety(client):
    ids = room_ids(client)
    injured = login(client, "injured@roombook.test")
    student = login(client, "student@roombook.test")

    r = client.post("/api/bookings", json=payload(ids["R-A"]), headers=injured)
    assert r.status_code == 400 and r.json()["code"] == "ROOM_NOT_SUITABLE"
    assert "ACCESSIBILITY_REQUIRED" in r.json()["details"]["reasons"]

    rec_body = payload(ids["R-A"])
    rec_body.pop("room_id")
    rec = client.post("/api/bookings/recommendations", json=rec_body, headers=injured)
    assert rec.status_code == 200
    assert [x["room"]["code"] for x in rec.json()["recommendations"]] == ["R-B"]

    assert client.post("/api/bookings", json=payload(ids["R-B"]), headers=injured).status_code == 201

    # Nhu cầu tạm thời của riêng đơn này cũng kích hoạt quy tắc an toàn
    temp = client.post("/api/bookings",
                       json=payload(ids["R-A"], hour=5, hours=2, temp_special_needs=["wheelchair"]),
                       headers=student)
    assert temp.status_code == 400
    assert "ACCESSIBILITY_REQUIRED" in temp.json()["details"]["reasons"]


def test_outside_operating_hours_rejected(client):
    ids = room_ids(client)
    student = login(client, "student@roombook.test")
    # Giờ đêm: 17:00 UTC = 00:00 VN
    bad = client.post("/api/bookings", json=payload(ids["R-B"], hour=17, hours=2), headers=student)
    assert bad.status_code == 400
    assert bad.json()["code"] == "OUTSIDE_OPERATING_HOURS"


def test_special_room_permission(client):
    ids = room_ids(client)
    student = client.post("/api/bookings", json=payload(ids["R-S"]),
                          headers=login(client, "student@roombook.test"))
    assert student.status_code == 403 and student.json()["code"] == "SPECIAL_ROOM_NOT_ALLOWED"
    lecturer = client.post("/api/bookings", json=payload(ids["R-S"]),
                           headers=login(client, "lecturer@roombook.test"))
    assert lecturer.status_code == 201


def test_maintenance_cancels_future_bookings(client):
    ids = room_ids(client)
    student = login(client, "student@roombook.test")
    admin = login(client, "admin@roombook.test")

    client.post("/api/bookings", json=payload(ids["R-B"], days=4), headers=student)
    r = client.patch(f"/api/rooms/{ids['R-B']}/status", json={"status": "maintenance"}, headers=admin)
    assert r.status_code == 200 and r.json()["status"] == "maintenance"

    mine = client.get("/api/bookings/me", headers=student).json()["items"][0]
    assert mine["status"] == "cancelled"
    assert mine["reject_reason"] == "Phòng chuyển sang bảo trì."

    blocked = client.post("/api/bookings", json=payload(ids["R-B"], days=5), headers=student)
    assert blocked.status_code == 400
    assert "ROOM_UNAVAILABLE" in blocked.json()["details"]["reasons"]


def test_reports_access(client):
    student = login(client, "student@roombook.test")
    admin = login(client, "admin@roombook.test")
    assert client.get("/api/reports/summary", headers=student).status_code == 403
    for name in ("summary", "occupancy", "peak-hours"):
        assert client.get(f"/api/reports/{name}", headers=admin).status_code == 200, name

    peak = client.get("/api/reports/peak-hours", headers=admin).json()
    assert len(peak["by_hour"]) == 24 and len(peak["by_weekday"]) == 7

    bad = client.get("/api/reports/summary",
                     params={"from": "2026-11-15", "to": "2026-11-09"}, headers=admin)
    assert bad.status_code == 400 and bad.json()["code"] == "INVALID_DATE_RANGE"