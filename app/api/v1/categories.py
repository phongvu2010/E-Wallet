from typing import Any, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.crud.crud_category import crud_category
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    CategoryTreeResponse,
    CategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryTreeResponse] | list[CategoryResponse])
async def get_categories(
    as_tree: bool = Query(
        False,
        description="Nếu True, trả về cấu trúc cây phân cấp danh mục (Parent-Child).",
    ),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Any:
    """Lấy danh sách tất cả danh mục thu chi (bao gồm danh mục hệ thống + cá nhân).

    Args:
        as_tree (bool): Trả về cấu trúc dạng cây nếu True.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        Any: Danh sách danh mục thu chi dạng phẳng hoặc dạng cây phân cấp.
    """
    categories = await crud_category.get_multi_by_user(db, user_id=user.id)
    if as_tree:
        return crud_category.build_tree(categories)

    return categories


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> CategoryResponse:
    """Tạo mới danh mục thu chi cá nhân cho người dùng.

    Args:
        category_in (CategoryCreate): Schema chứa dữ liệu khởi tạo danh mục.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        CategoryResponse: Đối tượng danh mục thu chi vừa được tạo.
    """
    return await crud_category.create_by_user(
        db, category_in=category_in, user_id=user.id
    )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    category_in: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> CategoryResponse:
    """Cập nhật thông tin một danh mục thu chi cá nhân.

    Args:
        category_id (UUID): ID danh mục cần cập nhật.
        category_in (CategoryUpdate): Dữ liệu cập nhật danh mục.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        CategoryResponse: Đối tượng danh mục sau khi cập nhật.

    Raises:
        HTTPException: 404 NOT FOUND nếu không tìm thấy danh mục.
        HTTPException: 403 FORBIDDEN nếu cố gắng chỉnh sửa danh mục mặc định hệ thống.
    """
    category = await crud_category.get_by_id(
        db, category_id=category_id, user_id=user.id
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Danh mục thu chi không tồn tại.",
        )
    if category.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không thể chỉnh sửa danh mục mặc định của hệ thống.",
        )
    return await crud_category.update(db, db_obj=category, obj_in=category_in)


@router.delete("/{category_id}", response_model=CategoryResponse)
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> CategoryResponse:
    """Xóa một danh mục thu chi cá nhân.

    Args:
        category_id (UUID): ID danh mục cần xóa.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        CategoryResponse: Đối tượng danh mục vừa bị xóa.

    Raises:
        HTTPException: 404 NOT FOUND nếu không tìm thấy danh mục.
        HTTPException: 403 FORBIDDEN nếu cố gắng xóa danh mục mặc định hệ thống.
    """
    category = await crud_category.get_by_id(
        db, category_id=category_id, user_id=user.id
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Danh mục thu chi không tồn tại.",
        )
    if category.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không thể xóa danh mục mặc định của hệ thống.",
        )
    return await crud_category.delete(db, db_obj=category)
