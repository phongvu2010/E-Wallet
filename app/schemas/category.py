from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoryType(str, Enum):
    """Các loại danh mục thu chi."""

    EXPENSE = "expense"
    INCOME = "income"
    TRANSFER = "transfer"
    INSTALMENT = "instalment"


class CategoryBase(BaseModel):
    """Schema cơ sở chứa thuộc tính chung của danh mục."""

    name: str = Field(..., max_length=100)
    parent_id: UUID | None = None
    type: CategoryType = CategoryType.EXPENSE
    icon: str | None = Field(None, max_length=50)
    color: str | None = Field(None, max_length=20)
    description: str | None = None


class CategoryCreate(CategoryBase):
    """Schema tạo mới danh mục."""

    pass


class CategoryUpdate(BaseModel):
    """Schema cập nhật thông tin danh mục."""

    name: str | None = Field(None, max_length=100)
    parent_id: UUID | None = None
    type: CategoryType | None = None
    icon: str | None = Field(None, max_length=50)
    color: str | None = Field(None, max_length=20)
    description: str | None = None


class CategoryResponse(CategoryBase):
    """Schema phản hồi thông tin danh mục."""

    id: UUID
    user_id: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryTreeResponse(CategoryResponse):
    """Schema phản hồi thông tin danh mục theo dạng cây phân cấp Cha - Con."""

    children: list["CategoryTreeResponse"] = []
