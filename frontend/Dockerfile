# Stage 1: Build React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package management files
COPY package*.json ./

# Cài đặt phụ thuộc
RUN npm ci || npm install

# Copy mã nguồn ứng dụng
COPY . .

# Biên dịch mã nguồn React sang dist (Production Build)
RUN npm run build

# Stage 2: Nginx Web Server Runner
FROM nginx:stable-alpine AS runner

# Xóa trang mặc định của Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copy bản build dist từ stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy cấu hình Nginx SPA & Proxy API
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
