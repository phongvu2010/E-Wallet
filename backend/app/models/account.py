import uuid
from decimal import Decimal

from sqlalchemy import Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Account(Base, TimestampMixin):
    """Bảng lưu trữ thông tin các tài khoản ngân hàng / ví điện tử / thẻ tín dụng của người dùng.

    Attributes:
        id (uuid.UUID): Định danh tài khoản.
        user_id (uuid.UUID): ID của người dùng sở hữu tài khoản.
        account_number (str | None): Số tài khoản / Số thẻ.
        bank_name (str | None): Tên ngân hàng / Tổ chức phát hành.
        account_name (str): Tên gợi nhớ của tài khoản.
        account_type (str): Loại tài khoản (checking, credit, savings, etc.).
        card_holder_name (str | None): Tên chủ thẻ (nếu là thẻ tín dụng/ghi nợ).
        currency (str): Đơn vị tiền tệ (mặc định là VND).
        initial_balance (Decimal): Số dư ban đầu.
        current_balance (Decimal | None): Số dư hiện tại.
        current_credit_limit (Decimal): Hạn mức tín dụng hiện tại (nếu là thẻ tín dụng).
    """

    __tablename__ = "accounts"
    __table_args__ = (
        UniqueConstraint("id", "user_id", name="unique_account_user"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    account_number: Mapped[str | None] = mapped_column(String(50))
    bank_name: Mapped[str | None] = mapped_column(String(100))
    account_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)
    card_holder_name: Mapped[str | None] = mapped_column(String(100))
    currency: Mapped[str] = mapped_column(String(3), default="VND")
    initial_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0.00)
    current_balance: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    current_credit_limit: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0.00)
