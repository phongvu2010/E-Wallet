from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


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

    @model_validator(mode="after")
    def validate_transaction_types(self) -> "TransactionCreate":
        """Xác thực các quy tắc nghiệp vụ khi tạo giao dịch theo từng loại (TRANSFER, INSTALMENT)."""
        if self.type == TransactionType.TRANSFER:
            if not self.destination_account_id:
                raise ValueError(
                    "Giao dịch chuyển khoản yêu cầu chỉ định tài khoản nhận (destination_account_id)."
                )
            if self.destination_account_id == self.account_id:
                raise ValueError(
                    "Tài khoản nhận (destination_account_id) phải khác tài khoản nguồn (account_id)."
                )
        if self.type == TransactionType.INSTALMENT:
            if not self.instalment_id:
                raise ValueError(
                    "Giao dịch trả góp yêu cầu liên kết đến chương trình trả góp (instalment_id)."
                )
        return self


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

    @model_validator(mode="after")
    def validate_transaction_types(self) -> "TransactionUpdate":
        """Xác thực quy tắc nghiệp vụ khi cập nhật loại giao dịch hoặc tài khoản."""
        if (
            self.type == TransactionType.TRANSFER
            and self.destination_account_id is not None
            and self.account_id is not None
            and self.destination_account_id == self.account_id
        ):
            raise ValueError(
                "Tài khoản nhận (destination_account_id) phải khác tài khoản nguồn (account_id)."
            )
        return self


class TransactionResponse(TransactionBase):
    """Schema phản hồi thông tin giao dịch."""

    id: UUID
    user_id: UUID
    total_amount: Decimal | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
