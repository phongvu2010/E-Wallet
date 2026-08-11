from typing import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.crud.crud_account import crud_account
from app.models.statement import Statement
from app.schemas.statement import StatementCreate, StatementUpdate


class CRUDStatement(CRUDBase[Statement, StatementCreate, StatementUpdate]):
    """Lớp quản lý các thao tác CRUD dành riêng cho Statement model."""

    def __init__(self):
        super().__init__(Statement)

    async def get_multi_by_user(
        self, db: AsyncSession, user_id: UUID, *, skip: int = 0, limit: int = 100
    ) -> tuple[Sequence[Statement], int]:
        """Lấy danh sách các bản ghi sao kê thẻ tín dụng của người dùng kèm tổng số bản ghi.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            user_id (UUID): ID người dùng.
            skip (int): Số lượng bản ghi bỏ qua (offset).
            limit (int): Số lượng bản ghi tối đa lấy về (limit).

        Returns:
            tuple[Sequence[Statement], int]: Danh sách sao kê và tổng số bản ghi.
        """
        count_stmt = select(func.count(Statement.id)).where(
            Statement.user_id == user_id
        )
        count_res = await db.execute(count_stmt)
        total = count_res.scalar_one()

        items_stmt = (
            select(Statement)
            .where(Statement.user_id == user_id)
            .order_by(Statement.statement_date.desc())
            .offset(skip)
            .limit(limit)
        )
        items_res = await db.execute(items_stmt)
        items = items_res.scalars().all()

        return items, total

    async def get_by_id(
        self, db: AsyncSession, statement_id: UUID, user_id: UUID
    ) -> Statement | None:
        """Lấy thông tin sao kê theo ID và người dùng sở hữu.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            statement_id (UUID): ID bản ghi sao kê.
            user_id (UUID): ID người dùng.

        Returns:
            Statement | None: Đối tượng sao kê hoặc None.
        """
        stmt = select(Statement).where(
            Statement.id == statement_id, Statement.user_id == user_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_by_user(
        self, db: AsyncSession, statement_in: StatementCreate, user_id: UUID
    ) -> Statement:
        """Tạo bản ghi sao kê mới cho người dùng.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            statement_in (StatementCreate): Schema thông tin sao kê.
            user_id (UUID): ID người dùng.

        Returns:
            Statement: Đối tượng sao kê vừa được tạo.

        Raises:
            ValueError: Nếu tài khoản không tồn tại hoặc không thuộc quyền sở hữu.
        """
        account = await crud_account.get_by_id(
            db, account_id=statement_in.account_id, user_id=user_id
        )
        if not account:
            raise ValueError(
                "Tài khoản (account_id) không tồn tại hoặc không thuộc quyền sở hữu của bạn."
            )
        return await self.create(
            db, obj_in=statement_in, extra_data={"user_id": user_id}
        )


crud_statement = CRUDStatement()
