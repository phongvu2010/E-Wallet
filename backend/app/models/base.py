from datetime import datetime

from sqlalchemy import Column, DateTime, Table, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Lớp cơ sở cho toàn bộ các ORM models trong ứng dụng."""

    pass


# Đăng ký bảng tham chiếu ngoại auth.users từ Supabase Auth trong Base.metadata
# để ngăn lỗi NoReferencedTableError khi SQLAlchemy sắp xếp phụ thuộc bảng
Table(
    "users",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    schema="auth",
)


class TimestampMixin:
    """Mixin cung cấp hai thuộc tính thời gian created_at và updated_at cho các bảng dữ liệu.

    Attributes:
        created_at (datetime): Thời điểm bản ghi được tạo ra trong cơ sở dữ liệu.
        updated_at (datetime): Thời điểm bản ghi được cập nhật lần cuối.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
