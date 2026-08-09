from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AccountType(str, Enum):
    """Các loại tài khoản tài chính được hỗ trợ."""

    CHECKING = "Checking Account"
    CREDIT_CARD = "Credit Card"
    E_WALLET = "E-Wallet"
    CASH = "Cash"
    SAVINGS = "Savings"


class AccountBase(BaseModel):
    """Schema cơ sở chứa thuộc tính chung của tài khoản."""

    account_name: str = Field(..., max_length=100)
    account_type: AccountType
    bank_name: str | None = Field(None, max_length=100)
    account_number: str | None = Field(None, max_length=50)
    card_holder_name: str | None = Field(None, max_length=100)
    currency: str = Field("VND", max_length=3)
    initial_balance: Decimal = Field(Decimal("0.00"))
    current_credit_limit: Decimal = Field(Decimal("0.00"))


class AccountCreate(AccountBase):
    """Schema tạo mới tài khoản."""

    pass


class AccountUpdate(BaseModel):
    """Schema cập nhật tài khoản."""

    account_name: str | None = Field(None, max_length=100)
    account_type: AccountType | None = None
    bank_name: str | None = Field(None, max_length=100)
    account_number: str | None = Field(None, max_length=50)
    card_holder_name: str | None = Field(None, max_length=100)
    currency: str | None = Field(None, max_length=3)
    initial_balance: Decimal | None = None
    current_credit_limit: Decimal | None = None


class AccountResponse(AccountBase):
    """Schema phản hồi thông tin tài khoản."""

    id: UUID
    user_id: UUID
    current_balance: Decimal | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
