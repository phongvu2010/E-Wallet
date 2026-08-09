from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from pydantic import BaseModel, ConfigDict

from app.core.config import settings

security = HTTPBearer(auto_error=True)


class CurrentUser(BaseModel):
    """Mô hình dữ liệu người dùng hiện tại trích xuất từ JWT token.

    Attributes:
        id (UUID): Định danh duy nhất (UUID) của người dùng.
        email (str | None): Địa chỉ email của người dùng (nếu có).
    """

    id: UUID
    email: str | None = None

    model_config = ConfigDict(from_attributes=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """Giải mã token JWT từ Supabase và xác thực thông tin người dùng hiện tại.

    Args:
        credentials (HTTPAuthorizationCredentials): Thông tin Bearer Token từ HTTP Authorization Header.

    Returns:
        CurrentUser: Đối tượng chứa thông tin ID và email của người dùng đã xác thực.

    Raises:
        HTTPException: Trả về lỗi 401 UNAUTHORIZED nếu token không hợp lệ, hết hạn hoặc thiếu trường 'sub'.
    """
    token: str = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token xác thực không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[settings.ALGORITHM],
            audience=settings.SUPABASE_JWT_AUDIENCE if settings.SUPABASE_JWT_AUDIENCE else None,
            options={"verify_aud": bool(settings.SUPABASE_JWT_AUDIENCE)},
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise credentials_exception

        return CurrentUser(id=UUID(user_id), email=payload.get("email"))
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token xác thực đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (JWTError, ValueError):
        raise credentials_exception
