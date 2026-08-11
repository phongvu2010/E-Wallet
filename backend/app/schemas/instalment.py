from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InstalmentStatus(str, Enum):
    """Trạng thái khoản giao dịch trả góp."""

    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InstalmentBase(BaseModel):
    """Schema cơ sở chứa thuộc tính chung của giao dịch trả góp."""

    account_id: UUID
    product_name: str = Field(..., max_length=255)
    transaction_date: date | None = None
    total_amount: Decimal = Field(..., ge=0)
    conversion_fee: Decimal = Field(Decimal("0.00"), ge=0)
    term_months: int = Field(12, gt=0)
    status: InstalmentStatus = InstalmentStatus.ACTIVE


class InstalmentCreate(InstalmentBase):
    """Schema tạo mới khoản giao dịch trả góp."""

    pass


class InstalmentUpdate(BaseModel):
    """Schema cập nhật khoản giao dịch trả góp."""

    account_id: UUID | None = None
    product_name: str | None = Field(None, max_length=255)
    transaction_date: date | None = None
    total_amount: Decimal | None = Field(None, ge=0)
    conversion_fee: Decimal | None = Field(None, ge=0)
    term_months: int | None = Field(None, gt=0)
    status: InstalmentStatus | None = None


class InstalmentResponse(InstalmentBase):
    """Schema phản hồi thông tin khoản giao dịch trả góp."""

    id: UUID
    user_id: UUID
    monthly_amount: Decimal | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
