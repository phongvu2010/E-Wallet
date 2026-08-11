import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Computed,
    Date,
    ForeignKey,
    ForeignKeyConstraint,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Transaction(Base, TimestampMixin):
    """Bảng lưu trữ các giao dịch thu, chi hoặc chuyển khoản tài chính của người dùng.

    Attributes:
        id (uuid.UUID): Định danh giao dịch.
        user_id (uuid.UUID): ID của người dùng thực hiện giao dịch.
        account_id (uuid.UUID): ID tài khoản nguồn thực hiện giao dịch.
        destination_account_id (uuid.UUID | None): ID tài khoản đích (nếu là giao dịch chuyển tiền).
        statement_id (uuid.UUID | None): ID kỳ sao kê liên quan (nếu thuộc sao kê thẻ).
        instalment_id (uuid.UUID | None): ID khoản trả góp (nếu thuộc giao dịch trả góp).
        category_id (uuid.UUID | None): ID danh mục thu chi.
        type (str): Loại giao dịch (expense, income, transfer, payment, etc.).
        transaction_date (date): Ngày phát sinh giao dịch.
        post_date (date | None): Ngày ghi nhận/hạch toán giao dịch.
        transaction_detail (str): Nội dung mô tả chi tiết giao dịch.
        amount (Decimal): Số tiền giao dịch gốc.
        fee (Decimal): Phí giao dịch kèm theo (nếu có).
        total_amount (Decimal | None): Tổng số tiền bao gồm phí (cột GENERATED STORED trong DB).
        description (str | None): Ghi chú bổ sung.
    """

    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint("id", "user_id", name="unique_transaction_user"),
        ForeignKeyConstraint(
            ["account_id", "user_id"],
            ["public.accounts.id", "public.accounts.user_id"],
            ondelete="CASCADE",
            name="fk_transactions_account",
        ),
        ForeignKeyConstraint(
            ["destination_account_id", "user_id"],
            ["public.accounts.id", "public.accounts.user_id"],
            ondelete="SET NULL",
            name="fk_transactions_destination_account",
        ),
        ForeignKeyConstraint(
            ["statement_id", "user_id"],
            ["public.statements.id", "public.statements.user_id"],
            ondelete="SET NULL",
            name="fk_transactions_statement",
        ),
        ForeignKeyConstraint(
            ["instalment_id", "user_id"],
            ["public.instalments.id", "public.instalments.user_id"],
            ondelete="SET NULL",
            name="fk_transactions_instalment",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    destination_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    statement_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    instalment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.categories.id", ondelete="SET NULL")
    )

    type: Mapped[str] = mapped_column(String(20), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    post_date: Mapped[date | None] = mapped_column(Date)
    transaction_detail: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    fee: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0.00)
    # total_amount là GENERATED STORED column trong DB
    total_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 2),
        Computed("amount + COALESCE(fee, 0.00)", persisted=True),
    )
    description: Mapped[str | None] = mapped_column(Text)
