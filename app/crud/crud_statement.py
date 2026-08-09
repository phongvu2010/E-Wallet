from typing import Sequence
from uuid import UUID

from sqlalchemy import select
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
        self, db: AsyncSession, user_id: UUID
    ) -> Sequence[Statement]:
        """Lấy danh sách các bản ghi sao kê thẻ tín dụng của người dùng.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            user_id (UUID): ID người dùng.

        Returns:
            Sequence[Statement]: Danh sách sao kê được sắp xếp giảm dần theo ngày chốt.
        """
        stmt = (
            select(Statement)
            .where(Statement.user_id == user_id)
            .order_by(Statement.statement_date.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()

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
