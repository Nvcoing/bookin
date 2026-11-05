from datetime import datetime, timezone

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.enums import BookingStatus
from app.models import Booking


def _blocking_clause(now: datetime):
    """Đơn chặn phòng: approved, hoặc pending chưa hết hạn."""
    return or_(
        Booking.status == BookingStatus.approved,
        and_(
            Booking.status == BookingStatus.pending,
            or_(Booking.expires_at.is_(None), Booking.expires_at > now),
        ),
    )


def find_busy_room_ids(db: Session, start: datetime, end: datetime,
                       now: datetime | None = None) -> set[int]:
    """Hai khoảng giờ trùng nhau khi: new.start < old.end AND new.end > old.start."""
    now = now or datetime.now(timezone.utc)
    stmt = (
        select(Booking.room_id)
        .where(Booking.start_time < end, Booking.end_time > start, _blocking_clause(now))
        .distinct()
    )
    return set(db.scalars(stmt).all())