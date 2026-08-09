from typing import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.crud.crud_transaction import crud_transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=list[TransactionResponse])
async def get_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Sequence[TransactionResponse]:
    """Lấy danh sách các giao dịch tài chính của người dùng (có hỗ trợ phân trang).

    Args:
        skip (int): Số lượng bản ghi bỏ qua (offset).
        limit (int): Số lượng bản ghi tối đa lấy về (limit).
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        Sequence[TransactionResponse]: Danh sách giao dịch tài chính.
    """
    return await crud_transaction.get_multi_by_user(
        db, user_id=user.id, skip=skip, limit=limit
    )


@router.post(
    "", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED
)
async def create_transaction(
    transaction_in: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> TransactionResponse:
    """Tạo mới một giao dịch tài chính (DB Trigger sẽ tự động cập nhật số dư tài khoản).

    Args:
        transaction_in (TransactionCreate): Schema thông tin giao dịch cần khởi tạo.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        TransactionResponse: Đối tượng giao dịch tài chính vừa được tạo.
    """
    return await crud_transaction.create_by_user(
        db, transaction_in=transaction_in, user_id=user.id
    )


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    transaction_in: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> TransactionResponse:
    """Cập nhật thông tin giao dịch tài chính hiện có.

    Args:
        transaction_id (UUID): ID giao dịch cần cập nhật.
        transaction_in (TransactionUpdate): Dữ liệu cập nhật giao dịch.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        TransactionResponse: Đối tượng giao dịch tài chính sau khi cập nhật.

    Raises:
        HTTPException: Trả về lỗi 404 nếu giao dịch không tồn tại hoặc không thuộc sở hữu.
    """
    transaction = await crud_transaction.get_by_id(
        db, transaction_id=transaction_id, user_id=user.id
    )
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Giao dịch không tồn tại hoặc không thuộc quyền sở hữu của bạn.",
        )
    return await crud_transaction.update(db, db_obj=transaction, obj_in=transaction_in)


@router.delete("/{transaction_id}", response_model=TransactionResponse)
async def delete_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> TransactionResponse:
    """Xóa một giao dịch tài chính (DB Trigger sẽ tự động hoàn lại số dư tài khoản).

    Args:
        transaction_id (UUID): ID giao dịch cần xóa.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        TransactionResponse: Đối tượng giao dịch vừa bị xóa.

    Raises:
        HTTPException: Trả về lỗi 404 nếu giao dịch không tồn tại hoặc không thuộc sở hữu.
    """
    transaction = await crud_transaction.get_by_id(
        db, transaction_id=transaction_id, user_id=user.id
    )
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Giao dịch không tồn tại hoặc không thuộc quyền sở hữu của bạn.",
        )
    return await crud_transaction.delete(db, db_obj=transaction)
