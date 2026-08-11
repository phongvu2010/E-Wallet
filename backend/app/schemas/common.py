import math
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Schema cấu trúc phản hồi danh sách có thông tin phân trang (Pagination Metadata).

    Attributes:
        items (list[T]): Danh sách dữ liệu của trang hiện tại.
        total (int): Tổng số bản ghi thỏa mãn điều kiện lọc.
        page (int): Số trang hiện tại (bắt đầu từ 1).
        size (int): Số lượng bản ghi trên một trang (limit).
        pages (int): Tổng số trang.
    """

    items: list[T]
    total: int = Field(..., ge=0, description="Tổng số bản ghi thỏa mãn điều kiện lọc")
    page: int = Field(..., ge=1, description="Trang hiện tại (1-indexed)")
    size: int = Field(..., ge=1, description="Số bản ghi tối đa trên mỗi trang")
    pages: int = Field(..., ge=0, description="Tổng số trang")

    @classmethod
    def create(
        cls, items: list[T] | tuple[T, ...] | list, total: int, skip: int, limit: int
    ) -> "PaginatedResponse[T]":
        """Hàm khởi tạo nhanh đối tượng PaginatedResponse từ thông tin skip/limit.

        Args:
            items: Danh sách các bản ghi của trang hiện tại.
            total (int): Tổng số bản ghi.
            skip (int): Số bản ghi đã bỏ qua (offset).
            limit (int): Kích thước trang (limit).

        Returns:
            PaginatedResponse[T]: Đối tượng chứa dữ liệu và thông tin phân trang.
        """
        page = (skip // limit) + 1 if limit > 0 else 1
        pages = math.ceil(total / limit) if limit > 0 and total > 0 else 0
        return cls(
            items=list(items),
            total=total,
            page=page,
            size=limit,
            pages=pages,
        )
