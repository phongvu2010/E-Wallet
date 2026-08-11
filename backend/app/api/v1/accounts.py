from typing import Any, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.exceptions import handle_db_integrity_error
from app.core.security import CurrentUser
from app.crud.crud_account import crud_account
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("", response_model=PaginatedResponse[AccountResponse])
async def get_accounts(
    skip: int = Query(0, ge=0, description="Số bản ghi bỏ qua (offset)"),
    limit: int = Query(100, ge=1, le=200, description="Số bản ghi tối đa (limit)"),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> PaginatedResponse[AccountResponse]:
    """Lấy danh sách tất cả các tài khoản thanh toán / thẻ thuộc sở hữu của người dùng hiện tại (có phân trang).

    Args:
        skip (int): Số bản ghi bỏ qua (offset).
        limit (int): Số bản ghi tối đa (limit).
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        PaginatedResponse[AccountResponse]: Danh sách các tài khoản của người dùng kèm metadata phân trang.
    """
    items, total = await crud_account.get_multi_by_user(
        db, user_id=user.id, skip=skip, limit=limit
    )
    return PaginatedResponse.create(items=items, total=total, skip=skip, limit=limit)


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account_by_id(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> AccountResponse:
    """Lấy thông tin chi tiết của một tài khoản theo ID.

    Args:
        account_id (UUID): ID tài khoản cần truy vấn.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        AccountResponse: Đối tượng thông tin tài khoản.

    Raises:
        HTTPException: Trả về lỗi 404 nếu tài khoản không tồn tại hoặc không thuộc sở hữu.
    """
    account = await crud_account.get_by_id(db, account_id=account_id, user_id=user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản không tồn tại hoặc không thuộc quyền sở hữu của bạn.",
        )
    return account


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_in: AccountCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> AccountResponse:
    """Tạo mới một tài khoản thanh toán hoặc thẻ tín dụng/ví điện tử cho người dùng.

    Args:
        account_in (AccountCreate): Schema chứa dữ liệu khởi tạo tài khoản.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        AccountResponse: Đối tượng tài khoản vừa được khởi tạo thành công.
    """
    try:
        return await crud_account.create_by_user(
            db, account_in=account_in, user_id=user.id
        )
    except IntegrityError as e:
        raise handle_db_integrity_error(e)


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: UUID,
    account_in: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> AccountResponse:
    """Cập nhật thông tin của một tài khoản hiện có.

    Args:
        account_id (UUID): ID tài khoản cần cập nhật.
        account_in (AccountUpdate): Dữ liệu cập nhật tài khoản.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        AccountResponse: Đối tượng tài khoản sau khi cập nhật.

    Raises:
        HTTPException: Trả về lỗi 404 nếu tài khoản không tồn tại hoặc không thuộc sở hữu.
        HTTPException: Trả về lỗi 400 nếu dữ liệu cập nhật không hợp lệ.
    """
    account = await crud_account.get_by_id(db, account_id=account_id, user_id=user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản không tồn tại hoặc không thuộc quyền sở hữu của bạn.",
        )
    try:
        return await crud_account.update(db, db_obj=account, obj_in=account_in)
    except IntegrityError as e:
        raise handle_db_integrity_error(e)


@router.delete("/{account_id}", response_model=AccountResponse)
async def delete_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> AccountResponse:
    """Xóa một tài khoản theo ID.

    Args:
        account_id (UUID): ID tài khoản cần xóa.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        AccountResponse: Đối tượng tài khoản vừa bị xóa.

    Raises:
        HTTPException: Trả về lỗi 404 nếu tài khoản không tồn tại hoặc không thuộc sở hữu.
    """
    account = await crud_account.get_by_id(db, account_id=account_id, user_id=user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản không tồn tại hoặc không thuộc quyền sở hữu của bạn.",
        )
    try:
        return await crud_account.delete(db, db_obj=account)
    except IntegrityError as e:
        raise handle_db_integrity_error(e)


@router.post("/{account_id}/recalculate-balance", response_model=dict[str, Any])
async def recalculate_account_balance(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    """Tính toán lại và đồng bộ số dư tài khoản từ toàn bộ lịch sử giao dịch.

    Args:
        account_id (UUID): ID tài khoản cần tính lại số dư.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        dict[str, Any]: Kết quả tính toán lại số dư tài khoản.

    Raises:
        HTTPException: Trả về lỗi 404 nếu tài khoản không tồn tại hoặc không thuộc sở hữu.
    """
    account = await crud_account.get_by_id(db, account_id=account_id, user_id=user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản không tồn tại hoặc không thuộc quyền sở hữu của bạn.",
        )

    previous_balance = account.current_balance
    try:
        new_balance = await crud_account.recalculate_balance(
            db, account_id=account_id, user_id=user.id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tính toán lại số dư: {str(e)}",
        )

    return {
        "account_id": str(account_id),
        "account_name": account.account_name,
        "previous_balance": previous_balance,
        "recalculated_balance": new_balance,
        "message": "Đã tính toán và đồng bộ lại số dư tài khoản thành công.",
    }
