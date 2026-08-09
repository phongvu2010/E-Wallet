from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.instalment import Instalment
from app.schemas.instalment import InstalmentCreate, InstalmentUpdate


class CRUDInstalment(CRUDBase[Instalment, InstalmentCreate, InstalmentUpdate]):
    """Lớp quản lý các thao tác CRUD dành riêng cho Instalment model."""

    def __init__(self):
        super().__init__(Instalment)

    async def get_multi_by_user(
        self, db: AsyncSession, user_id: UUID
    ) -> Sequence[Instalment]:
        """Lấy danh sách khoản trả góp của người dùng.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            user_id (UUID): ID người dùng.

        Returns:
            Sequence[Instalment]: Danh sách khoản trả góp.
        """
        stmt = (
            select(Instalment)
            .where(Instalment.user_id == user_id)
            .order_by(Instalment.created_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_by_id(
        self, db: AsyncSession, instalment_id: UUID, user_id: UUID
    ) -> Instalment | None:
        """Lấy khoản trả góp theo ID và ID người dùng.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            instalment_id (UUID): ID khoản trả góp.
            user_id (UUID): ID người dùng sở hữu.

        Returns:
            Instalment | None: Đối tượng khoản trả góp hoặc None.
        """
        stmt = select(Instalment).where(
            Instalment.id == instalment_id, Instalment.user_id == user_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_by_user(
        self, db: AsyncSession, instalment_in: InstalmentCreate, user_id: UUID
    ) -> Instalment:
        """Tạo khoản trả góp mới cho người dùng.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            instalment_in (InstalmentCreate): Schema dữ liệu khoản trả góp.
            user_id (UUID): ID người dùng.

        Returns:
            Instalment: Đối tượng khoản trả góp vừa tạo.
        """
        return await self.create(
            db, obj_in=instalment_in, extra_data={"user_id": user_id}
        )


crud_instalment = CRUDInstalment()
