# Multi-stage build for production backend

# Stage 1: Build
FROM rust:alpine AS builder

# Install build dependencies including OpenSSL and sqlx-cli
RUN apk add --no-cache musl-dev sqlite-dev sqlite-static pkgconfig openssl-dev openssl-libs-static sqlite && \
    cargo install sqlx-cli --no-default-features --features sqlite

# Set environment variables for OpenSSL static linking
ENV OPENSSL_STATIC=1
ENV OPENSSL_LIB_DIR=/usr/lib
ENV OPENSSL_INCLUDE_DIR=/usr/include

WORKDIR /app

# Copy Cargo files first for dependency caching
COPY Cargo.toml Cargo.lock ./

# Create dummy main.rs to cache dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/EasySale-api target/release/deps/EasySale_api*

# Copy source code
COPY . .

# Touch main.rs to ensure it's rebuilt
RUN touch src/main.rs

# Build with offline mode (no database needed at compile time)
ENV SQLX_OFFLINE=true
RUN cargo build --release

# Stage 2: Production
FROM alpine:latest

# Install runtime dependencies including sqlite3 for migrations and wget for healthcheck
RUN apk add --no-cache sqlite-libs sqlite ca-certificates wget

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/EasySale-api ./

# Copy migrations
COPY --from=builder /app/migrations ./migrations

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Create data directory with proper permissions
RUN mkdir -p /data && chmod 777 /data

# Expose port
EXPOSE 8923

# Set environment variables
ENV DATABASE_PATH=/data/EasySale.db
ENV RUST_LOG=info
ENV API_HOST=0.0.0.0
ENV API_PORT=8923
ENV JWT_SECRET=change-me-in-production
ENV STORE_ID=store-001
ENV STORE_NAME="CAPS Store"

# Run application
CMD ["./entrypoint.sh"]
