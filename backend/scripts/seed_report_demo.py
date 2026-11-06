import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select

from app import models  # noqa: F401
from app.database import Base, SessionLocal, engine
from app.enums import BookingStatus as S
from app.models import Booking, Room, User

VN = timezone(timedelta(hours=7))


def utc(day, hour):
    return datetime(2026, 11, day, hour, tzinfo=VN).astimezone(timezone.utc)


# (phòng, email, ngày tháng 11, giờ bắt đầu, giờ kết thúc, trạng thái, lý do)
DATA = [
    ("A1-101", "test1@school.edu.vn",     9,  8, 10, S.approved,  None),  # Thứ Hai
    ("A1-101", "lecturer@roombook.test",  9, 14, 16, S.approved,  None),  # Thứ Hai
    ("A1-201", "lecturer@roombook.test", 10,  8, 11, S.approved,  None),  # Thứ Ba
    ("A1-201", "test1@school.edu.vn",    11,  9, 10, S.approved,  None),  # Thứ Tư
    ("B3-301", "lecturer@roombook.test", 12,  8,  9, S.approved,  None),  # Thứ Năm
    ("A1-101", "test1@school.edu.vn",    13, 10, 12, S.pending,   None),  # Thứ Sáu
    ("A1-201", "test1@school.edu.vn",    14,  8, 10, S.rejected,  "Phòng bận sự kiện"),
    ("A1-101", "test1@school.edu.vn",    15,  8, 10, S.cancelled, "Người dùng hủy"),
]


def main():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        db.execute(delete(Booking))  # xóa MỌI đơn cũ để số liệu khớp bảng kiểm tra
        for code, email, day, h1, h2, status, reason in DATA:
            room = db.scalar(select(Room).where(Room.code == code))
            user = db.scalar(select(User).where(User.email == email))
            if room is None or user is None:
                raise SystemExit("Thiếu dữ liệu nền. Hãy chạy scripts\\reset_demo.py trước.")
            db.add(Booking(user_id=user.id, room_id=room.id,
                           start_time=utc(day, h1), end_time=utc(day, h2),
                           attendee_count=10, purpose="Dữ liệu thử báo cáo",
                           status=status, reject_reason=reason))
        db.commit()
    print(f"Da tao {len(DATA)} don mau (tuan 09-15/11/2026).")


if __name__ == "__main__":
    main()