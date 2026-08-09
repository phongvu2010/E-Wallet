import uuid
from decimal import Decimal
from sqlalchemy import String, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin

class Account(Base, TimestampMixin):
    __tablename__ = "accounts"
    __table_args__ = (
        UniqueConstraint('id', 'user_id', name='unique_account_user'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    account_number: Mapped[str | None] = mapped_column(String(50))
    bank_name: Mapped[str | None] = mapped_column(String(100))
    account_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)
    card_holder_name: Mapped[str | None] = mapped_column(String(100))
    currency: Mapped[str] = mapped_column(String(3), default='VND')
    initial_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0.00)
    current_balance: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    current_credit_limit: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0.00)
