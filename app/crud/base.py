from typing import Any, Generic, Sequence, TypeVar
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Lớp CRUD cơ sở trừu tượng cung cấp các thao tác cơ bản (Create, Read, Update, Delete).

    Attributes:
        model (type[ModelType]): ORM Model tương ứng.
    """

    def __init__(self, model: type[ModelType]):
        """Khởi tạo CRUDBase với SQLAlchemy Model.

        Args:
            model (type[ModelType]): Lớp SQLAlchemy model.
        """
        self.model = model

    async def get_by_id(self, db: AsyncSession, id: UUID) -> ModelType | None:
        """Lấy một bản ghi theo ID duy nhất.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            id (UUID): Định danh duy nhất của bản ghi.

        Returns:
            ModelType | None: Đối tượng bản ghi nếu tìm thấy, ngược lại trả về None.
        """
        stmt = select(self.model).where(self.model.id == id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> Sequence[ModelType]:
        """Lấy danh sách bản ghi có phân trang.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            skip (int): Số lượng bản ghi bỏ qua (offset).
            limit (int): Số lượng bản ghi tối đa lấy về (limit).

        Returns:
            Sequence[ModelType]: Danh sách các bản ghi.
        """
        stmt = select(self.model).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: CreateSchemaType,
        extra_data: dict[str, Any] | None = None,
    ) -> ModelType:
        """Tạo một bản ghi mới trong cơ sở dữ liệu.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            obj_in (CreateSchemaType): Dữ liệu đầu vào từ Pydantic schema.
            extra_data (dict[str, Any] | None): Dữ liệu bổ sung (ví dụ: user_id).

        Returns:
            ModelType: Đối tượng bản ghi vừa tạo.
        """
        obj_in_data = obj_in.model_dump()
        if extra_data:
            obj_in_data.update(extra_data)
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: UpdateSchemaType | dict[str, Any],
    ) -> ModelType:
        """Cập nhật bản ghi sẵn có trong cơ sở dữ liệu.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            db_obj (ModelType): Đối tượng bản ghi ORM hiện tại.
            obj_in (UpdateSchemaType | dict[str, Any]): Dữ liệu cập nhật.

        Returns:
            ModelType: Đối tượng bản ghi sau khi cập nhật.
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, *, db_obj: ModelType) -> ModelType:
        """Xóa bản ghi khỏi cơ sở dữ liệu.

        Args:
            db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.
            db_obj (ModelType): Đối tượng bản ghi ORM cần xóa.

        Returns:
            ModelType: Đối tượng bản ghi đã xóa.
        """
        await db.delete(db_obj)
        await db.commit()
        return db_obj
