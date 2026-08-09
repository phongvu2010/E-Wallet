from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel

from app.core.config import settings

security = HTTPBearer(auto_error=True)

class CurrentUser(BaseModel):
    id: UUID
    email: str | None = None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    token = credentials.credentials
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
            options={"verify_aud": False}
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise credentials_exception

        return CurrentUser(id=UUID(user_id), email=payload.get("email"))
    except (JWTError, ValueError):
        raise credentials_exception
