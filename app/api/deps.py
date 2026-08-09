from typing import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import CurrentUser, get_current_user as get_user_from_token


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency cung cấp phiên làm việc cơ sở dữ liệu (AsyncSession) cho các API endpoints.

    Yields:
        AsyncSession: Session SQLAlchemy bất đồng bộ.
    """
    async for session in get_db_session():
        yield session


def get_current_user(
    current_user: CurrentUser = Depends(get_user_from_token),
) -> CurrentUser:
    """Dependency xác thực và trích xuất thông tin người dùng hiện tại từ JWT token.

    Args:
        current_user (CurrentUser): Đối tượng người dùng lấy từ token.

    Returns:
        CurrentUser: Đối tượng người dùng đã xác thực.
    """
    return current_user
