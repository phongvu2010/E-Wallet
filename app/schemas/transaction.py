from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TransactionType(str, Enum):
    """Các loại giao dịch tài chính."""

    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"
    INSTALMENT = "instalment"


class TransactionBase(BaseModel):
    """Schema cơ sở chứa thuộc tính chung của giao dịch."""

    account_id: UUID
    destination_account_id: UUID | None = None
    statement_id: UUID | None = None
    instalment_id: UUID | None = None
    category_id: UUID | None = None
    type: TransactionType
    transaction_date: date
    post_date: date | None = None
    transaction_detail: str
    amount: Decimal = Field(..., ge=0)
    fee: Decimal = Field(Decimal("0.00"), ge=0)
    description: str | None = None


class TransactionCreate(TransactionBase):
    """Schema tạo mới giao dịch."""

    pass


class TransactionUpdate(BaseModel):
    """Schema cập nhật thông tin giao dịch."""

    account_id: UUID | None = None
    destination_account_id: UUID | None = None
    statement_id: UUID | None = None
    instalment_id: UUID | None = None
    category_id: UUID | None = None
    type: TransactionType | None = None
    transaction_date: date | None = None
    post_date: date | None = None
    transaction_detail: str | None = None
    amount: Decimal | None = Field(None, ge=0)
    fee: Decimal | None = Field(None, ge=0)
    description: str | None = None


class TransactionResponse(TransactionBase):
    """Schema phản hồi thông tin giao dịch."""

    id: UUID
    user_id: UUID
    total_amount: Decimal | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
