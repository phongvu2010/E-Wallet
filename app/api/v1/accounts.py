from typing import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.crud.crud_account import crud_account
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("", response_model=list[AccountResponse])
async def get_accounts(
    db: AsyncSession = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> Sequence[AccountResponse]:
    """Lấy danh sách tất cả các tài khoản thanh toán / thẻ thuộc sở hữu của người dùng hiện tại.

    Args:
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        Sequence[AccountResponse]: Danh sách các tài khoản của người dùng.
    """
    return await crud_account.get_multi_by_user(db, user_id=user.id)


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
    return await crud_account.create_by_user(db, account_in=account_in, user_id=user.id)


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
    """
    account = await crud_account.get_by_id(db, account_id=account_id, user_id=user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản không tồn tại hoặc không thuộc quyền sở hữu của bạn.",
        )
    return await crud_account.update(db, db_obj=account, obj_in=account_in)


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
    return await crud_account.delete(db, db_obj=account)
