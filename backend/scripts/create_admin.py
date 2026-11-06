import sys
from pathlib import Path

# Cho phép chạy trực tiếp từ thư mục gốc
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app import models  # noqa: F401
from app.database import Base, SessionLocal, engine
from app.enums import Role
from app.models import User
from app.security import hash_password

ACCOUNTS = [
    ("admin@roombook.test", "Admin@123", "Quan tri vien", Role.admin, "Phong Dao tao"),
    ("lecturer@roombook.test", "Lecturer@123", "Giang vien Mau", Role.lecturer, "CNTT"),
]


def main():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        for email, password, name, role, faculty in ACCOUNTS:
            user = db.scalar(select(User).where(User.email == email))
            if user:
                user.role = role
                user.hashed_password = hash_password(password)
                print("Updated:", email)
            else:
                db.add(User(
                    email=email,
                    full_name=name,
                    hashed_password=hash_password(password),
                    role=role,
                    faculty=faculty,
                    special_needs=[],
                ))
                print("Created:", email)
        db.commit()


if __name__ == "__main__":
    main()