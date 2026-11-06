from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.enums import BookingStatus, Role
from app.errors import AppError
from app.models import Booking, User
from app.schemas import Page
from app.schemas_booking import (
    BookingCreate, BookingOut, BookingRequest, RecommendationItem,
    RecommendationsOut, RoomBrief, ScoreBreakdown,
)
from app.services.booking_create import create_booking
from app.services.recommend import process_room_recommendations
from app.services.scoring import Criteria
from app.services.approval import expire_pending
from app.timeutil import ensure_utc, validate_time_range

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


def _criteria_from(data: BookingRequest) -> Criteria:
    start, end = ensure_utc(data.start_time), ensure_utc(data.end_time)
    validate_time_range(start, end)
    return Criteria(
        start=start,
        end=end,
        attendee_count=data.attendee_count,
        required_facilities={f.value for f in data.required_facilities},
        temp_needs={n.value for n in data.temp_special_needs},
    )


def _get_booking_or_404(db: Session, booking_id: int) -> Booking:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise AppError(404, "NOT_FOUND", "Không tìm thấy đơn đặt phòng.")
    return booking


@router.post("/recommendations", response_model=RecommendationsOut)
def recommendations(data: BookingRequest,
                    db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    criteria = _criteria_from(data)
    results = process_room_recommendations(db, user, criteria, top_n=3)

    items = [
        RecommendationItem(
            room=RoomBrief.model_validate(r["room"]),
            score=r["score"],
            score_breakdown=ScoreBreakdown(
                health=r["breakdown"]["health"],
                facilities=r["breakdown"]["facilities"],
                capacity=r["breakdown"]["capacity"],
                location=r["breakdown"]["location"],
            ),
        )
        for r in results
    ]
    message = None if items else "Không có phòng nào phù hợp với yêu cầu trong khung giờ này."
    return RecommendationsOut(recommendations=items, message=message)


@router.post("", response_model=BookingOut, status_code=201)
def create(data: BookingCreate,
           db: Session = Depends(get_db),
           user: User = Depends(get_current_user)):
    criteria = _criteria_from(data)
    return create_booking(db, user, data.room_id, criteria, data.purpose.strip())


# Lưu ý: "/me" phải khai báo TRƯỚC "/{booking_id}"
@router.get("/me", response_model=Page[BookingOut])
def my_bookings(status: BookingStatus | None = None,
                page: int = Query(1, ge=1),
                size: int = Query(20, ge=1, le=100),
                db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    expire_pending(db)
    base = select(Booking).where(Booking.user_id == user.id)
    
    base = select(Booking).where(Booking.user_id == user.id)
    if status:
        base = base.where(Booking.status == status)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(
        base.order_by(Booking.created_at.desc(), Booking.id.desc())
        .offset((page - 1) * size).limit(size)
    ).all()
    return Page[BookingOut](
        items=[BookingOut.model_validate(b) for b in rows],
        total=total, page=page, size=size,
    )


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int,
                db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    booking = _get_booking_or_404(db, booking_id)
    if booking.user_id != user.id and user.role != Role.admin:
        raise AppError(403, "FORBIDDEN", "Bạn không có quyền xem đơn này.")
    return booking


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int,
                   db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    booking = _get_booking_or_404(db, booking_id)
    if booking.user_id != user.id and user.role != Role.admin:
        raise AppError(403, "FORBIDDEN", "Bạn không có quyền hủy đơn này.")
    if booking.status not in (BookingStatus.pending, BookingStatus.approved):
        raise AppError(409, "BOOKING_NOT_CANCELLABLE",
                       "Đơn này không thể hủy ở trạng thái hiện tại.")
    if ensure_utc(booking.start_time) <= datetime.now(timezone.utc):
        raise AppError(409, "BOOKING_NOT_CANCELLABLE",
                       "Đơn đã đến giờ bắt đầu nên không thể hủy.")

    booking.status = BookingStatus.cancelled
    db.commit()
    db.refresh(booking)
    return booking