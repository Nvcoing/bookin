from datetime import datetime, timedelta, timezone

from app.errors import AppError

VN_TZ = timezone(timedelta(hours=7))
MAX_HOURS = 12
MAX_ADVANCE_DAYS = 180  # tối đa 6 tháng
OPEN_HOUR = 7
CLOSE_HOUR = 21


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
    # BUG-025: Giới hạn đặt trước tối đa 180 ngày (6 tháng)
    if start - now > timedelta(days=MAX_ADVANCE_DAYS):
        raise AppError(400, "ADVANCE_LIMIT_EXCEEDED", f"Chỉ được đặt phòng trước tối đa {MAX_ADVANCE_DAYS} ngày.")

    # BUG-008: Kiểm tra khung giờ hoạt động 07:00 – 21:00 (giờ Việt Nam)
    start_vn = start.astimezone(VN_TZ)
    end_vn = end.astimezone(VN_TZ)
    if start_vn.date() != end_vn.date():
        raise AppError(400, "INVALID_TIME_RANGE", "Đơn đặt phòng phải trong cùng một ngày.")
    if start_vn.hour < OPEN_HOUR or (end_vn.hour > CLOSE_HOUR or (end_vn.hour == CLOSE_HOUR and (end_vn.minute > 0 or end_vn.second > 0))):
        raise AppError(400, "OUTSIDE_OPERATING_HOURS", f"Thời gian đặt phòng phải trong khung giờ hoạt động {OPEN_HOUR:02d}:00 – {CLOSE_HOUR:02d}:00.")
