from decimal import Decimal
from typing import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate


class CRUDAccount(CRUDBase[Account, AccountCreate, AccountUpdate]):
    """Lớp quản lý các thao tác CRUD dành riêng cho Account model."""

    def __init__(self):
        super().__init__(Account)

    async def get_multi_by_user(
        self, db: AsyncSession, user_id: UUID, *, skip: int = 0, limit: int = 100
    ) -> tuple[Sequence[Account], int]:
        """Lấy danh sách tất cả tài khoản thuộc sở hữu của một người dùng có phân trang kèm tổng số bản ghi.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            user_id (UUID): ID của người dùng.
            skip (int): Số lượng bản ghi bỏ qua (offset).
            limit (int): Số lượng bản ghi tối đa lấy về (limit).

        Returns:
            tuple[Sequence[Account], int]: Danh sách các tài khoản và tổng số bản ghi.
        """
        count_stmt = select(func.count(Account.id)).where(Account.user_id == user_id)
        count_res = await db.execute(count_stmt)
        total = count_res.scalar_one()

        items_stmt = (
            select(Account)
            .where(Account.user_id == user_id)
            .order_by(Account.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items_res = await db.execute(items_stmt)
        items = items_res.scalars().all()

        return items, total

    async def get_by_id(
        self, db: AsyncSession, account_id: UUID, user_id: UUID
    ) -> Account | None:
        """Lấy thông tin tài khoản theo ID và thuộc về người dùng cụ thể.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            account_id (UUID): ID tài khoản cần tìm.
            user_id (UUID): ID người dùng sở hữu.

        Returns:
            Account | None: Đối tượng tài khoản hoặc None nếu không tìm thấy.
        """
        stmt = select(Account).where(
            Account.id == account_id, Account.user_id == user_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_by_user(
        self, db: AsyncSession, account_in: AccountCreate, user_id: UUID
    ) -> Account:
        """Tạo mới tài khoản gắn liền với ID người dùng.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            account_in (AccountCreate): Schema chứa dữ liệu tạo tài khoản.
            user_id (UUID): ID người dùng tạo tài khoản.

        Returns:
            Account: Đối tượng tài khoản vừa tạo.
        """
        return await self.create(db, obj_in=account_in, extra_data={"user_id": user_id})

    async def recalculate_balance(
        self, db: AsyncSession, account_id: UUID, user_id: UUID
    ) -> Decimal | None:
        """Gọi Stored Procedure recalculate_account_balance để tính toán lại số dư tài khoản.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            account_id (UUID): ID tài khoản cần tính lại.
            user_id (UUID): ID người dùng sở hữu.

        Returns:
            Decimal | None: Số dư mới sau khi tính toán.
        """
        stmt = select(func.public.recalculate_account_balance(account_id, user_id))
        result = await db.execute(stmt)
        new_balance = result.scalar_one_or_none()
        await db.commit()

        return new_balance


crud_account = CRUDAccount()
