from datetime import datetime, timedelta, timezone
from types import SimpleNamespace as NS

from app.enums import Role, RoomStatus
from app.services.needs import get_effective_needs
from app.services.scoring import Criteria, calculate_room_score, check_hard_filters


def make_room(**kw):
    data = dict(id=1, code="A1-101", floor=1, has_elevator=True, capacity=40,
                facilities=["projector", "whiteboard"], is_special=False,
                preferred_faculties=["CNTT"], status=RoomStatus.active)
    data.update(kw)
    return NS(**data)


def make_user(**kw):
    data = dict(role=Role.student, faculty="CNTT", special_needs=[],
                can_book_special_rooms=False)
    data.update(kw)
    return NS(**data)


def make_criteria(**kw):
    start = datetime.now(timezone.utc) + timedelta(days=1)
    data = dict(start=start, end=start + timedelta(hours=2), attendee_count=30,
                required_facilities=set(), temp_needs=set())
    data.update(kw)
    return Criteria(**data)


def test_effective_needs_union():
    user = make_user(special_needs=["leg_injury"])
    assert get_effective_needs(user, ["wheelchair"]) == {"leg_injury", "wheelchair"}


def test_wheelchair_rejected_on_floor_3():
    room = make_room(floor=3)
    reasons = check_hard_filters(room, make_criteria(), make_user(), {"wheelchair"})
    assert "ACCESSIBILITY_REQUIRED" in reasons


def test_wheelchair_rejected_without_elevator():
    room = make_room(floor=1, has_elevator=False)
    reasons = check_hard_filters(room, make_criteria(), make_user(), {"wheelchair"})
    assert "ACCESSIBILITY_REQUIRED" in reasons


def test_floor_0_with_elevator_health_score():
    crit = make_criteria()
    user = make_user()
    floor0 = calculate_room_score(make_room(floor=0, has_elevator=True), crit, user, {"wheelchair"})
    assert floor0["health"] == 40


def test_wheelchair_ok_on_floor_1_with_elevator():
    room = make_room(floor=1, has_elevator=True)
    assert check_hard_filters(room, make_criteria(), make_user(), {"wheelchair"}) == []


def test_capacity_too_small():
    reasons = check_hard_filters(make_room(capacity=20), make_criteria(), make_user(), set())
    assert "CAPACITY_TOO_SMALL" in reasons


def test_maintenance_and_booked_rejected():
    room = make_room(status=RoomStatus.maintenance)
    reasons = check_hard_filters(room, make_criteria(), make_user(), set(), is_booked=True)
    assert "ROOM_UNAVAILABLE" in reasons and "ROOM_BOOKED" in reasons


def test_special_room_blocked_for_student_but_not_lecturer():
    room = make_room(is_special=True)
    assert "SPECIAL_ROOM_NOT_ALLOWED" in check_hard_filters(room, make_criteria(), make_user(), set())
    lecturer = make_user(role=Role.lecturer)
    assert check_hard_filters(room, make_criteria(), lecturer, set()) == []
    granted = make_user(can_book_special_rooms=True)
    assert check_hard_filters(room, make_criteria(), granted, set()) == []


def test_perfect_score_is_100():
    crit = make_criteria(attendee_count=30, required_facilities={"projector"})
    score = calculate_room_score(make_room(), crit, make_user(), set())
    assert score["total"] == 100


def test_partial_facilities_score():
    crit = make_criteria(required_facilities={"projector", "microphone"})
    score = calculate_room_score(make_room(), crit, make_user(), set())
    assert score["facilities"] == 15


def test_low_fill_ratio_reduces_capacity_score():
    crit = make_criteria(attendee_count=6)
    score = calculate_room_score(make_room(capacity=40), crit, make_user(), set())
    assert score["capacity"] == 5


def test_health_score_by_floor():
    crit = make_criteria()
    user = make_user()
    floor1 = calculate_room_score(make_room(floor=1), crit, user, {"leg_injury"})
    floor2 = calculate_room_score(make_room(floor=2), crit, user, {"leg_injury"})
    assert floor1["health"] == 40 and floor2["health"] == 20


def test_location_score_zero_for_other_faculty():
    score = calculate_room_score(make_room(), make_criteria(), make_user(faculty="Điện tử"), set())
    assert score["location"] == 0