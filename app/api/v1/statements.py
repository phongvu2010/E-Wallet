from typing import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.crud.crud_statement import crud_statement
from app.schemas.statement import StatementCreate, StatementResponse, StatementUpdate

router = APIRouter(prefix="/statements", tags=["Statements"])


@router.get("", response_model=list[StatementResponse])
async def get_statements(
    db: AsyncSession = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> Sequence[StatementResponse]:
    """Lấy danh sách các kỳ sao kê thẻ tín dụng của người dùng.

    Args:
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        Sequence[StatementResponse]: Danh sách bản ghi sao kê thẻ tín dụng.
    """
    return await crud_statement.get_multi_by_user(db, user_id=user.id)


@router.get("/{statement_id}", response_model=StatementResponse)
async def get_statement_by_id(
    statement_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> StatementResponse:
    """Lấy thông tin chi tiết của một kỳ sao kê theo ID.

    Args:
        statement_id (UUID): ID sao kê cần truy vấn.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        StatementResponse: Đối tượng thông tin sao kê.

    Raises:
        HTTPException: Trả về lỗi 404 nếu kỳ sao kê không tồn tại hoặc không thuộc sở hữu.
    """
    statement = await crud_statement.get_by_id(
        db, statement_id=statement_id, user_id=user.id
    )
    if not statement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kỳ sao kê không tồn tại hoặc không thuộc quyền sở hữu.",
        )
    return statement


@router.post("", response_model=StatementResponse, status_code=status.HTTP_201_CREATED)
async def create_statement(
    statement_in: StatementCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> StatementResponse:
    """Tạo mới một kỳ sao kê thẻ tín dụng cho người dùng.

    Args:
        statement_in (StatementCreate): Schema chứa dữ liệu khởi tạo sao kê.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        StatementResponse: Đối tượng sao kê vừa được tạo.
    """
    return await crud_statement.create_by_user(
        db, statement_in=statement_in, user_id=user.id
    )


@router.put("/{statement_id}", response_model=StatementResponse)
async def update_statement(
    statement_id: UUID,
    statement_in: StatementUpdate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> StatementResponse:
    """Cập nhật thông tin một kỳ sao kê thẻ tín dụng.

    Args:
        statement_id (UUID): ID sao kê cần cập nhật.
        statement_in (StatementUpdate): Dữ liệu cập nhật sao kê.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        StatementResponse: Đối tượng sao kê sau khi cập nhật.

    Raises:
        HTTPException: Trả về lỗi 404 nếu kỳ sao kê không tồn tại hoặc không thuộc sở hữu.
    """
    statement = await crud_statement.get_by_id(
        db, statement_id=statement_id, user_id=user.id
    )
    if not statement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kỳ sao kê không tồn tại hoặc không thuộc quyền sở hữu.",
        )
    return await crud_statement.update(db, db_obj=statement, obj_in=statement_in)


@router.delete("/{statement_id}", response_model=StatementResponse)
async def delete_statement(
    statement_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> StatementResponse:
    """Xóa một kỳ sao kê thẻ tín dụng.

    Args:
        statement_id (UUID): ID sao kê cần xóa.
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
        user (CurrentUser): Thông tin người dùng hiện tại đã xác thực.

    Returns:
        StatementResponse: Đối tượng sao kê vừa bị xóa.

    Raises:
        HTTPException: Trả về lỗi 404 nếu kỳ sao kê không tồn tại hoặc không thuộc sở hữu.
    """
    statement = await crud_statement.get_by_id(
        db, statement_id=statement_id, user_id=user.id
    )
    if not statement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kỳ sao kê không tồn tại hoặc không thuộc quyền sở hữu.",
        )
    return await crud_statement.delete(db, db_obj=statement)
