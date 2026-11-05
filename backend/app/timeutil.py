from datetime import datetime, timedelta, timezone

from app.errors import AppError

MAX_HOURS = 12


def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def validate_time_range(start: datetime, end: datetime, now: datetime | None = None) -> None:
    now = now or datetime.now(timezone.utc)
    if end <= start:
        raise AppError(400, "INVALID_TIME_RANGE", "Giờ kết thúc phải sau giờ bắt đầu.")
    if end - start > timedelta(hours=MAX_HOURS):
        raise AppError(400, "INVALID_TIME_RANGE", f"Mỗi đơn tối đa {MAX_HOURS} giờ.")
    if start < now:
        raise AppError(400, "PAST_TIME", "Không thể đặt phòng trong quá khứ.")