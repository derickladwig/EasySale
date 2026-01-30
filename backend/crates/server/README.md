# Backend - CAPS POS API

Rust API server with Actix Web and SQLite for local-first data access.

## Structure

- `src/handlers/`: HTTP request handlers
- `src/models/`: Data models and business entities
- `src/db/`: Database access layer with SQLite
- `src/config/`: Configuration management

## Development

```bash
cargo build         # Build the project
cargo run           # Run the API server
cargo test          # Run tests
cargo fmt           # Format code
cargo clippy        # Run linter
```

## Dependencies

Key dependencies (see Cargo.toml):
- `actix-web`: Web framework
- `sqlx`: Database access with compile-time checked queries
- `serde`: Serialization/deserialization
- `jsonwebtoken`: JWT authentication
- `argon2`: Password hashing

See root README.md for complete setup instructions.
