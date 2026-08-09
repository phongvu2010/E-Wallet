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
        self, db: AsyncSession, user_id: UUID
    ) -> Sequence[Account]:
        """Lấy danh sách tất cả tài khoản thuộc sở hữu của một người dùng.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            user_id (UUID): ID của người dùng.

        Returns:
            Sequence[Account]: Danh sách các tài khoản của người dùng.
        """
        stmt = (
            select(Account)
            .where(Account.user_id == user_id)
            .order_by(Account.created_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()

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
    ) -> float | None:
        """Gọi Stored Procedure recalculate_account_balance để tính toán lại số dư tài khoản.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            account_id (UUID): ID tài khoản cần tính lại.
            user_id (UUID): ID người dùng sở hữu.

        Returns:
            float | None: Số dư mới sau khi tính toán.
        """
        stmt = select(func.public.recalculate_account_balance(account_id, user_id))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


crud_account = CRUDAccount()
