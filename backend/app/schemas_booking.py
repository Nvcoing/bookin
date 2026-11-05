from datetime import datetime

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

from app.enums import BookingStatus, Facility, SpecialNeed
from app.timeutil import ensure_utc


class BookingRequest(BaseModel):
    start_time: AwareDatetime
    end_time: AwareDatetime
    attendee_count: int = Field(ge=1, le=5000)
    purpose: str = Field(min_length=1, max_length=500)
    required_facilities: list[Facility] = []
    temp_special_needs: list[SpecialNeed] = []

    model_config = ConfigDict(json_schema_extra={"example": {
        "start_time": "2026-11-10T08:00:00+07:00",
        "end_time": "2026-11-10T10:00:00+07:00",
        "attendee_count": 30,
        "purpose": "Họp nhóm đồ án",
        "required_facilities": ["projector"],
        "temp_special_needs": [],
    }})


class BookingCreate(BookingRequest):
    room_id: int

    model_config = ConfigDict(json_schema_extra={"example": {
        "room_id": 2,
        "start_time": "2026-11-10T08:00:00+07:00",
        "end_time": "2026-11-10T10:00:00+07:00",
        "attendee_count": 30,
        "purpose": "Họp nhóm đồ án",
        "required_facilities": ["projector"],
        "temp_special_needs": [],
    }})


class RoomBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    building: str
    floor: int
    capacity: int


class ScoreBreakdown(BaseModel):
    health: int
    facilities: int
    capacity: int
    location: int


class RecommendationItem(BaseModel):
    room: RoomBrief
    score: int
    score_breakdown: ScoreBreakdown


class RecommendationsOut(BaseModel):
    recommendations: list[RecommendationItem]
    message: str | None = None


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    room: RoomBrief
    start_time: datetime
    end_time: datetime
    attendee_count: int
    purpose: str
    required_facilities: list[str]
    status: BookingStatus
    reject_reason: str | None
    created_at: datetime

    # SQLite trả về giờ không có múi giờ, ép về UTC để JSON luôn có offset
    @field_validator("start_time", "end_time", "created_at")
    @classmethod
    def _to_utc(cls, v: datetime) -> datetime:
        return ensure_utc(v)