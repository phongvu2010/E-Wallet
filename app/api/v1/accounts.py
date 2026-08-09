from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.security import CurrentUser
from app.crud.crud_account import crud_account
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse

router = APIRouter(prefix="/accounts", tags=["Accounts"])

@router.get("", response_model=list[AccountResponse])
async def get_accounts(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """Lấy danh sách tất cả các tài khoản của người dùng hiện tại."""
    return await crud_account.get_multi_by_user(db, user_id=user.id)

@router.get("/{account_id}", response_model=AccountResponse)
async def get_account_by_id(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """Lấy thông tin chi tiết một tài khoản theo ID."""
    account = await crud_account.get_by_id(db, account_id=account_id, user_id=user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản không tồn tại hoặc không thuộc quyền sở hữu của bạn"
        )

    return account

@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_in: AccountCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """Tạo một tài khoản thanh toán / thẻ mới."""
    return await crud_account.create(db, account_in=account_in, user_id=user.id)

@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: UUID,
    account_in: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """Cập nhật thông tin một tài khoản."""
    account = await crud_account.get_by_id(db, account_id=account_id, user_id=user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản không tồn tại hoặc không thuộc quyền sở hữu của bạn"
        )

    return await crud_account.update(db, db_account=account, account_in=account_in)

@router.delete("/{account_id}", response_model=AccountResponse)
async def delete_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """Xóa một tài khoản."""
    account = await crud_account.get_by_id(db, account_id=account_id, user_id=user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản không tồn tại hoặc không thuộc quyền sở hữu của bạn"
        )

    return await crud_account.delete(db, db_account=account)
