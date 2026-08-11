# Sử dụng bản slim chính thức của Python 3.12 làm base image để tối ưu dung lượng
FROM python:3.12-slim AS builder

# Tắt buffer đầu ra của Python và ngăn tạo các tệp .pyc
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /src

# Cài đặt các công cụ hệ thống cần thiết cho việc biên dịch C/C++ (nếu gói cần)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy file requirements.txt trước để tận dụng Docker layer caching
COPY requirements.txt .

# Cài đặt các thư viện Python vào thư mục wheel / site-packages
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# Stage chính thức để tạo container thực thi (Runner)
FROM python:3.12-slim AS runner

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /src

# Cài đặt các thư viện runtime tối thiểu cho PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy thư viện đã cài đặt từ stage builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy toàn bộ mã nguồn ứng dụng vào container
COPY ./app ./app

# Tạo người dùng không phải root (non-root user) để tăng cường bảo mật
RUN adduser --disabled-password --gecos "" appuser && \
    chown -R appuser:appuser /src
USER appuser

# Mở cổng 8000 cho FastAPI
EXPOSE 8000

# Kiểm tra sức khỏe container (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Lệnh khởi chạy server Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
