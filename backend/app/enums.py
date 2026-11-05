from enum import Enum


class Role(str, Enum):
    student = "student"
    lecturer = "lecturer"
    admin = "admin"


class BookingStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class RoomStatus(str, Enum):
    active = "active"
    maintenance = "maintenance"


class SpecialNeed(str, Enum):
    leg_injury = "leg_injury"
    wheelchair = "wheelchair"


class Facility(str, Enum):
    projector = "projector"
    microphone = "microphone"
    whiteboard = "whiteboard"
    air_conditioner = "air_conditioner"
    computer = "computer"
    video_conference = "video_conference"


# Nhóm nhu cầu đặc biệt bắt buộc phòng tầng <= 2 và có thang máy
MOBILITY_NEEDS = {SpecialNeed.leg_injury, SpecialNeed.wheelchair}