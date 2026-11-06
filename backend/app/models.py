from datetime import datetime, timezone

from sqlalchemy import (
    JSON, Boolean, DateTime, Enum, ForeignKey, Index, Integer, String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.enums import BookingStatus, Role, RoomStatus


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(
        Enum(Role, native_enum=False), default=Role.student
    )
    faculty: Mapped[str | None] = mapped_column(String(100), nullable=True)
    special_needs: Mapped[list] = mapped_column(JSON, default=list)
    can_book_special_rooms: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="user")


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    building: Mapped[str] = mapped_column(String(100), index=True)
    floor: Mapped[int] = mapped_column(Integer)
    has_elevator: Mapped[bool] = mapped_column(Boolean, default=False)
    capacity: Mapped[int] = mapped_column(Integer)
    facilities: Mapped[list] = mapped_column(JSON, default=list)
    is_special: Mapped[bool] = mapped_column(Boolean, default=False)
    preferred_faculties: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[RoomStatus] = mapped_column(
        Enum(RoomStatus, native_enum=False), default=RoomStatus.active
    )

    bookings: Mapped[list["Booking"]] = relationship(back_populates="room")


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        Index("ix_bookings_room_time", "room_id", "start_time", "end_time"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"))
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attendee_count: Mapped[int] = mapped_column(Integer)
    purpose: Mapped[str] = mapped_column(String(500))
    required_facilities: Mapped[list] = mapped_column(JSON, default=list)
    temp_special_needs: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, native_enum=False), default=BookingStatus.pending
    )
    reject_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="bookings")
    room: Mapped["Room"] = relationship(back_populates="bookings")