from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StatementBase(BaseModel):
    """Schema cơ sở chứa thuộc tính chung của sao kê thẻ tín dụng."""

    account_id: UUID
    statement_code: int | None = None
    statement_date: date
    payment_due_date: date
    credit_limit: Decimal | None = Field(None, ge=0)
    total_amount: Decimal = Field(Decimal("0.00"), ge=0)
    min_payment: Decimal = Field(Decimal("0.00"), ge=0)
    reward: Decimal = Field(Decimal("0.00"), ge=0)
    file_name: str | None = Field(None, max_length=255)

    @model_validator(mode="after")
    def validate_dates(self):
        """Validate đảm bảo hạn thanh toán phải lớn hơn hoặc bằng ngày sao kê."""
        if self.payment_due_date < self.statement_date:
            raise ValueError(
                "Hạn thanh toán (payment_due_date) phải lớn hơn hoặc bằng ngày sao kê (statement_date)."
            )
        return self


class StatementCreate(StatementBase):
    """Schema tạo mới bản ghi sao kê thẻ tín dụng."""

    pass


class StatementUpdate(BaseModel):
    """Schema cập nhật thông tin sao kê thẻ tín dụng."""

    account_id: UUID | None = None
    statement_code: int | None = None
    statement_date: date | None = None
    payment_due_date: date | None = None
    credit_limit: Decimal | None = Field(None, ge=0)
    total_amount: Decimal | None = Field(None, ge=0)
    min_payment: Decimal | None = Field(None, ge=0)
    reward: Decimal | None = Field(None, ge=0)
    file_name: str | None = Field(None, max_length=255)


class StatementResponse(StatementBase):
    """Schema phản hồi thông tin sao kê thẻ tín dụng."""

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
