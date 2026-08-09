from typing import Sequence
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    """Lớp quản lý các thao tác CRUD dành riêng cho Category model."""

    def __init__(self):
        super().__init__(Category)

    async def get_multi_by_user(
        self, db: AsyncSession, user_id: UUID
    ) -> Sequence[Category]:
        """Lấy danh mục riêng của người dùng kết hợp danh mục mặc định của hệ thống.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            user_id (UUID): ID người dùng.

        Returns:
            Sequence[Category]: Danh sách các danh mục khả dụng.
        """
        stmt = (
            select(Category)
            .where(or_(Category.user_id == user_id, Category.user_id.is_(None)))
            .order_by(Category.name.asc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_by_id(
        self, db: AsyncSession, category_id: UUID, user_id: UUID
    ) -> Category | None:
        """Lấy thông tin danh mục theo ID nếu thuộc về người dùng hoặc là danh mục hệ thống.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            category_id (UUID): ID danh mục.
            user_id (UUID): ID người dùng.

        Returns:
            Category | None: Đối tượng danh mục hoặc None nếu không tìm thấy.
        """
        stmt = select(Category).where(
            Category.id == category_id,
            or_(Category.user_id == user_id, Category.user_id.is_(None)),
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_by_user(
        self, db: AsyncSession, category_in: CategoryCreate, user_id: UUID
    ) -> Category:
        """Tạo danh mục mới cho người dùng.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            category_in (CategoryCreate): Schema dữ liệu danh mục mới.
            user_id (UUID): ID người dùng tạo.

        Returns:
            Category: Đối tượng danh mục vừa tạo.
        """
        return await self.create(
            db, obj_in=category_in, extra_data={"user_id": user_id}
        )


crud_category = CRUDCategory()
