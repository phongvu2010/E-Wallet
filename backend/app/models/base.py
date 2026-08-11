from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Lớp cơ sở cho toàn bộ các ORM models trong ứng dụng."""

    pass


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
