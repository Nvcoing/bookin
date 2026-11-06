from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import Role
from app.errors import AppError
from app.models import User
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

_BEARER = {"WWW-Authenticate": "Bearer"}


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except ExpiredSignatureError:
        raise AppError(401, "TOKEN_EXPIRED", "Phiên đăng nhập đã hết hạn.",
                       headers=_BEARER)
    except (JWTError, KeyError, ValueError):
        raise AppError(401, "UNAUTHORIZED", "Token không hợp lệ.",
                       headers=_BEARER)

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise AppError(401, "UNAUTHORIZED", "Tài khoản không tồn tại hoặc đã bị khóa.",
                       headers=_BEARER)
    return user


def require_role(*roles: Role):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise AppError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.")
        return user
    return checker