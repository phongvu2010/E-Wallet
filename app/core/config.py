import json
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Cấu hình hệ thống cho ứng dụng Quản lý Tài chính (FastAPI Backend).

    Attributes:
        PROJECT_NAME (str): Tên của dự án/ứng dụng.
        API_V1_STR (str): Tiền tố đường dẫn cho các API phiên bản 1.
        ENVIRONMENT (str): Môi trường thực thi (development, staging, production).
        DATABASE_URL (str): Chuỗi kết nối cơ sở dữ liệu (PostgreSQL/Supabase).
        SUPABASE_JWT_SECRET (str): Mã bí mật để giải mã và xác thực JWT token từ Supabase.
        ALGORITHM (str): Thuật toán mã hóa JWT.
        BACKEND_CORS_ORIGINS (list[str]): Danh sách các domain được phép truy cập CORS.
    """

    PROJECT_NAME: str = "Personal Finance API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str
    SUPABASE_JWT_SECRET: str
    ALGORITHM: str = "HS256"
    BACKEND_CORS_ORIGINS: list[str] = ["*"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        """Tự động phân tích danh sách miền CORS từ chuỗi JSON hoặc chuỗi phân cách bởi dấu phẩy.

        Args:
            v (Any): Giá trị đầu vào từ biến môi trường.

        Returns:
            list[str]: Danh sách các nguồn (origins) hợp lệ.
        """
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        elif isinstance(v, list):
            return v
        return ["*"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings: Settings = Settings()

