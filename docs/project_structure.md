personal-finance-backend/
├── app/
│   ├── api/                     # Endpoints Routing
│   │   ├── deps.py              # Centralized Dependencies (get_db, get_current_user)
│   │   └── v1/
│   │       ├── router.py        # Central Router gom tất cả v1 endpoints
│   │       ├── accounts.py      # Endpoints quản lý tài khoản (CRUD đầy đủ)
│   │       ├── categories.py
│   │       └── transactions.py
│   ├── core/
│   │   ├── config.py            # Cấu hình Pydantic Settings (.env)
│   │   ├── database.py          # Khởi tạo SQLAlchemy Async Engine & Session
│   │   └── security.py          # Decode & Validate JWT token từ Supabase Auth
│   ├── models/                  # SQLAlchemy Models (ánh xạ từ init_db.sql)
│   │   ├── base.py              # Declarative Base & Timestamp Mixins
│   │   ├── account.py           # SQLAlchemy Account Model
│   │   ├── category.py
│   │   ├── statement.py
│   │   ├── instalment.py
│   │   └── transaction.py
│   ├── schemas/                 # Pydantic Schemas (Request/Response Validation)
│   │   ├── account.py           # Pydantic Schemas (Base, Create, Update, Response)
│   │   ├── category.py
│   │   ├── statement.py
│   │   ├── instalment.py
│   │   └── transaction.py
│   ├── crud/
│   │   └── crud_account.py      # Data Access Layer / Business Logic cho Account
│   └── main.py                  # FastAPI Entrypoint (CORS, Routers, Health Check)
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
