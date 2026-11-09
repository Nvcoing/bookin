import time
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

# Rate limit theo dõi đăng nhập sai: email -> (fail_count, lock_until_timestamp)
_failed_logins: dict[str, tuple[int, float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 15 * 60


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
        student_code=data.code.strip() if data.code else None,
        hashed_password=hash_password(data.password),
        role=Role.student,  # luôn là student, chỉ admin mới đổi được vai trò
        faculty=data.faculty.strip() if data.faculty else None,
        special_needs=list(dict.fromkeys(n.value for n in data.special_needs)),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(),
          db: Session = Depends(get_db)):
    email = form.username.lower().strip()
    now = time.time()

    # BUG-007: Kiểm tra brute-force rate limit
    if email in _failed_logins:
        count, lock_until = _failed_logins[email]
        if now < lock_until:
            wait_min = int((lock_until - now) / 60) + 1
            raise AppError(429, "TOO_MANY_REQUESTS", f"Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau {wait_min} phút.")
        elif lock_until > 0:
            # Hết hạn khóa
            _failed_logins[email] = (0, 0)

    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(form.password, user.hashed_password):
        # Tăng số lần đăng nhập sai
        prev_count, _ = _failed_logins.get(email, (0, 0))
        new_count = prev_count + 1
        lock = (now + LOCKOUT_SECONDS) if new_count >= MAX_FAILED_ATTEMPTS else 0
        _failed_logins[email] = (new_count, lock)
        if new_count >= MAX_FAILED_ATTEMPTS:
            raise AppError(429, "TOO_MANY_REQUESTS", "Đăng nhập sai quá 5 lần. Tài khoản tạm thời bị khóa 15 phút.")
        raise AppError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.")

    # Đăng nhập thành công, xóa bộ đếm lỗi
    _failed_logins.pop(email, None)

    if not user.is_active:
        raise AppError(403, "FORBIDDEN", "Tài khoản đã bị khóa.")

    token = create_access_token(user.id, user.role.value)
    return TokenOut(
        access_token=token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )