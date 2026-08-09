from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import get_current_user as get_user_from_token, CurrentUser

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session

def get_current_user(current_user: CurrentUser = Depends(get_user_from_token)) -> CurrentUser:
    return current_user
