from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.enums import Role
from app.models import User
from app.schemas_reports import OccupancyOut, PeakHoursOut, SummaryOut
from app.services import reports as report_service
from app.services.approval import expire_pending

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def _date_range(
    date_from: date | None = Query(None, alias="from", description="YYYY-MM-DD"),
    date_to: date | None = Query(None, alias="to", description="YYYY-MM-DD"),
):
    return report_service.resolve_range(date_from, date_to)


@router.get("/summary", response_model=SummaryOut)
def summary_report(_admin: User = Depends(require_role(Role.admin)),
                   rng=Depends(_date_range),
                   db: Session = Depends(get_db)):
    expire_pending(db)  # đơn quá hạn được tính là cancelled
    _, _, start, end = rng
    return report_service.summary(db, start, end)


@router.get("/occupancy", response_model=OccupancyOut)
def occupancy_report(_admin: User = Depends(require_role(Role.admin)),
                     rng=Depends(_date_range),
                     db: Session = Depends(get_db)):
    expire_pending(db)
    date_from, date_to, start, end = rng
    return report_service.occupancy(db, date_from, date_to, start, end)


@router.get("/peak-hours", response_model=PeakHoursOut)
def peak_hours_report(_admin: User = Depends(require_role(Role.admin)),
                      rng=Depends(_date_range),
                      db: Session = Depends(get_db)):
    expire_pending(db)
    _, _, start, end = rng
    return report_service.peak_hours(db, start, end)