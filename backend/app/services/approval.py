from datetime import datetime, timezone

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.enums import BookingStatus, Role
from app.models import Booking, User


def expire_pending(db: Session, now: datetime | None = None) -> int:
    """Đơn chờ duyệt quá hạn thì tự hủy để không chiếm chỗ ảo."""
    now = now or datetime.now(timezone.utc)
    rows = db.scalars(
        select(Booking).where(
            Booking.status == BookingStatus.pending,
            Booking.expires_at.is_not(None),
            Booking.expires_at <= now,
        )
    ).all()
    for b in rows:
        b.status = BookingStatus.cancelled
        b.reject_reason = "Đơn hết hạn chờ duyệt."
    if rows:
        db.commit()
    return len(rows)


def cancel_future_bookings_for_room(db: Session, room_id: int, reason: str,
                                    now: datetime | None = None) -> int:
    """Hủy các đơn pending/approved chưa bắt đầu của phòng. Người gọi tự commit."""
    now = now or datetime.now(timezone.utc)
    rows = db.scalars(
        select(Booking).where(
            Booking.room_id == room_id,
            Booking.status.in_([BookingStatus.pending, BookingStatus.approved]),
            Booking.start_time > now,
        )
    ).all()
    for b in rows:
        b.status = BookingStatus.cancelled
        b.reject_reason = reason
    return len(rows)


def list_admin_bookings(db: Session, status: BookingStatus | None, page: int, size: int):
    """Danh sách đơn cho Admin: Hỗ trợ lọc theo trạng thái và xem toàn bộ lịch sử."""
    base = select(Booking).join(User, Booking.user_id == User.id)
    if status is not None:
        base = base.where(Booking.status == status)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0

    if status == BookingStatus.pending:
        priority = case((User.role == Role.lecturer, 0), else_=1)
        stmt = base.order_by(priority, Booking.created_at.asc(), Booking.id.asc())
    else:
        stmt = base.order_by(Booking.created_at.desc(), Booking.id.desc())

    rows = db.scalars(stmt.offset((page - 1) * size).limit(size)).all()
    return rows, total


def list_pending(db: Session, page: int, size: int):
    """Hàng đợi duyệt: Giảng viên trước, cùng nhóm thì đơn cũ hơn trước."""
    return list_admin_bookings(db, BookingStatus.pending, page, size)
