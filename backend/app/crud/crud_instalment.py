from typing import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.crud.crud_account import crud_account
from app.models.instalment import Instalment
from app.schemas.instalment import InstalmentCreate, InstalmentUpdate


class CRUDInstalment(CRUDBase[Instalment, InstalmentCreate, InstalmentUpdate]):
    """Lớp quản lý các thao tác CRUD dành riêng cho Instalment model."""

    def __init__(self):
        super().__init__(Instalment)

    async def get_multi_by_user(
        self, db: AsyncSession, user_id: UUID, *, skip: int = 0, limit: int = 100
    ) -> tuple[Sequence[Instalment], int]:
        """Lấy danh sách khoản trả góp của người dùng kèm tổng số bản ghi.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            user_id (UUID): ID người dùng.
            skip (int): Số lượng bản ghi bỏ qua (offset).
            limit (int): Số lượng bản ghi tối đa lấy về (limit).

        Returns:
            tuple[Sequence[Instalment], int]: Danh sách khoản trả góp và tổng số bản ghi.
        """
        count_stmt = select(func.count(Instalment.id)).where(
            Instalment.user_id == user_id
        )
        count_res = await db.execute(count_stmt)
        total = count_res.scalar_one()

        items_stmt = (
            select(Instalment)
            .where(Instalment.user_id == user_id)
            .order_by(Instalment.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items_res = await db.execute(items_stmt)
        items = items_res.scalars().all()

        return items, total

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

        Raises:
            ValueError: Nếu tài khoản không tồn tại hoặc không thuộc quyền sở hữu.
        """
        account = await crud_account.get_by_id(
            db, account_id=instalment_in.account_id, user_id=user_id
        )
        if not account:
            raise ValueError(
                "Tài khoản (account_id) không tồn tại hoặc không thuộc quyền sở hữu của bạn."
            )
        return await self.create(
            db, obj_in=instalment_in, extra_data={"user_id": user_id}
        )


crud_instalment = CRUDInstalment()
