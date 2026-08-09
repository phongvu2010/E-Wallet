import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKeyConstraint, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Statement(Base, TimestampMixin):
    """Bảng lưu trữ thông tin sao kê thẻ tín dụng hàng tháng.

    Attributes:
        id (uuid.UUID): Định danh bản ghi sao kê.
        user_id (uuid.UUID): ID của người dùng.
        account_id (uuid.UUID): ID của tài khoản thẻ tín dụng liên quan.
        statement_code (int | None): Mã kỳ sao kê.
        statement_date (date): Ngày chốt sao kê.
        payment_due_date (date): Hạn thanh toán sao kê.
        credit_limit (Decimal | None): Hạn mức tín dụng tại thời điểm sao kê.
        total_amount (Decimal): Tổng số tiền dư nợ trong kỳ sao kê.
        min_payment (Decimal): Số tiền thanh toán tối thiểu.
        reward (Decimal): Tiền thưởng/hoàn tiền tích lũy trong kỳ.
        file_name (str | None): Tên file PDF/hình ảnh sao kê (nếu có).
    """

    __tablename__ = "statements"
    __table_args__ = (
        UniqueConstraint(
            "account_id", "statement_date", name="unique_statement_per_account"
        ),
        UniqueConstraint("id", "user_id", name="unique_statement_user"),
        ForeignKeyConstraint(
            ["account_id", "user_id"],
            ["public.accounts.id", "public.accounts.user_id"],
            ondelete="CASCADE",
            name="fk_statements_account",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    statement_code: Mapped[int | None] = mapped_column(Integer)
    statement_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_due_date: Mapped[date] = mapped_column(Date, nullable=False)
    credit_limit: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0.00)
    min_payment: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0.00)
    reward: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0.00)
    file_name: Mapped[str | None] = mapped_column(String(255))
