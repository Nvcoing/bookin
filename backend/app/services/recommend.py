from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Room
from app.services.booking import find_busy_room_ids
from app.services.needs import get_effective_needs
from app.services.scoring import Criteria, calculate_room_score, check_hard_filters


def process_room_recommendations(db: Session, user, criteria: Criteria,
                                 top_n: int | None = 3) -> list[dict]:
    needs = get_effective_needs(user, criteria.temp_needs)
    busy = find_busy_room_ids(db, criteria.start, criteria.end)

    ranked = []
    for room in db.scalars(select(Room)).all():
        if check_hard_filters(room, criteria, user, needs, room.id in busy):
            continue
        parts = calculate_room_score(room, criteria, user, needs)
        ranked.append({"room": room, "score": parts["total"], "breakdown": parts})

    # Điểm cao trước; bằng điểm thì ưu tiên phòng nhỏ hơn, rồi theo mã phòng
    ranked.sort(key=lambda r: (-r["score"], r["room"].capacity, r["room"].code))
    return ranked[:top_n] if top_n else ranked