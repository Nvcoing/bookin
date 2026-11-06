import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import models  # noqa: F401
from app.database import Base, SessionLocal, engine
from app.enums import Role
from app.models import Room, User
from app.security import hash_password

USERS = [
    ("admin@vnu.edu.vn", "Admin@123", "Quản trị viên Hệ thống", Role.admin, "Phòng Đào tạo", []),
    ("lecturer@vnu.edu.vn", "Lecturer@123", "Giảng viên VNU-IS", Role.lecturer, "CNTT", []),
    ("test1@vnu.edu.vn", "Matkhau@123", "Nguyễn Văn Test", Role.student, "CNTT", ["leg_injury"]),
]

ROOMS = [
    dict(code="A1-101", name="Phòng học 101", building="A1", floor=1, has_elevator=False,
         capacity=40, facilities=["projector", "whiteboard"], is_special=False,
         preferred_faculties=["CNTT"]),
    dict(code="A1-201", name="Phòng học 201", building="A1", floor=2, has_elevator=True,
         capacity=60, facilities=["projector", "microphone"], is_special=False,
         preferred_faculties=[]),
    dict(code="B3-301", name="Phòng họp 301", building="B3", floor=3, has_elevator=True,
         capacity=20, facilities=["video_conference"], is_special=True,
         preferred_faculties=[]),
]


def main():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        for email, pw, name, role, faculty, needs in USERS:
            db.add(User(email=email, full_name=name, hashed_password=hash_password(pw),
                        role=role, faculty=faculty, special_needs=needs))
        for r in ROOMS:
            db.add(Room(**r))
        db.commit()
    print("Da reset: 3 tai khoan, 3 phong, 0 don dat phong.")


if __name__ == "__main__":
    main()