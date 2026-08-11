import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Category(Base, TimestampMixin):
    """Bảng lưu trữ thông tin danh mục thu chi tài chính của người dùng.

    Attributes:
        id (uuid.UUID): Định danh danh mục.
        user_id (uuid.UUID | None): ID của người dùng (hoặc None cho danh mục mặc định của hệ thống).
        parent_id (uuid.UUID | None): ID của danh mục cha (nếu là danh mục con).
        name (str): Tên danh mục.
        type (str): Loại danh mục (expense - chi phí, income - thu nhập).
        icon (str | None): Mã/Tên biểu tượng đại diện.
        color (str | None): Mã màu HEX biểu diễn danh mục.
        description (str | None): Mô tả chi tiết.
        parent (Category): Quan hệ tham chiếu tới danh mục cha.
    """

    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "parent_id", "name", name="unique_category_per_parent"
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=True,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.categories.id", ondelete="CASCADE"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(20), default="expense")
    icon: Mapped[str | None] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text)

    # Quan hệ tự tham chiếu (Self-referencing relationship)
    parent = relationship("Category", remote_side=[id], backref="children")
