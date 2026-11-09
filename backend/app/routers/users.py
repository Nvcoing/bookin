from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.enums import Role
from app.errors import AppError
from app.models import User
from app.schemas import Page, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
def read_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(data: UserUpdate,
              user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    changes = data.model_dump(exclude_unset=True)
    if "special_needs" in changes and changes["special_needs"] is not None:
        user.special_needs = list(dict.fromkeys(n.value for n in data.special_needs))
    if changes.get("full_name"):
        user.full_name = changes["full_name"].strip()
    if "student_code" in changes and changes["student_code"] is not None:
        user.student_code = changes["student_code"].strip() if changes["student_code"] else None
    if "faculty" in changes:
        user.faculty = changes["faculty"].strip() if changes["faculty"] else None
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=Page[UserOut])
def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: Role | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    stmt = select(User).order_by(User.id)
    if search:
        s = f"%{search.strip().lower()}%"
        stmt = stmt.where((func.lower(User.full_name).like(s)) | (func.lower(User.email).like(s)))
    if role:
        stmt = stmt.where(User.role == role)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    users = list(db.scalars(stmt.offset((page - 1) * size).limit(size)).all())
    return Page(items=users, total=total, page=page, size=size)


@router.patch("/{user_id}", response_model=UserOut)
def update_user_by_admin(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    target = db.get(User, user_id)
    if not target:
        raise AppError(404, "NOT_FOUND", "Không tìm thấy người dùng.")

    changes = data.model_dump(exclude_unset=True)
    if "role" in changes and changes["role"] is not None:
        target.role = changes["role"]
    if "can_book_special_rooms" in changes and changes["can_book_special_rooms"] is not None:
        target.can_book_special_rooms = changes["can_book_special_rooms"]
    if "is_active" in changes and changes["is_active"] is not None:
        target.is_active = changes["is_active"]
    if "faculty" in changes and changes["faculty"] is not None:
        target.faculty = changes["faculty"].strip() if changes["faculty"] else None
    if "student_code" in changes and changes["student_code"] is not None:
        target.student_code = changes["student_code"].strip() if changes["student_code"] else None
    if "special_needs" in changes and changes["special_needs"] is not None:
        target.special_needs = list(dict.fromkeys(n.value for n in data.special_needs))
    if changes.get("full_name"):
        target.full_name = changes["full_name"].strip()

    db.commit()
    db.refresh(target)
    return target