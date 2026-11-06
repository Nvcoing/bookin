from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import UserOut, UserUpdate

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
    if "faculty" in changes:
        user.faculty = changes["faculty"]
    db.commit()
    db.refresh(user)
    return user