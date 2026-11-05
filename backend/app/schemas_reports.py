from pydantic import BaseModel


class SummaryOut(BaseModel):
    total: int
    by_status: dict[str, int]


class OccupancyItem(BaseModel):
    room_id: int
    code: str
    name: str
    building: str
    booked_hours: float
    available_hours: float
    occupancy_rate: float


class OccupancyOut(BaseModel):
    overall_occupancy_rate: float
    items: list[OccupancyItem]


class HourCount(BaseModel):
    hour: int
    count: int


class WeekdayCount(BaseModel):
    weekday: int
    count: int


class PeakHoursOut(BaseModel):
    by_hour: list[HourCount]
    by_weekday: list[WeekdayCount]