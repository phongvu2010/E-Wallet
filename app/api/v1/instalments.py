from typing import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.crud.crud_instalment import crud_instalment
from app.schemas.instalment import (
    InstalmentCreate,
    InstalmentResponse,
    InstalmentUpdate,
)

router = APIRouter(prefix="/instalments", tags=["Instalments"])


@router.get("", response_model=list[InstalmentResponse])
async def get_instalments(
    db: AsyncSession = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> Sequence[InstalmentResponse]:
    """Lấy danh sách tất cả các khoản giao dịch trả góp của người dùng.

    Args:
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        Sequence[InstalmentResponse]: Danh sách khoản giao dịch trả góp.
    """
    return await crud_instalment.get_multi_by_user(db, user_id=user.id)


@router.get("/{instalment_id}", response_model=InstalmentResponse)
async def get_instalment_by_id(
    instalment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> InstalmentResponse:
    """Lấy thông tin chi tiết một khoản trả góp theo ID.

    Args:
        instalment_id (UUID): ID khoản trả góp cần truy vấn.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        InstalmentResponse: Đối tượng thông tin khoản trả góp.

    Raises:
        HTTPException: Trả về lỗi 404 nếu khoản trả góp không tồn tại hoặc không thuộc sở hữu.
    """
    instalment = await crud_instalment.get_by_id(
        db, instalment_id=instalment_id, user_id=user.id
    )
    if not instalment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chương trình trả góp không tồn tại hoặc không thuộc quyền sở hữu.",
        )
    return instalment


@router.post("", response_model=InstalmentResponse, status_code=status.HTTP_201_CREATED)
async def create_instalment(
    instalment_in: InstalmentCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> InstalmentResponse:
    """Tạo mới khoản giao dịch trả góp (DB Trigger sẽ tự động tính số tiền trả hàng tháng).

    Args:
        instalment_in (InstalmentCreate): Schema thông tin khoản trả góp.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        InstalmentResponse: Đối tượng khoản trả góp vừa được tạo.
    """
    return await crud_instalment.create_by_user(
        db, instalment_in=instalment_in, user_id=user.id
    )


@router.put("/{instalment_id}", response_model=InstalmentResponse)
async def update_instalment(
    instalment_id: UUID,
    instalment_in: InstalmentUpdate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> InstalmentResponse:
    """Cập nhật thông tin khoản giao dịch trả góp.

    Args:
        instalment_id (UUID): ID khoản trả góp cần cập nhật.
        instalment_in (InstalmentUpdate): Dữ liệu cập nhật khoản trả góp.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        InstalmentResponse: Đối tượng khoản trả góp sau khi cập nhật.

    Raises:
        HTTPException: Trả về lỗi 404 nếu khoản trả góp không tồn tại hoặc không thuộc sở hữu.
    """
    instalment = await crud_instalment.get_by_id(
        db, instalment_id=instalment_id, user_id=user.id
    )
    if not instalment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chương trình trả góp không tồn tại hoặc không thuộc quyền sở hữu.",
        )
    return await crud_instalment.update(db, db_obj=instalment, obj_in=instalment_in)


@router.delete("/{instalment_id}", response_model=InstalmentResponse)
async def delete_instalment(
    instalment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> InstalmentResponse:
    """Xóa một khoản giao dịch trả góp.

    Args:
        instalment_id (UUID): ID khoản trả góp cần xóa.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        InstalmentResponse: Đối tượng khoản trả góp vừa bị xóa.

    Raises:
        HTTPException: Trả về lỗi 404 nếu khoản trả góp không tồn tại hoặc không thuộc sở hữu.
    """
    instalment = await crud_instalment.get_by_id(
        db, instalment_id=instalment_id, user_id=user.id
    )
    if not instalment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chương trình trả góp không tồn tại hoặc không thuộc quyền sở hữu.",
        )
    return await crud_instalment.delete(db, db_obj=instalment)
