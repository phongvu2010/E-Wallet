from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate


class CRUDTransaction(CRUDBase[Transaction, TransactionCreate, TransactionUpdate]):
    """Lớp quản lý các thao tác CRUD dành riêng cho Transaction model."""

    def __init__(self):
        super().__init__(Transaction)

    async def get_multi_by_user(
        self, db: AsyncSession, user_id: UUID, skip: int = 0, limit: int = 100
    ) -> Sequence[Transaction]:
        """Lấy danh sách các giao dịch tài chính của người dùng (có phân trang).

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            user_id (UUID): ID người dùng.
            skip (int): Số lượng bản ghi bỏ qua (default 0).
            limit (int): Số lượng bản ghi tối đa (default 100).

        Returns:
            Sequence[Transaction]: Danh sách giao dịch giảm dần theo ngày giao dịch.
        """
        stmt = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.transaction_date.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_by_id(
        self, db: AsyncSession, transaction_id: UUID, user_id: UUID
    ) -> Transaction | None:
        """Lấy giao dịch theo ID và thuộc người dùng cụ thể.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            transaction_id (UUID): ID giao dịch.
            user_id (UUID): ID người dùng.

        Returns:
            Transaction | None: Đối tượng giao dịch hoặc None.
        """
        stmt = select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_by_user(
        self, db: AsyncSession, transaction_in: TransactionCreate, user_id: UUID
    ) -> Transaction:
        """Tạo giao dịch mới cho người dùng.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            transaction_in (TransactionCreate): Schema dữ liệu giao dịch.
            user_id (UUID): ID người dùng.

        Returns:
            Transaction: Đối tượng giao dịch vừa tạo.
        """
        return await self.create(
            db, obj_in=transaction_in, extra_data={"user_id": user_id}
        )


crud_transaction = CRUDTransaction()
