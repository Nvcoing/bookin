from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.enums import Facility, Role, RoomStatus
from app.errors import AppError
from app.models import Room, User
from app.schemas import Page, RoomCreate, RoomOut, RoomStatusUpdate, RoomUpdate

from app.services.approval import cancel_future_bookings_for_room

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])


def _get_room_or_404(db: Session, room_id: int) -> Room:
    room = db.get(Room, room_id)
    if room is None:
        raise AppError(404, "NOT_FOUND", "Không tìm thấy phòng.")
    return room


def _code_taken(db: Session, code: str, exclude_id: int | None = None) -> bool:
    stmt = select(Room).where(Room.code == code)
    if exclude_id is not None:
        stmt = stmt.where(Room.id != exclude_id)
    return db.scalar(stmt) is not None


@router.get("", response_model=Page[RoomOut])
def list_rooms(
    building: str | None = None,
    floor_max: int | None = None,
    min_capacity: int | None = None,
    facilities: list[Facility] | None = Query(default=None),
    status: RoomStatus | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    stmt = select(Room).order_by(Room.building, Room.floor, Room.code)
    if building:
        stmt = stmt.where(Room.building == building)
    if floor_max is not None:
        stmt = stmt.where(Room.floor <= floor_max)
    if min_capacity is not None:
        stmt = stmt.where(Room.capacity >= min_capacity)
    if status:
        stmt = stmt.where(Room.status == status)

    rooms = list(db.scalars(stmt).all())

    # Thiết bị lưu dạng JSON nên lọc bằng Python (đủ nhanh với vài trăm phòng)
    if facilities:
        need = {f.value for f in facilities}
        rooms = [r for r in rooms if need.issubset(set(r.facilities or []))]

    total = len(rooms)
    start = (page - 1) * size
    items = [RoomOut.model_validate(r) for r in rooms[start:start + size]]
    return Page[RoomOut](items=items, total=total, page=page, size=size)


@router.get("/{room_id}", response_model=RoomOut)
def get_room(room_id: int, db: Session = Depends(get_db),
             _user: User = Depends(get_current_user)):
    return _get_room_or_404(db, room_id)


@router.post("", response_model=RoomOut, status_code=201)
def create_room(data: RoomCreate, db: Session = Depends(get_db),
                _admin: User = Depends(require_role(Role.admin))):
    code = data.code.strip()
    if _code_taken(db, code):
        raise AppError(409, "ROOM_CODE_EXISTS", "Mã phòng đã tồn tại.")

    room = Room(
        code=code,
        name=data.name.strip(),
        building=data.building.strip(),
        floor=data.floor,
        has_elevator=data.has_elevator,
        capacity=data.capacity,
        facilities=list(dict.fromkeys(f.value for f in data.facilities)),
        is_special=data.is_special,
        preferred_faculties=list(dict.fromkeys(data.preferred_faculties)),
        status=data.status,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.patch("/{room_id}", response_model=RoomOut)
def update_room(room_id: int, data: RoomUpdate, db: Session = Depends(get_db),
                _admin: User = Depends(require_role(Role.admin))):
    room = _get_room_or_404(db, room_id)
    changes = data.model_dump(exclude_unset=True, mode="json")

    if "code" in changes and changes["code"] is not None:
        changes["code"] = changes["code"].strip()
        if _code_taken(db, changes["code"], exclude_id=room.id):
            raise AppError(409, "ROOM_CODE_EXISTS", "Mã phòng đã tồn tại.")
    if changes.get("facilities") is not None:
        changes["facilities"] = list(dict.fromkeys(changes["facilities"]))
    if changes.get("preferred_faculties") is not None:
        changes["preferred_faculties"] = list(dict.fromkeys(changes["preferred_faculties"]))

    for field, value in changes.items():
        if value is not None:
            setattr(room, field, value)

    db.commit()
    db.refresh(room)
    return room


@router.patch("/{room_id}/status", response_model=RoomOut)
def update_room_status(room_id: int, data: RoomStatusUpdate,
                       db: Session = Depends(get_db),
                       _admin: User = Depends(require_role(Role.admin))):
    room = _get_room_or_404(db, room_id)
    if data.status == RoomStatus.maintenance and room.status != RoomStatus.maintenance:
        # Hủy các đơn tương lai của phòng, người dùng sẽ thấy lý do trong đơn
        cancel_future_bookings_for_room(db, room.id, "Phòng chuyển sang bảo trì.")
    room.status = data.status
    db.commit()
    db.refresh(room)
    return room