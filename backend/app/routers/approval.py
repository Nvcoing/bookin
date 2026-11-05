from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.enums import BookingStatus, Role, RoomStatus
from app.errors import AppError
from app.models import Booking, Room, User
from app.schemas import Page
from app.schemas_approval import AdminBookingOut, RejectRequest
from app.services.approval import expire_pending, list_pending
from app.services.booking_create import _create_lock

router = APIRouter(prefix="/api/bookings", tags=["Approval"])


def _get_pending_or_error(db: Session, booking_id: int) -> Booking:
    expire_pending(db)
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise AppError(404, "NOT_FOUND", "Không tìm thấy đơn đặt phòng.")
    if booking.status != BookingStatus.pending:
        raise AppError(409, "BOOKING_NOT_PENDING",
                       "Đơn không còn ở trạng thái chờ duyệt.")
    return booking


@router.get("/pending", response_model=Page[AdminBookingOut])
def pending_queue(page: int = Query(1, ge=1),
                  size: int = Query(20, ge=1, le=100),
                  db: Session = Depends(get_db),
                  _admin: User = Depends(require_role(Role.admin))):
    expire_pending(db)
    rows, total = list_pending(db, page, size)
    return Page[AdminBookingOut](
        items=[AdminBookingOut.model_validate(b) for b in rows],
        total=total, page=page, size=size,
    )


@router.post("/{booking_id}/approve", response_model=AdminBookingOut)
def approve(booking_id: int,
            db: Session = Depends(get_db),
            _admin: User = Depends(require_role(Role.admin))):
    with _create_lock:  # tránh duyệt hai đơn chồng nhau cùng lúc
        booking = _get_pending_or_error(db, booking_id)

        room = db.get(Room, booking.room_id)
        if room is None or room.status != RoomStatus.active:
            raise AppError(409, "ROOM_UNAVAILABLE", "Phòng hiện không khả dụng.")

        overlap = db.scalar(
            select(Booking.id).where(
                Booking.room_id == booking.room_id,
                Booking.id != booking.id,
                Booking.status == BookingStatus.approved,
                Booking.start_time < booking.end_time,
                Booking.end_time > booking.start_time,
            )
        )
        if overlap:
            raise AppError(409, "ROOM_CONFLICT",
                           "Phòng đã có đơn khác được duyệt trong khung giờ này.")

        booking.status = BookingStatus.approved
        db.commit()
        db.refresh(booking)
        return booking


@router.post("/{booking_id}/reject", response_model=AdminBookingOut)
def reject(booking_id: int, data: RejectRequest,
           db: Session = Depends(get_db),
           _admin: User = Depends(require_role(Role.admin))):
    with _create_lock:
        booking = _get_pending_or_error(db, booking_id)
        booking.status = BookingStatus.rejected
        booking.reject_reason = data.reason
        db.commit()
        db.refresh(booking)
        return booking