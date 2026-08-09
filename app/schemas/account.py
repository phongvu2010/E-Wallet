from decimal import Decimal
from datetime import datetime
from enum import Enum
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class AccountType(str, Enum):
    CHECKING = "Checking Account"
    CREDIT_CARD = "Credit Card"
    E_WALLET = "E-Wallet"
    CASH = "Cash"
    SAVINGS = "Savings"

class AccountBase(BaseModel):
    account_name: str = Field(..., max_length=100)
    account_type: AccountType
    bank_name: str | None = Field(None, max_length=100)
    account_number: str | None = Field(None, max_length=50)
    card_holder_name: str | None = Field(None, max_length=100)
    currency: str = Field("VND", max_length=3)
    initial_balance: Decimal = Decimal("0.00")
    current_credit_limit: Decimal = Decimal("0.00")

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    account_name: str | None = Field(None, max_length=100)
    account_type: AccountType | None = None
    bank_name: str | None = Field(None, max_length=100)
    account_number: str | None = Field(None, max_length=50)
    card_holder_name: str | None = Field(None, max_length=100)
    currency: str | None = Field(None, max_length=3)
    initial_balance: Decimal | None = None
    current_credit_limit: Decimal | None = None

class AccountResponse(AccountBase):
    id: UUID
    user_id: UUID
    current_balance: Decimal | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
