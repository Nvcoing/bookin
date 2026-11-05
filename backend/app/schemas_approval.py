from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.enums import Role
from app.schemas_booking import BookingOut


class UserBrief(BaseModel):
    """Chỉ thông tin cần để duyệt đơn. Cố ý KHÔNG có special_needs."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    role: Role
    faculty: str | None


class AdminBookingOut(BookingOut):
    user: UserBrief


class RejectRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)

    model_config = ConfigDict(json_schema_extra={"example": {
        "reason": "Phòng được dành cho sự kiện của Khoa"
    }})

    @field_validator("reason")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Lý do không được để trống.")
        return v