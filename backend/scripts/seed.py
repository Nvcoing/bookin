import sys
from datetime import datetime, time, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app import models  # noqa: F401
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.enums import BookingStatus as S
from app.enums import Role, RoomStatus
from app.models import Booking, Room, User
from app.security import hash_password

VN = timezone(timedelta(hours=7))
TODAY = datetime.now(VN).date()
NOW = datetime.now(timezone.utc)


def at(day_offset: int, hour: int) -> datetime:
    """Giờ Việt Nam của (hôm nay + day_offset) lúc `hour` giờ, đổi sang UTC."""
    d = TODAY + timedelta(days=day_offset)
    return datetime.combine(d, time(hour), tzinfo=VN).astimezone(timezone.utc)


# (email, mật khẩu, họ tên, vai trò, khoa, nhu cầu đặc biệt)
USERS = [
    ("admin@vnu.edu.vn", "Admin@123", "Quản trị viên Hệ thống", Role.admin, "Phòng Đào tạo", []),
    ("lecturer@vnu.edu.vn", "Lecturer@123", "Giảng viên Một", Role.lecturer, "CNTT", []),
    ("lecturer2@vnu.edu.vn", "Lecturer@123", "Giảng viên Hai", Role.lecturer, "Điện tử", []),
    ("student@vnu.edu.vn", "Student@123", "Sinh viên Bình thường", Role.student, "CNTT", []),
    ("injured@vnu.edu.vn", "Student@123", "Sinh viên Chấn thương chân", Role.student, "CNTT", ["leg_injury"]),
    ("wheelchair@vnu.edu.vn", "Student@123", "Sinh viên Xe lăn", Role.student, "Điện tử", ["wheelchair"]),
]

# (mã, tên, tòa, tầng, thang máy, sức chứa, thiết bị, khoa quen thuộc, phòng đặc biệt, trạng thái)
ROOMS = [
    ("A1-101", "Phòng học A1-101", "A1", 1, False, 40, ["projector", "whiteboard"], ["CNTT"], False, "active"),
    ("A1-102", "Phòng học A1-102", "A1", 1, False, 30, ["whiteboard"], [], False, "active"),
    ("A1-201", "Phòng học A1-201", "A1", 2, False, 50, ["projector", "air_conditioner"], [], False, "active"),
    ("A1-301", "Phòng học A1-301", "A1", 3, False, 45, ["projector"], [], False, "active"),
    ("A2-101", "Phòng học A2-101", "A2", 1, True, 60, ["projector", "microphone", "air_conditioner"], ["CNTT", "Điện tử"], False, "active"),
    ("A2-102", "Phòng học A2-102", "A2", 1, True, 25, ["whiteboard", "computer"], [], False, "active"),
    ("A2-201", "Phòng học A2-201", "A2", 2, True, 80, ["projector", "microphone", "air_conditioner"], [], False, "active"),
    ("A2-202", "Phòng học A2-202", "A2", 2, True, 35, ["projector", "whiteboard"], ["Điện tử"], False, "active"),
    ("A2-301", "Phòng học A2-301", "A2", 3, True, 40, ["projector"], [], False, "active"),
    ("A2-401", "Phòng học A2-401", "A2", 4, True, 30, ["whiteboard"], [], False, "active"),
    ("A2-501", "Phòng học A2-501", "A2", 5, True, 20, ["video_conference"], [], False, "active"),
    ("B3-101", "Hội trường B3", "B3", 1, True, 100, ["projector", "microphone", "air_conditioner"], [], True, "active"),
    ("B3-201", "Phòng họp B3-201", "B3", 2, True, 20, ["video_conference", "projector"], [], True, "active"),
    ("B3-301", "Phòng họp B3-301", "B3", 3, True, 20, ["video_conference"], [], True, "active"),
    ("C1-101", "Phòng máy C1-101", "C1", 1, True, 40, ["computer", "projector", "air_conditioner"], ["CNTT"], False, "active"),
    ("C1-201", "Phòng máy C1-201", "C1", 2, True, 40, ["computer", "projector"], [], False, "active"),
    ("C1-301", "Phòng máy C1-301", "C1", 3, True, 35, ["computer"], [], False, "maintenance"),
]

P, AP, RJ, CX = S.pending, S.approved, S.rejected, S.cancelled

# (phòng, email, ngày lệch so với hôm nay, giờ bắt đầu, giờ kết thúc, trạng thái, lý do, số người, mục đích)
BOOKINGS = [
    ("A2-101", "lecturer@roombook.test", 2, 8, 10, AP, None, 45, "Lớp Cơ sở dữ liệu"),
    ("A2-101", "lecturer2@roombook.test", 2, 14, 16, AP, None, 50, "Seminar bộ môn"),
    ("A2-201", "lecturer2@roombook.test", 3, 8, 11, AP, None, 70, "Hội thảo khoa"),
    ("C1-101", "student@roombook.test", 3, 13, 15, AP, None, 30, "Thực hành nhóm"),
    ("B3-201", "lecturer@roombook.test", 4, 9, 10, AP, None, 10, "Họp bộ môn"),
    ("A1-101", "student@roombook.test", 4, 8, 10, P, None, 20, "Ôn thi nhóm"),
    ("A2-102", "injured@roombook.test", 5, 10, 12, P, None, 10, "Làm đồ án"),
    ("A2-101", "student@roombook.test", 5, 8, 10, P, None, 40, "Sinh hoạt CLB"),
    ("A2-202", "wheelchair@roombook.test", 6, 14, 16, P, None, 25, "Họp nhóm"),
    ("A2-201", "student@roombook.test", 7, 8, 10, RJ, "Phòng được dành cho lớp học chính thức", 60, "Sinh hoạt CLB"),
    ("A1-201", "student@roombook.test", 7, 14, 16, CX, "Người dùng hủy", 30, "Họp nhóm"),
    ("C1-201", "lecturer2@roombook.test", 8, 9, 11, AP, None, 35, "Thực hành lập trình"),
    ("A2-301", "lecturer@roombook.test", 9, 8, 10, P, None, 30, "Họp tổ"),
    # Đơn trong quá khứ, để báo cáo 30 ngày gần nhất có số liệu
    ("A2-101", "lecturer@roombook.test", -1, 8, 10, AP, None, 45, "Lớp Cơ sở dữ liệu"),
    ("A2-201", "lecturer2@roombook.test", -2, 8, 11, AP, None, 70, "Hội thảo khoa"),
    ("C1-101", "student@roombook.test", -3, 13, 15, AP, None, 30, "Thực hành nhóm"),
    ("B3-201", "lecturer@roombook.test", -4, 9, 10, AP, None, 10, "Họp bộ môn"),
    ("A1-101", "student@roombook.test", -5, 8, 10, RJ, "Phòng bận", 20, "Ôn thi nhóm"),
    ("A2-102", "injured@roombook.test", -6, 10, 12, AP, None, 10, "Làm đồ án"),
]


def main():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        for email, pw, name, role, faculty, needs in USERS:
            db.add(User(email=email, full_name=name, hashed_password=hash_password(pw),
                        role=role, faculty=faculty, special_needs=needs))
        for code, name, bld, floor, lift, cap, fac, pref, special, status in ROOMS:
            db.add(Room(code=code, name=name, building=bld, floor=floor, has_elevator=lift,
                        capacity=cap, facilities=fac, preferred_faculties=pref,
                        is_special=special, status=RoomStatus(status)))
        db.commit()

        users = {u.email: u for u in db.scalars(select(User))}
        rooms = {r.code: r for r in db.scalars(select(Room))}
        total = len(BOOKINGS)
        for i, (code, email, day, h1, h2, status, reason, people, purpose) in enumerate(BOOKINGS):
            start, end = at(day, h1), at(day, h2)
            created = NOW - timedelta(hours=total - i)
            expires = None
            if status == S.pending:
                expires = min(created + timedelta(hours=settings.PENDING_EXPIRE_HOURS), start)
            db.add(Booking(user_id=users[email].id, room_id=rooms[code].id,
                           start_time=start, end_time=end, attendee_count=people,
                           purpose=purpose, status=status, reject_reason=reason,
                           created_at=created, expires_at=expires))
        db.commit()

    print(f"Da nap: {len(USERS)} tai khoan, {len(ROOMS)} phong, {len(BOOKINGS)} don dat phong.")
    print("Tai khoan:")
    for email, pw, _name, role, _f, needs in USERS:
        print(f"  {role.value:9} {email:28} {pw:14} {needs or ''}")


if __name__ == "__main__":
    main()