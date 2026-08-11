from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.exceptions import handle_db_integrity_error
from app.core.security import CurrentUser
from app.crud.crud_transaction import crud_transaction
from app.schemas.common import PaginatedResponse
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionType,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=PaginatedResponse[TransactionResponse])
async def get_transactions(
    skip: int = Query(0, ge=0, description="Số bản ghi bỏ qua (offset)"),
    limit: int = Query(50, ge=1, le=200, description="Số bản ghi tối đa (limit)"),
    start_date: date | None = Query(None, description="Lọc từ ngày (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Lọc đến ngày (YYYY-MM-DD)"),
    account_id: UUID | None = Query(None, description="Lọc theo ID tài khoản"),
    category_id: UUID | None = Query(None, description="Lọc theo ID danh mục"),
    type: TransactionType | None = Query(None, description="Lọc theo loại giao dịch"),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> PaginatedResponse[TransactionResponse]:
    """Lấy danh sách các giao dịch tài chính của người dùng (hỗ trợ lọc đa điều kiện & phân trang đầy đủ).

    Args:
        skip (int): Số lượng bản ghi bỏ qua (offset).
        limit (int): Số lượng bản ghi tối đa lấy về (limit).
        start_date (date | None): Lọc từ ngày.
        end_date (date | None): Lọc đến ngày.
        account_id (UUID | None): Lọc theo ID tài khoản.
        category_id (UUID | None): Lọc theo ID danh mục.
        type (TransactionType | None): Lọc theo loại giao dịch.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        PaginatedResponse[TransactionResponse]: Danh sách giao dịch cùng các thuộc tính metadata phân trang.
    """
    items, total = await crud_transaction.get_multi_by_user(
        db,
        user_id=user.id,
        skip=skip,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
        account_id=account_id,
        category_id=category_id,
        type=type,
    )
    return PaginatedResponse.create(items=items, total=total, skip=skip, limit=limit)


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

    Raises:
        HTTPException: Trả về lỗi 400 nếu dữ liệu tham chiếu hoặc ràng buộc không hợp lệ.
    """
    try:
        return await crud_transaction.create_by_user(
            db, transaction_in=transaction_in, user_id=user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except IntegrityError as e:
        raise handle_db_integrity_error(e)


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
        HTTPException: Trả về lỗi 400 nếu dữ liệu tham chiếu hoặc quy tắc nghiệp vụ không hợp lệ.
    """
    transaction = await crud_transaction.get_by_id(
        db, transaction_id=transaction_id, user_id=user.id
    )
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Giao dịch không tồn tại hoặc không thuộc quyền sở hữu của bạn.",
        )
    try:
        return await crud_transaction.update_by_user(
            db, db_obj=transaction, transaction_in=transaction_in, user_id=user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except IntegrityError as e:
        raise handle_db_integrity_error(e)


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

    try:
        return await crud_transaction.delete(db, db_obj=transaction)
    except IntegrityError as e:
        raise handle_db_integrity_error(e)
