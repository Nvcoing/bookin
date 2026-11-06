from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.enums import Role
from app.errors import AppError
from app.models import User
from app.schemas import RegisterOut, TokenOut, UserCreate
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=RegisterOut, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    if not email.endswith("@vnu.edu.vn"):
        raise AppError(400, "INVALID_EMAIL_DOMAIN", "Email đăng ký phải thuộc tên miền @vnu.edu.vn (VNU-IS).")
    if db.scalar(select(User).where(User.email == email)):
        raise AppError(409, "EMAIL_EXISTS", "Email này đã được đăng ký.")

    user = User(
        email=email,
        full_name=data.full_name.strip(),
        hashed_password=hash_password(data.password),
        role=Role.student,  # luôn là student, chỉ admin mới đổi được vai trò
        faculty=data.faculty,
        special_needs=list(dict.fromkeys(n.value for n in data.special_needs)),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(),
          db: Session = Depends(get_db)):
    # Form OAuth2 dùng trường "username", ở đây chính là email
    user = db.scalar(select(User).where(User.email == form.username.lower()))
    if not user or not verify_password(form.password, user.hashed_password):
        raise AppError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.")
    if not user.is_active:
        raise AppError(403, "FORBIDDEN", "Tài khoản đã bị khóa.")

    token = create_access_token(user.id, user.role.value)
    return TokenOut(
        access_token=token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )