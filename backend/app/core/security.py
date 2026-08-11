import asyncio
import logging
import time
from typing import Any
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from pydantic import BaseModel, ConfigDict

from app.core.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=True)


class CurrentUser(BaseModel):
    """Mô hình dữ liệu người dùng hiện tại trích xuất từ JWT token.

    Attributes:
        id (UUID): Định danh duy nhất (UUID) của người dùng.
        email (str | None): Địa chỉ email của người dùng (nếu có).
    """

    id: UUID
    email: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SupabaseJWKSClient:
    """Client bất đồng bộ tải và lưu bộ đệm (cache) danh sách khóa công khai JWKS từ Supabase."""

    def __init__(self, cache_ttl: int = 3600):
        self.cache_ttl = cache_ttl
        self._keys: dict[str, dict[str, Any]] = {}
        self._last_fetched: float = 0
        self._lock = asyncio.Lock()
        self._client: httpx.AsyncClient | None = None

    async def get_client(self) -> httpx.AsyncClient:
        """Lấy hoặc khởi tạo HTTP client bất đồng bộ dùng chung."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=10.0)

        return self._client

    async def close(self) -> None:
        """Giải phóng và đóng kết nối HTTP client khi ứng dụng shutdown."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def get_key_by_kid(self, kid: str) -> dict[str, Any] | None:
        """Lấy Public Key theo Key ID (kid) từ cache hoặc tải mới từ Supabase.

        Sử dụng Double-Checked Locking pattern và asyncio.Lock để đảm bảo an toàn
        khi xử lý bất đồng bộ (tránh Race Condition / Thundering Herd).

        Args:
            kid (str): ID khóa công khai.

        Returns:
            dict[str, Any] | None: Cấu trúc dữ liệu JWK key hoặc None nếu không tìm thấy.
        """
        now = time.time()
        jwks_url = settings.jwks_url

        if not jwks_url:
            return None

        # Kiểm tra nhanh từ cache không cần lock (Fast Path)
        if kid in self._keys and (now - self._last_fetched) <= self.cache_ttl:
            return self._keys.get(kid)

        # Sử dụng lock để chỉ cho phép 1 coroutine duy nhất gửi HTTP request
        async with self._lock:
            # Re-check sau khi lấy được lock
            now = time.time()
            if kid in self._keys and (now - self._last_fetched) <= self.cache_ttl:
                return self._keys.get(kid)

            try:
                client = await self.get_client()
                response = await client.get(jwks_url)
                if response.status_code == 200:
                    jwks = response.json()
                    new_keys = {}
                    for key in jwks.get("keys", []):
                        if "kid" in key:
                            new_keys[key["kid"]] = key
                    self._keys = new_keys
                    self._last_fetched = now
                else:
                    logger.warning(
                        f"Không thể lấy khóa JWKS từ Supabase ({jwks_url}). HTTP Status Code: {response.status_code}"
                    )
            except Exception as e:
                logger.error(
                    f"Lỗi kết nối HTTP khi tải Supabase JWKS từ {jwks_url}: {str(e)}",
                    exc_info=True,
                )

        return self._keys.get(kid)


jwks_client = SupabaseJWKSClient()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """Giải mã token JWT từ Supabase và xác thực thông tin người dùng hiện tại.
    Hỗ trợ linh hoạt cả thuật toán đối xứng (HS256) và bất đối xứng (RS256 via JWKS).

    Args:
        credentials (HTTPAuthorizationCredentials): Thông tin Bearer Token từ HTTP Authorization Header.

    Returns:
        CurrentUser: Đối tượng chứa thông tin ID và email của người dùng đã xác thực.

    Raises:
        HTTPException: Trả về lỗi 401 UNAUTHORIZED nếu token không hợp lệ, hết hạn hoặc thiếu trường 'sub'.
    """
    token: str = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token xác thực không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", settings.ALGORITHM)
        kid = header.get("kid")

        payload: dict[str, Any] | None = None
        audience_option = (
            settings.SUPABASE_JWT_AUDIENCE if settings.SUPABASE_JWT_AUDIENCE else None
        )

        if alg == "RS256" or (kid and settings.jwks_url):
            if not kid:
                raise credentials_exception

            jwk_key = await jwks_client.get_key_by_kid(kid)
            if not jwk_key:
                raise credentials_exception

            payload = jwt.decode(
                token,
                jwk_key,
                algorithms=["RS256"],
                audience=audience_option,
                options={"verify_aud": bool(audience_option)},
            )
        else:
            if not settings.SUPABASE_JWT_SECRET:
                raise credentials_exception

            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[alg],
                audience=audience_option,
                options={"verify_aud": bool(audience_option)},
            )

        user_id: str | None = payload.get("sub") if payload else None
        if not user_id:
            raise credentials_exception

        return CurrentUser(id=UUID(user_id), email=payload.get("email"))
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token xác thực đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (JWTError, ValueError):
        raise credentials_exception
