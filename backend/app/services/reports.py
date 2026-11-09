from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.enums import BookingStatus
from app.errors import AppError
from app.models import Booking, Room
from app.timeutil import ensure_utc

VN_TZ = timezone(timedelta(hours=7))
OPEN_HOUR, CLOSE_HOUR = 7, 21          # khung giờ phòng hoạt động
MAX_RANGE_DAYS = 366
COUNTED_FOR_PEAK = (BookingStatus.approved, BookingStatus.pending)


def resolve_range(date_from: date | None, date_to: date | None):
    """Trả (date_from, date_to, start_utc, end_utc). end_utc là mốc loại trừ."""
    if date_from and not date_to:
        date_to = date_from + timedelta(days=29)
    elif date_to and not date_from:
        date_from = date_to - timedelta(days=29)
    else:
        date_to = date_to or datetime.now(VN_TZ).date()
        date_from = date_from or (date_to - timedelta(days=29))

    if date_to < date_from:
        raise AppError(400, "INVALID_DATE_RANGE", "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")
    if (date_to - date_from).days + 1 > MAX_RANGE_DAYS:
        raise AppError(400, "INVALID_DATE_RANGE", f"Khoảng thời gian tối đa {MAX_RANGE_DAYS} ngày.")
    start = datetime.combine(date_from, time.min, tzinfo=VN_TZ).astimezone(timezone.utc)
    end = datetime.combine(date_to + timedelta(days=1), time.min,
                           tzinfo=VN_TZ).astimezone(timezone.utc)
    return date_from, date_to, start, end


def summary(db: Session, start: datetime | None = None, end: datetime | None = None) -> dict:
    stmt = select(Booking.status, func.count()).group_by(Booking.status)
    if start is not None and end is not None:
        stmt = stmt.where(Booking.start_time >= start, Booking.start_time < end)
    rows = db.execute(stmt).all()
    by_status = {s.value: 0 for s in BookingStatus}
    for status, n in rows:
        by_status[getattr(status, "value", status)] = n
    return {"total": sum(by_status.values()), "by_status": by_status}


def _overlap_hours(s: datetime, e: datetime, open_: datetime, close_: datetime) -> float:
    lo, hi = max(s, open_), min(e, close_)
    return max((hi - lo).total_seconds() / 3600, 0.0)


def occupancy(db: Session, date_from: date, date_to: date,
              start: datetime, end: datetime) -> dict:
    days = (date_to - date_from).days + 1
    available = float(days * (CLOSE_HOUR - OPEN_HOUR))

    booked: dict[int, float] = defaultdict(float)
    rows = db.execute(
        select(Booking.room_id, Booking.start_time, Booking.end_time).where(
            Booking.status == BookingStatus.approved,
            Booking.start_time < end,
            Booking.end_time > start,
        )
    ).all()
    for room_id, s, e in rows:
        s = ensure_utc(s).astimezone(VN_TZ)
        e = ensure_utc(e).astimezone(VN_TZ)
        day = max(s.date(), date_from)
        last = min(e.date(), date_to)
        while day <= last:  # chỉ tính phần nằm trong khung giờ hoạt động từng ngày
            open_ = datetime.combine(day, time(OPEN_HOUR), tzinfo=VN_TZ)
            close_ = datetime.combine(day, time(CLOSE_HOUR), tzinfo=VN_TZ)
            booked[room_id] += _overlap_hours(s, e, open_, close_)
            day += timedelta(days=1)

    rooms = db.scalars(select(Room).order_by(Room.building, Room.code)).all()
    items = []
    for r in rooms:
        hours = booked.get(r.id, 0.0)
        items.append({
            "room_id": r.id, "code": r.code, "name": r.name, "building": r.building,
            "booked_hours": round(hours, 2),
            "available_hours": available,
            "occupancy_rate": round(min(hours / available, 1.0), 4),
        })
    total_booked = sum(i["booked_hours"] for i in items)
    overall = total_booked / (available * len(items)) if items else 0.0
    return {"overall_occupancy_rate": round(min(overall, 1.0), 4), "items": items}


def peak_hours(db: Session, start: datetime, end: datetime) -> dict:
    by_hour, by_weekday = Counter(), Counter()
    rows = db.execute(
        select(Booking.start_time).where(
            Booking.status.in_(COUNTED_FOR_PEAK),
            Booking.start_time >= start,
            Booking.start_time < end,
        )
    ).all()
    for (s,) in rows:
        local = ensure_utc(s).astimezone(VN_TZ)
        by_hour[local.hour] += 1
        by_weekday[local.isoweekday()] += 1   # 1 = Thứ Hai ... 7 = Chủ Nhật
    return {
        "by_hour": [{"hour": h, "count": by_hour[h]} for h in range(24)],
        "by_weekday": [{"weekday": d, "count": by_weekday[d]} for d in range(1, 8)],
    }