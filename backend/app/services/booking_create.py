import threading
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.enums import BookingStatus
from app.errors import AppError
from app.models import Booking, Room
from app.services.booking import find_busy_room_ids, find_user_overlapping_booking
from app.services.needs import get_effective_needs
from app.services.recommend import process_room_recommendations
from app.services.scoring import Criteria, calculate_room_score, check_hard_filters

# Khóa trong tiến trình: đủ an toàn cho SQLite khi dev (1 worker).
# Với PostgreSQL, SELECT ... FOR UPDATE bên dưới khóa được giữa nhiều tiến trình.
_create_lock = threading.Lock()

SLOT_STEP = timedelta(minutes=30)
MAX_SLOT_SHIFTS = 16        # tìm giờ trống trong khoảng ±8 giờ
MAX_SUGGESTIONS = 3


def _suggestion(room: Room, start: datetime, end: datetime, score: int) -> dict:
    return {
        "room": {
            "id": room.id, "code": room.code, "name": room.name,
            "building": room.building, "floor": room.floor,
            "has_elevator": room.has_elevator,
            "facilities": room.facilities or [],
        },
        "start_time": start.astimezone(timezone.utc).isoformat(),
        "end_time": end.astimezone(timezone.utc).isoformat(),
        "score": score,
    }


def build_suggestions(db: Session, user, room: Room, criteria: Criteria) -> list[dict]:
    """Tối đa 3 gợi ý: phòng khác cùng giờ, rồi cùng phòng ở giờ trống gần nhất."""
    suggestions = []

    for r in process_room_recommendations(db, user, criteria, top_n=2):
        suggestions.append(_suggestion(r["room"], criteria.start, criteria.end, r["score"]))

    needs = get_effective_needs(user, criteria.temp_needs)
    score = calculate_room_score(room, criteria, user, needs)["total"]
    duration = criteria.end - criteria.start
    now = datetime.now(timezone.utc)

    for sign in (1, -1):  # 1 = muộn hơn, -1 = sớm hơn
        if len(suggestions) >= MAX_SUGGESTIONS:
            break
        for k in range(1, MAX_SLOT_SHIFTS + 1):
            start = criteria.start + sign * k * SLOT_STEP
            end = start + duration
            if start < now:
                continue
            if room.id not in find_busy_room_ids(db, start, end):
                suggestions.append(_suggestion(room, start, end, score))
                break
    return suggestions


def create_booking(db: Session, user, room_id: int, criteria: Criteria,
                   purpose: str) -> Booking:
    room = db.get(Room, room_id)
    if room is None:
        raise AppError(404, "NOT_FOUND", "Không tìm thấy phòng.")

    needs = get_effective_needs(user, criteria.temp_needs)
    reasons = check_hard_filters(room, criteria, user, needs)
    if "SPECIAL_ROOM_NOT_ALLOWED" in reasons:
        raise AppError(403, "SPECIAL_ROOM_NOT_ALLOWED",
                       "Bạn chưa được cấp quyền đặt phòng đặc biệt này.")
    if reasons:
        raise AppError(400, "ROOM_NOT_SUITABLE",
                       "Phòng không phù hợp với yêu cầu của bạn.",
                       {"reasons": reasons})

    # Vùng găng: kiểm tra trùng lịch và ghi đơn phải xảy ra liền mạch
    with _create_lock:
        db.execute(select(Room.id).where(Room.id == room.id).with_for_update())

        now = datetime.now(timezone.utc)
        self_booking = find_user_overlapping_booking(db, user.id, criteria.start, criteria.end, now)
        if self_booking:
            db.rollback()
            status_text = "đang chờ duyệt" if self_booking.status == BookingStatus.pending else "đã được duyệt"
            raise AppError(
                409, "USER_ALREADY_BOOKED",
                f"Bạn đã có đơn đặt phòng này trong khung giờ đã chọn ({status_text}). Vui lòng kiểm tra mục Đơn đặt phòng."
            )

        if room.id in find_busy_room_ids(db, criteria.start, criteria.end, now):
            suggestions = build_suggestions(db, user, room, criteria)
            db.rollback()
            raise AppError(409, "ROOM_CONFLICT",
                           "Phòng đã có người đặt trong khung giờ này.",
                           {"suggestions": suggestions})

        now = datetime.now(timezone.utc)
        expires_at = min(now + timedelta(hours=settings.PENDING_EXPIRE_HOURS),
                         criteria.start)
        booking = Booking(
            user_id=user.id,
            room_id=room.id,
            start_time=criteria.start,
            end_time=criteria.end,
            attendee_count=criteria.attendee_count,
            purpose=purpose,
            required_facilities=sorted(criteria.required_facilities),
            temp_special_needs=sorted(criteria.temp_needs),
            status=BookingStatus.pending,
            expires_at=expires_at,
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)
        return booking