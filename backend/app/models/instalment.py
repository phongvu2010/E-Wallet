import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Computed,
    Date,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Instalment(Base, TimestampMixin):
    """Bảng lưu trữ thông tin các khoản giao dịch trả góp thẻ tín dụng.

    Attributes:
        id (uuid.UUID): Định danh khoản trả góp.
        user_id (uuid.UUID): ID của người dùng.
        account_id (uuid.UUID): ID của tài khoản thẻ tín dụng liên quan.
        product_name (str): Tên sản phẩm/dịch vụ chuyển đổi trả góp.
        transaction_date (date | None): Ngày thực hiện giao dịch gốc.
        total_amount (Decimal): Tổng số tiền chuyển đổi trả góp.
        conversion_fee (Decimal): Phí chuyển đổi trả góp.
        term_months (int): Số tháng kỳ hạn trả góp (ví dụ: 6, 12, 24).
        monthly_amount (Decimal | None): Số tiền phải trả hàng tháng (cột GENERATED STORED trong DB).
        status (str): Trạng thái trả góp (active, completed, cancelled).
    """

    __tablename__ = "instalments"
    __table_args__ = (
        UniqueConstraint("id", "user_id", name="unique_instalment_user"),
        ForeignKeyConstraint(
            ["account_id", "user_id"],
            ["public.accounts.id", "public.accounts.user_id"],
            ondelete="CASCADE",
            name="fk_instalments_account",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    transaction_date: Mapped[date | None] = mapped_column(Date)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    conversion_fee: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0.00)
    term_months: Mapped[int] = mapped_column(Integer, default=12)
    # monthly_amount là cột GENERATED STORED trong DB
    monthly_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 2),
        Computed("ROUND(total_amount / GREATEST(term_months, 1), 2)", persisted=True),
    )
    status: Mapped[str] = mapped_column(String(20), default="active")
