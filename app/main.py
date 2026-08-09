from contextlib import asynccontextmanager
from typing import AsyncGenerator, Callable

from fastapi import Depends, FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Quản lý vòng đời ứng dụng FastAPI (startup và shutdown)."""
    # Startup actions (if any)
    yield
    # Shutdown actions: Giải phóng connection pool của Database engine
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


@app.middleware("http")
async def add_security_headers(
    request: Request, call_next: Callable[[Request], Response]
) -> Response:
    """Middleware tự động chèn các HTTP Security Headers vào mọi HTTP response.

    Args:
        request (Request): Yêu cầu HTTP đầu vào.
        call_next (Callable[[Request], Response]): Hàm chuyển tiếp xử lý request tiếp theo.

    Returns:
        Response: Phản hồi HTTP đã được bổ sung các header bảo mật.
    """
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


# Cấu hình CORS Middleware an toàn
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["Content-Type", "Authorization"],
    )

# Mount API Routers phiên bản 1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health Check"])
async def root() -> dict[str, str]:
    """Endpoint gốc kiểm tra trạng thái khởi động ứng dụng.

    Returns:
        dict[str, str]: Thông tin trạng thái phản hồi của hệ thống.
    """
    return {
        "message": f"{settings.PROJECT_NAME} is running...",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health Check"])
async def health_check(db: AsyncSession = Depends(get_db)) -> JSONResponse:
    """Endpoint kiểm tra sức khỏe hệ thống và kết nối cơ sở dữ liệu.

    Args:
        db (AsyncSession): Session cơ sở dữ liệu bất đồng bộ.

    Returns:
        JSONResponse: Trạng thái dịch vụ và kết nối cơ sở dữ liệu.
    """
    try:
        await db.execute(select(1))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "ok", "database": "connected"},
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "error", "database": f"unreachable: {str(e)}"},
        )
