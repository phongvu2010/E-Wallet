# 💳 Personal Finance Management API (E-Wallet & Thẻ Tín Dụng)

Dự án Backend RESTful API hiện đại giúp quản lý tài chính cá nhân đa tài khoản (Ví điện tử, Tài khoản ngân hàng, Tiền mặt, Thẻ tín dụng và Các khoản trả góp). Được xây dựng bằng **FastAPI**, **PostgreSQL (Supabase)**, **SQLAlchemy 2.0 Async**, và **Docker**.

---

## 🌟 Tính Năng Nổi Bật

- **Quản lý Đa Tài Khoản & Đa Tiền Tệ**: Hỗ trợ Tài khoản thanh toán (Checking Account), Thẻ tín dụng (Credit Card), Ví điện tử (E-Wallet), Tiền mặt (Cash), và Sổ tiết kiệm (Savings).
- **Quản lý Thẻ Tín Dụng & Trả Góp**: Theo dõi các kỳ sao kê hàng tháng, hạn mức tín dụng, dư nợ tối thiểu, khoản thưởng và danh sách các chương trình trả góp.
- **Hệ Thống Giao Dịch Đa Dạng**: Xử lý giao dịch thu (Income), chi (Expense), chuyển tiền giữa các tài khoản (Transfer) và thanh toán kỳ trả góp (Instalment).
- **Tự Động Cập Nhật Số Dư (DB Triggers)**: Số dư tài khoản (`current_balance`) được tính toán tự động và chính xác tại tầng PostgreSQL ngay khi Thêm / Sửa / Xóa giao dịch. Bổ sung Stored Procedure `recalculate_account_balance` để đồng bộ lại lịch sử dữ liệu khi cần.
- **Bảo Mật Cross-Tenant Nâng Cao**: Sử dụng Composite Foreign Keys `(account_id, user_id)` kết hợp với Supabase Row Level Security (RLS) giúp ngăn chặn rò rỉ dữ liệu giữa các người dùng.
- **Xác Thực Đăng Nhập (Authentication)**: Xác thực JWT Bearer Token tích hợp trực tiếp với Supabase Auth (Hỗ trợ cả thuật toán HS256 Secret và RS256 JWKS Key Caching).
- **Sẵn Sàng Triển Khai (Production-Ready)**: Docker multi-stage build, container chạy bằng non-root user (`appuser`), HTTP Security Headers Middleware, CORS Security, Health Check endpoint (`/health`), và OpenAPI Document (`/docs`, `/redoc`).

---

## 🏗️ Công Nghệ Sử Dụng

- **Backend Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **Database**: [PostgreSQL](https://www.postgresql.org/) / [Supabase](https://supabase.com/)
- **ORM & Async Driver**: [SQLAlchemy 2.0 (Async)](https://docs.sqlalchemy.org/) + `asyncpg`
- **Data Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) & `pydantic-settings`
- **Auth & JWT**: `python-jose` & `httpx` (Supabase JWT Bearer Verification & JWKS Client)
- **Containerization**: Docker & Docker Compose
- **API Documentation**: Swagger UI (`/docs`) & ReDoc (`/redoc`)

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
E-Wallet/
├── backend/                     # Thư mục mã nguồn Backend
│   ├── app/                     # Ứng dụng chính FastAPI
│   │   ├── api/                 # Định tuyến API & Dependencies Injection
│   │   │   ├── deps.py          # Centralized Dependencies (get_db, get_current_user)
│   │   │   └── v1/              # API Phiên bản 1 (v1)
│   │   │       ├── router.py    # Router tổng hợp
│   │   │       ├── accounts.py  # Endpoints quản lý tài khoản
│   │   │       ├── categories.py# Endpoints quản lý danh mục thu chi
│   │   │       ├── statements.py# Endpoints quản lý sao kê thẻ tín dụng
│   │   │       ├── instalments.py# Endpoints quản lý khoản trả góp
│   │   │       └── transactions.py# Endpoints quản lý giao dịch tài chính
│   │   ├── core/                # Cấu hình cốt lõi hệ thống & Bảo mật
│   │   │   ├── config.py        # Pydantic Settings đọc biến môi trường (.env)
│   │   │   ├── database.py      # Khởi tạo SQLAlchemy Async Engine & Session
│   │   │   ├── exceptions.py    # Xử lý ngoại lệ CSDL & HTTP Status an toàn
│   │   │   └── security.py      # Giải mã & Validate Supabase JWT Token (HS256/RS256)
│   │   ├── crud/                # Data Access Layer / Business Logic
│   │   │   ├── base.py          # Generic CRUDBase class trừu tượng
│   │   │   ├── crud_account.py
│   │   │   ├── crud_category.py
│   │   │   ├── crud_instalment.py
│   │   │   ├── crud_statement.py
│   │   │   └── crud_transaction.py
│   │   ├── models/              # SQLAlchemy ORM Models
│   │   │   ├── base.py          # Declarative Base & Timestamp Mixins
│   │   │   ├── account.py
│   │   │   ├── category.py
│   │   │   ├── statement.py
│   │   │   ├── instalment.py
│   │   │   └── transaction.py
│   │   ├── schemas/             # Pydantic Schemas (Request/Response Validation)
│   │   │   ├── account.py
│   │   │   ├── category.py
│   │   │   ├── common.py        # PaginatedResponse & Common Schemas
│   │   │   ├── instalment.py
│   │   │   ├── statement.py
│   │   │   └── transaction.py
│   │   └── main.py              # FastAPI Entrypoint (Lifespan, Middleware, Cors, Health Check)
│   ├── .dockerignore
│   ├── .env.example             # Biến môi trường mẫu
│   ├── Dockerfile               # Docker build file (Multi-stage)
│   └── requirements.txt         # Thư viện phụ thuộc Python
├── .gitignore                   # Cấu hình bỏ qua tệp git
├── docker-compose.yml           # Docker Compose file
├── init_db.sql                  # Script tạo Schema, Triggers, Stored Procedures & RLS Policies
└── README.md                    # Tài liệu hướng dẫn sử dụng dự án
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu Cầu Tiền Đề
- **Python**: Phiên bản 3.12+
- **PostgreSQL**: Phiên bản 15+ (Hoặc tài khoản Supabase Project)
- **Docker & Docker Compose** (Tùy chọn nếu muốn chạy Container)

---

### 2. Cài Đặt Môi Trường Cục Bộ (Local)

1. **Clone repository**:
   ```bash
   git clone https://github.com/phongvu2010/E-Wallet.git
   cd E-Wallet
   ```

2. **Khởi tạo và kích hoạt môi trường ảo (Virtual Environment)**:
   - **Trên macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   - **Trên Windows (cmd)**:
     ```cmd
     python -m venv .venv
     .venv\Scripts\activate.bat
     ```

3. **Di chuyển vào thư mục `backend` và cài đặt các thư viện phụ thuộc**:
   ```bash
   cd backend
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Cấu hình biến môi trường (`.env`)**:
   Tạo file `.env` từ file mẫu `.env.example` trong thư mục `backend`:
   ```bash
   cp .env.example .env
   ```
   Cập nhật thông tin cấu hình trong file `.env`:
   ```env
   PROJECT_NAME="Personal Finance API"
   API_V1_STR="/api/v1"
   ENVIRONMENT="development"
   DATABASE_URL="postgresql+asyncpg://postgres:your_password@localhost:5432/postgres"
   SUPABASE_JWT_SECRET="your_supabase_jwt_secret"
   SUPABASE_JWT_AUDIENCE="authenticated"
   BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
   ```

5. **Khởi tạo Cơ sở Dữ liệu (Database Schema)**:
   Chạy tệp `init_db.sql` (nằm ở thư mục gốc của dự án) trên cơ sở dữ liệu Supabase hoặc PostgreSQL local của bạn. Tệp script này sẽ tự động khởi tạo:
   - Các bảng dữ liệu (`accounts`, `categories`, `statements`, `instalments`, `transactions`).
   - Ràng buộc khóa ngoại kết hợp Cross-Tenant.
   - Các Triggers tự động cập nhật số dư tài khoản và `updated_at`.
   - Stored Procedure `recalculate_account_balance`.
   - Cấu hình Row Level Security (RLS) Policies.

6. **Khởi chạy Server**:
   Chạy lệnh uvicorn từ thư mục `backend`:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

7. **Truy cập Tài liệu API**:
   - **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
   - **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 3. Khởi Chạy Với Docker (Full-Stack Backend + Frontend)

#### Khởi chạy bằng Docker Compose (Khuyên dùng)
Đứng tại thư mục gốc `E-Wallet` và thực thi:
```bash
docker-compose up --build -d
```

Sau khi khởi chạy thành công:
- **Frontend App (React + Nginx)**: Truy cập tại [http://localhost:3000](http://localhost:3000)
- **Backend API (FastAPI)**: Truy cập tại [http://localhost:8000](http://localhost:8000)
- **Swagger API Docs**: Truy cập tại [http://localhost:8000/docs](http://localhost:8000/docs)

#### Khởi chạy riêng lẻ từng Container bằng Docker Engine
```bash
# 1. Build & Run Backend API Container
docker build -t tai-chinh-api -f backend/Dockerfile ./backend
docker run -d --name tai_chinh_api -p 8000:8000 --env-file backend/.env tai-chinh-api

# 2. Build & Run Frontend Web Container
docker build -t tai-chinh-web -f frontend/Dockerfile ./frontend
docker run -d --name tai_chinh_web -p 3000:80 tai-chinh-web
```

---

## 🔒 Bảo Mật & An Toàn Dữ Liệu

- **Authentication**: Mọi API bảo vệ yêu cầu Header `Authorization: Bearer <JWT_TOKEN>` hợp lệ từ Supabase Auth (Hỗ trợ xác thực đối xứng HS256 hoặc lấy JWKS công khai cho RS256).
- **Cross-Tenant Data Isolation**: Ràng buộc dữ liệu ở cấp CSDL đảm bảo một người dùng không thể can thiệp hoặc liên kết giao dịch tới tài khoản/danh mục của người dùng khác.
- **HTTP Security Headers**: Tự động chèn các HTTP headers bảo mật (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`).
- **Non-root Container Execution**: Docker container thực thi dưới quyền của user thường (`appuser`), tuân thủ chuẩn DevSecOps.

---

## 📝 Giấy Phép (License)

Dự án thuộc quyền sở hữu cá nhân và được phân phối dưới giấy phép MIT.
