from typing import Sequence
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryTreeResponse, CategoryUpdate


class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    """Lớp quản lý các thao tác CRUD dành riêng cho Category model."""

    def __init__(self):
        super().__init__(Category)

    async def get_multi_by_user(
        self, db: AsyncSession, user_id: UUID, *, skip: int = 0, limit: int = 100
    ) -> tuple[Sequence[Category], int]:
        """Lấy danh mục riêng của người dùng kết hợp danh mục mặc định của hệ thống kèm tổng số bản ghi.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            user_id (UUID): ID người dùng.
            skip (int): Số lượng bản ghi bỏ qua (offset).
            limit (int): Số lượng bản ghi tối đa (limit).

        Returns:
            tuple[Sequence[Category], int]: Danh sách các danh mục khả dụng và tổng số bản ghi.
        """
        where_clause = or_(Category.user_id == user_id, Category.user_id.is_(None))

        count_stmt = select(func.count(Category.id)).where(where_clause)
        count_res = await db.execute(count_stmt)
        total = count_res.scalar_one()

        items_stmt = (
            select(Category)
            .where(where_clause)
            .order_by(Category.name.asc())
            .offset(skip)
            .limit(limit)
        )
        items_res = await db.execute(items_stmt)
        items = items_res.scalars().all()

        return items, total

    @staticmethod
    def build_tree(categories: Sequence[Category]) -> list[CategoryTreeResponse]:
        """Chuyển đổi danh sách danh mục phẳng thành danh sách cấu trúc cây (Parent - Children).

        Args:
            categories (Sequence[Category]): Danh sách danh mục dạng phẳng.

        Returns:
            list[CategoryTreeResponse]: Danh sách các danh mục gốc kèm danh mục con.
        """
        nodes: dict[UUID, CategoryTreeResponse] = {}
        for cat in categories:
            nodes[cat.id] = CategoryTreeResponse(
                id=cat.id,
                user_id=cat.user_id,
                parent_id=cat.parent_id,
                name=cat.name,
                type=cat.type,  # type: ignore
                icon=cat.icon,
                color=cat.color,
                description=cat.description,
                created_at=cat.created_at,
                updated_at=cat.updated_at,
                children=[],
            )

        roots: list[CategoryTreeResponse] = []
        for cat in categories:
            node = nodes[cat.id]
            if cat.parent_id and cat.parent_id in nodes:
                nodes[cat.parent_id].children.append(node)
            else:
                roots.append(node)

        return roots

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
