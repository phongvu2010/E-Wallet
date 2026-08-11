"""Mô-đun tổng hợp và định tuyến tất cả các API endpoints phiên bản 1 (v1)."""

from fastapi import APIRouter

from app.api.v1.accounts import router as accounts_router
from app.api.v1.categories import router as categories_router
from app.api.v1.instalments import router as instalments_router
from app.api.v1.statements import router as statements_router
from app.api.v1.transactions import router as transactions_router

api_router = APIRouter()
api_router.include_router(accounts_router)
api_router.include_router(categories_router)
api_router.include_router(statements_router)
api_router.include_router(instalments_router)
api_router.include_router(transactions_router)
