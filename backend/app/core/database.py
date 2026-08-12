from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# Khởi tạo Engine SQLAlchemy bất đồng bộ cho kết nối PostgreSQL/Supabase
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    future=True,
    pool_pre_ping=True,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

# Factory tạo các AsyncSession làm việc với cơ sở dữ liệu
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Tạo và quản lý vòng đời của session làm việc với cơ sở dữ liệu bất đồng bộ.

    Yields:
        AsyncSession: Phiên kết nối cơ sở dữ liệu SQLAlchemy bất đồng bộ.

    Raises:
        Exception: Đẩy các lỗi phát sinh trong phiên truy vấn ra ngoài và đảm bảo đóng session sạch.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            if session.is_active:
                await session.rollback()
            raise
        finally:
            if session.is_active and session.in_transaction():
                await session.rollback()
            await session.close()
