from uuid import UUID
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate

class CRUDAccount:
    async def get_multi_by_user(self, db: AsyncSession, user_id: UUID) -> Sequence[Account]:
        stmt = select(Account).where(Account.user_id == user_id).order_by(Account.created_at.desc())
        result = await db.execute(stmt)

        return result.scalars().all()

    async def get_by_id(self, db: AsyncSession, account_id: UUID, user_id: UUID) -> Account | None:
        stmt = select(Account).where(Account.id == account_id, Account.user_id == user_id)
        result = await db.execute(stmt)

        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, account_in: AccountCreate, user_id: UUID) -> Account:
        db_account = Account(
            **account_in.model_dump(),
            user_id=user_id
        )
        db.add(db_account)
        await db.commit()
        await db.refresh(db_account)

        return db_account

    async def update(self, db: AsyncSession, db_account: Account, account_in: AccountUpdate) -> Account:
        update_data = account_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_account, field, value)

        await db.commit()
        await db.refresh(db_account)

        return db_account

    async def delete(self, db: AsyncSession, db_account: Account) -> Account:
        await db.delete(db_account)
        await db.commit()

        return db_account

crud_account = CRUDAccount()
