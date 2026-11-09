from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.enums import Facility, Role, RoomStatus, SpecialNeed

T = TypeVar("T")


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=50)
    faculty: str | None = Field(default=None, max_length=100)
    special_needs: list[SpecialNeed] = []

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Họ và tên không được để trống.")
        return stripped

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Mật khẩu không được vượt quá 72 bytes.")
        return v

    model_config = ConfigDict(json_schema_extra={"example": {
        "email": "an.nguyen@school.edu.vn",
        "password": "Matkhau@123",
        "full_name": "Nguyễn Văn An",
        "code": "22010189",
        "faculty": "CNTT",
        "special_needs": ["leg_injury"],
    }})


class RegisterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    student_code: str | None = None
    role: Role


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    student_code: str | None = None
    role: Role
    faculty: str | None
    special_needs: list[SpecialNeed]
    can_book_special_rooms: bool
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    student_code: str | None = Field(default=None, max_length=50)
    faculty: str | None = Field(default=None, max_length=100)
    special_needs: list[SpecialNeed] | None = None
    can_book_special_rooms: bool | None = None
    role: Role | None = None
    is_active: bool | None = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Họ và tên không được để trống.")
            return stripped
        return v

class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int


class RoomCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=255)
    building: str = Field(min_length=1, max_length=100)
    floor: int = Field(ge=0, le=50)
    has_elevator: bool = False
    capacity: int = Field(ge=1, le=5000)
    facilities: list[Facility] = []
    is_special: bool = False
    preferred_faculties: list[str] = []
    status: RoomStatus = RoomStatus.active

    model_config = ConfigDict(json_schema_extra={"example": {
        "code": "A1-101",
        "name": "Phòng học 101",
        "building": "A1",
        "floor": 1,
        "has_elevator": False,
        "capacity": 40,
        "facilities": ["projector", "whiteboard"],
        "is_special": False,
        "preferred_faculties": ["CNTT"],
        "status": "active",
    }})


class RoomUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    building: str | None = Field(default=None, min_length=1, max_length=100)
    floor: int | None = Field(default=None, ge=0, le=50)
    has_elevator: bool | None = None
    capacity: int | None = Field(default=None, ge=1, le=5000)
    facilities: list[Facility] | None = None
    is_special: bool | None = None
    preferred_faculties: list[str] | None = None


class RoomStatusUpdate(BaseModel):
    status: RoomStatus


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    building: str
    floor: int
    has_elevator: bool
    capacity: int
    facilities: list[str]
    is_special: bool
    preferred_faculties: list[str]
    status: RoomStatus