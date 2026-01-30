# Backend Source Structure

## Directory Organization

### `handlers/`
HTTP request handlers for API endpoints.

- `health.rs` - Health check endpoint
- Additional handlers will be added as features are implemented

### `models/`
Data models and business entities.

- User, Role, Permission models (to be added)
- Product, Inventory models (to be added)
- Transaction, Payment models (to be added)

### `db/`
Database access layer using SQLx.

- `mod.rs` - Database connection pool initialization
- Query functions and migrations (to be added)

### `config/`
Configuration management.

- `mod.rs` - Configuration struct and environment variable loading

## Running the Server

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# At minimum, set JWT_SECRET, STORE_ID, and STORE_NAME

# Run the server
cargo run

# Or with auto-reload during development
cargo watch -x run
```

## API Endpoints

### Health Check
- **GET** `/health` - Returns server health status

Additional endpoints will be documented as they are implemented.
