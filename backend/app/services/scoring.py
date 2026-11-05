from dataclasses import dataclass, field
from datetime import datetime

from app.enums import MOBILITY_NEEDS

MOBILITY = {n.value for n in MOBILITY_NEEDS}

# Trọng số, đổi ở đây là cả hệ thống đổi theo
W_HEALTH, W_FACILITIES, W_CAPACITY, W_LOCATION = 40, 30, 20, 10
IDEAL_MIN, IDEAL_MAX = 0.6, 0.9


@dataclass
class Criteria:
    start: datetime
    end: datetime
    attendee_count: int
    required_facilities: set[str] = field(default_factory=set)
    temp_needs: set[str] = field(default_factory=set)


def _v(x):
    return x.value if hasattr(x, "value") else x


def check_hard_filters(room, criteria: Criteria, user, needs: set[str],
                       is_booked: bool = False) -> list[str]:
    """Trả về danh sách mã lý do bị loại. Rỗng nghĩa là phòng hợp lệ."""
    reasons = []
    if _v(room.status) != "active":
        reasons.append("ROOM_UNAVAILABLE")
    if is_booked:
        reasons.append("ROOM_BOOKED")
    if room.capacity < criteria.attendee_count:
        reasons.append("CAPACITY_TOO_SMALL")
    if (needs & MOBILITY) and not (room.floor <= 2 and room.has_elevator):
        reasons.append("ACCESSIBILITY_REQUIRED")
    can_special = _v(user.role) in ("lecturer", "admin") or user.can_book_special_rooms
    if room.is_special and not can_special:
        reasons.append("SPECIAL_ROOM_NOT_ALLOWED")
    return reasons


def _health_score(room, needs: set[str]) -> int:
    if not (needs & MOBILITY):
        return W_HEALTH  # không có nhu cầu đặc biệt: điểm mặc định
    if room.floor == 1:
        return W_HEALTH
    if room.floor == 2 and room.has_elevator:
        return W_HEALTH // 2
    return 0


def _facilities_score(room, required: set[str]) -> int:
    if not required:
        return W_FACILITIES
    have = set(room.facilities or [])
    return round(W_FACILITIES * len(required & have) / len(required))


def _capacity_score(room, attendee_count: int) -> int:
    ratio = attendee_count / room.capacity
    if ratio < IDEAL_MIN:
        score = W_CAPACITY * ratio / IDEAL_MIN
    elif ratio <= IDEAL_MAX:
        score = W_CAPACITY
    else:
        score = W_CAPACITY - (min(ratio, 1.0) - IDEAL_MAX) / (1 - IDEAL_MAX) * (W_CAPACITY / 2)
    return round(score)


def _location_score(room, user) -> int:
    return W_LOCATION if user.faculty and user.faculty in (room.preferred_faculties or []) else 0


def calculate_room_score(room, criteria: Criteria, user, needs: set[str]) -> dict:
    parts = {
        "health": _health_score(room, needs),
        "facilities": _facilities_score(room, criteria.required_facilities),
        "capacity": _capacity_score(room, criteria.attendee_count),
        "location": _location_score(room, user),
    }
    parts["total"] = sum(parts.values())
    return parts