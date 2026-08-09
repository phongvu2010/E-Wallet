from datetime import date
from typing import Sequence
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.crud.crud_account import crud_account
from app.crud.crud_category import crud_category
from app.crud.crud_instalment import crud_instalment
from app.crud.crud_statement import crud_statement
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionType,
    TransactionUpdate,
)


class CRUDTransaction(CRUDBase[Transaction, TransactionCreate, TransactionUpdate]):
    """Lớp quản lý các thao tác CRUD dành riêng cho Transaction model."""

    def __init__(self):
        super().__init__(Transaction)

    async def validate_references(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        account_id: UUID | None = None,
        destination_account_id: UUID | None = None,
        category_id: UUID | None = None,
        statement_id: UUID | None = None,
        instalment_id: UUID | None = None,
    ) -> None:
        """Xác thực tất cả các tài nguyên tham chiếu thuộc sở hữu của người dùng hoặc hệ thống.

        Raises:
            ValueError: Nếu bất kỳ tài nguyên nào không hợp lệ hoặc không thuộc về người dùng.
        """
        if account_id is not None:
            account = await crud_account.get_by_id(
                db, account_id=account_id, user_id=user_id
            )
            if not account:
                raise ValueError(
                    "Tài khoản nguồn (account_id) không tồn tại hoặc không thuộc quyền sở hữu của bạn."
                )

        if destination_account_id is not None:
            dest_account = await crud_account.get_by_id(
                db, account_id=destination_account_id, user_id=user_id
            )
            if not dest_account:
                raise ValueError(
                    "Tài khoản nhận (destination_account_id) không tồn tại hoặc không thuộc quyền sở hữu của bạn."
                )

        if category_id is not None:
            category = await crud_category.get_by_id(
                db, category_id=category_id, user_id=user_id
            )
            if not category:
                raise ValueError(
                    "Danh mục (category_id) không tồn tại hoặc không hợp lệ."
                )

        if statement_id is not None:
            statement = await crud_statement.get_by_id(
                db, statement_id=statement_id, user_id=user_id
            )
            if not statement:
                raise ValueError(
                    "Kỳ sao kê (statement_id) không tồn tại hoặc không thuộc quyền sở hữu của bạn."
                )

        if instalment_id is not None:
            instalment = await crud_instalment.get_by_id(
                db, instalment_id=instalment_id, user_id=user_id
            )
            if not instalment:
                raise ValueError(
                    "Khoản trả góp (instalment_id) không tồn tại hoặc không thuộc quyền sở hữu của bạn."
                )

    async def get_multi_by_user(
        self,
        db: AsyncSession,
        user_id: UUID,
        *,
        skip: int = 0,
        limit: int = 100,
        start_date: date | None = None,
        end_date: date | None = None,
        account_id: UUID | None = None,
        category_id: UUID | None = None,
        type: TransactionType | None = None,
    ) -> tuple[Sequence[Transaction], int]:
        """Lấy danh sách các giao dịch tài chính của người dùng kèm tổng số bản ghi.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            user_id (UUID): ID người dùng.
            skip (int): Số lượng bản ghi bỏ qua (default 0).
            limit (int): Số lượng bản ghi tối đa (default 100).
            start_date (date | None): Ngày bắt đầu tìm kiếm.
            end_date (date | None): Ngày kết thúc tìm kiếm.
            account_id (UUID | None): Lọc theo ID tài khoản (nguồn hoặc nhận).
            category_id (UUID | None): Lọc theo ID danh mục thu chi.
            type (TransactionType | None): Lọc theo loại giao dịch.

        Returns:
            tuple[Sequence[Transaction], int]: Danh sách giao dịch và tổng số bản ghi thỏa điều kiện.
        """
        stmt = select(Transaction).where(Transaction.user_id == user_id)

        if start_date is not None:
            stmt = stmt.where(Transaction.transaction_date >= start_date)
        if end_date is not None:
            stmt = stmt.where(Transaction.transaction_date <= end_date)
        if account_id is not None:
            stmt = stmt.where(
                or_(
                    Transaction.account_id == account_id,
                    Transaction.destination_account_id == account_id,
                )
            )
        if category_id is not None:
            stmt = stmt.where(Transaction.category_id == category_id)
        if type is not None:
            stmt = stmt.where(Transaction.type == type)

        # Tính tổng số bản ghi thỏa điều kiện lọc
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_res = await db.execute(count_stmt)
        total = count_res.scalar_one()

        # Truy vấn danh sách bản ghi phân trang
        items_stmt = (
            stmt.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items_res = await db.execute(items_stmt)
        items = items_res.scalars().all()

        return items, total

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

        Raises:
            ValueError: Nếu bất kỳ tham chiếu nào không hợp lệ.
        """
        await self.validate_references(
            db,
            user_id=user_id,
            account_id=transaction_in.account_id,
            destination_account_id=transaction_in.destination_account_id,
            category_id=transaction_in.category_id,
            statement_id=transaction_in.statement_id,
            instalment_id=transaction_in.instalment_id,
        )
        return await self.create(
            db, obj_in=transaction_in, extra_data={"user_id": user_id}
        )

    async def update_by_user(
        self,
        db: AsyncSession,
        *,
        db_obj: Transaction,
        transaction_in: TransactionUpdate,
        user_id: UUID,
    ) -> Transaction:
        """Cập nhật giao dịch với xác thực quy tắc nghiệp vụ trên dữ liệu hợp nhất (merged state).

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            db_obj (Transaction): Đối tượng giao dịch ORM hiện tại.
            transaction_in (TransactionUpdate): Schema dữ liệu cập nhật.
            user_id (UUID): ID người dùng.

        Returns:
            Transaction: Đối tượng giao dịch sau khi cập nhật.

        Raises:
            ValueError: Nếu quy tắc nghiệp vụ hoặc tham chiếu vi phạm.
        """
        # Hợp nhất dữ liệu hiện tại với dữ liệu cập nhật mới
        effective_account_id = (
            transaction_in.account_id
            if transaction_in.account_id is not None
            else db_obj.account_id
        )
        effective_dest_account_id = (
            transaction_in.destination_account_id
            if transaction_in.destination_account_id is not None
            else db_obj.destination_account_id
        )
        effective_type = (
            transaction_in.type if transaction_in.type is not None else db_obj.type
        )
        effective_instalment_id = (
            transaction_in.instalment_id
            if transaction_in.instalment_id is not None
            else db_obj.instalment_id
        )

        # Kiểm tra quy tắc nghiệp vụ theo loại giao dịch trên trạng thái hợp nhất
        if effective_type == TransactionType.TRANSFER:
            if not effective_dest_account_id:
                raise ValueError(
                    "Giao dịch chuyển khoản yêu cầu chỉ định tài khoản nhận (destination_account_id)."
                )
            if effective_dest_account_id == effective_account_id:
                raise ValueError(
                    "Tài khoản nhận (destination_account_id) phải khác tài khoản nguồn (account_id)."
                )

        if effective_type == TransactionType.INSTALMENT:
            if not effective_instalment_id:
                raise ValueError(
                    "Giao dịch trả góp yêu cầu liên kết đến chương trình trả góp (instalment_id)."
                )

        # Xác thực các tài nguyên tham chiếu thực sự được thay đổi
        await self.validate_references(
            db,
            user_id=user_id,
            account_id=transaction_in.account_id,
            destination_account_id=transaction_in.destination_account_id,
            category_id=transaction_in.category_id,
            statement_id=transaction_in.statement_id,
            instalment_id=transaction_in.instalment_id,
        )

        return await self.update(db, db_obj=db_obj, obj_in=transaction_in)


crud_transaction = CRUDTransaction()
