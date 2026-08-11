"""Mô-đun quản lý và chuyển đổi các ngoại lệ CSDL thành lỗi HTTP an toàn, thân thiện."""

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError


def handle_db_integrity_error(e: IntegrityError) -> HTTPException:
    """Chuyển đổi lỗi SQLAlchemy IntegrityError thành HTTPException 400 với thông báo an toàn.

    Tránh rò rỉ các thông tin nội bộ của CSDL (tên bảng, tên cột, câu truy vấn thô).

    Args:
        e (IntegrityError): Ngoại lệ IntegrityError phát sinh từ SQLAlchemy/PostgreSQL.

    Returns:
        HTTPException: Phản hồi lỗi HTTP 400 Bad Request với nội dung tiếng Việt thân thiện.
    """
    orig_msg = str(e.orig).lower() if e.orig else ""

    if "unique" in orig_msg or "duplicate key" in orig_msg:
        detail = "Dữ liệu đã tồn tại hoặc bị trùng lặp trong hệ thống."
    elif (
        "foreign key" in orig_msg
        or "fk_" in orig_msg
        or "violates foreign key constraint" in orig_msg
    ):
        detail = "Dữ liệu tham chiếu (Tài khoản, Danh mục, Sao kê hoặc Khoản trả góp) không tồn tại hoặc không thuộc quyền sở hữu của bạn."
    elif "check" in orig_msg or "violates check constraint" in orig_msg:
        detail = "Dữ liệu nhập vào không thỏa mãn các quy tắc kiểm tra tính hợp lệ của hệ thống."
    else:
        detail = "Thao tác không thể thực hiện do dữ liệu không hợp lệ hoặc vi phạm ràng buộc hệ thống."

    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detail,
    )
