//! Query builder utilities for constructing SQL queries

use std::fmt::Write;

/// Builder for SELECT queries
#[derive(Debug, Clone)]
pub struct SelectQueryBuilder {
    table: String,
    columns: Vec<String>,
    where_clauses: Vec<String>,
    order_by: Vec<String>,
    limit: Option<i64>,
    offset: Option<i64>,
}

impl SelectQueryBuilder {
    /// Create a new SELECT query builder
    pub fn new(table: impl Into<String>) -> Self {
        Self {
            table: table.into(),
            columns: vec!["*".to_string()],
            where_clauses: Vec::new(),
            order_by: Vec::new(),
            limit: None,
            offset: None,
        }
    }

    /// Set specific columns to select
    #[must_use] 
    pub fn columns(mut self, columns: &[&str]) -> Self {
        self.columns = columns.iter().map(|s| (*s).to_string()).collect();
        self
    }

    /// Add a WHERE clause
    pub fn where_clause(mut self, clause: impl Into<String>) -> Self {
        self.where_clauses.push(clause.into());
        self
    }

    /// Add an ORDER BY clause
    pub fn order_by(mut self, column: impl Into<String>, ascending: bool) -> Self {
        let direction = if ascending { "ASC" } else { "DESC" };
        self.order_by.push(format!("{} {}", column.into(), direction));
        self
    }

    /// Set LIMIT
    #[must_use] 
    pub const fn limit(mut self, limit: i64) -> Self {
        self.limit = Some(limit);
        self
    }

    /// Set OFFSET
    #[must_use] 
    pub const fn offset(mut self, offset: i64) -> Self {
        self.offset = Some(offset);
        self
    }

    /// Build the SQL query string
    #[must_use] 
    pub fn build(&self) -> String {
        let mut query = String::new();
        
        // SELECT columns
        write!(&mut query, "SELECT {} FROM {}", self.columns.join(", "), self.table)
            .expect("Failed to write SELECT clause");
        
        // WHERE clauses
        if !self.where_clauses.is_empty() {
            write!(&mut query, " WHERE {}", self.where_clauses.join(" AND "))
                .expect("Failed to write WHERE clause");
        }
        
        // ORDER BY
        if !self.order_by.is_empty() {
            write!(&mut query, " ORDER BY {}", self.order_by.join(", "))
                .expect("Failed to write ORDER BY clause");
        }
        
        // LIMIT
        if let Some(limit) = self.limit {
            write!(&mut query, " LIMIT {limit}")
                .expect("Failed to write LIMIT clause");
        }
        
        // OFFSET
        if let Some(offset) = self.offset {
            write!(&mut query, " OFFSET {offset}")
                .expect("Failed to write OFFSET clause");
        }
        
        query
    }
}

/// Builder for INSERT queries
#[derive(Debug, Clone)]
pub struct InsertQueryBuilder {
    table: String,
    columns: Vec<String>,
    placeholders: Vec<String>,
}

impl InsertQueryBuilder {
    /// Create a new INSERT query builder
    pub fn new(table: impl Into<String>) -> Self {
        Self {
            table: table.into(),
            columns: Vec::new(),
            placeholders: Vec::new(),
        }
    }

    /// Add a column with a placeholder
    pub fn column(mut self, column: impl Into<String>) -> Self {
        self.columns.push(column.into());
        self.placeholders.push("?".to_string());
        self
    }

    /// Build the SQL query string
    #[must_use] 
    pub fn build(&self) -> String {
        format!(
            "INSERT INTO {} ({}) VALUES ({})",
            self.table,
            self.columns.join(", "),
            self.placeholders.join(", ")
        )
    }
}

/// Builder for UPDATE queries
#[derive(Debug, Clone)]
pub struct UpdateQueryBuilder {
    table: String,
    set_clauses: Vec<String>,
    where_clauses: Vec<String>,
}

impl UpdateQueryBuilder {
    /// Create a new UPDATE query builder
    pub fn new(table: impl Into<String>) -> Self {
        Self {
            table: table.into(),
            set_clauses: Vec::new(),
            where_clauses: Vec::new(),
        }
    }

    /// Add a SET clause
    pub fn set(mut self, column: impl Into<String>) -> Self {
        self.set_clauses.push(format!("{} = ?", column.into()));
        self
    }

    /// Add a WHERE clause
    pub fn where_clause(mut self, clause: impl Into<String>) -> Self {
        self.where_clauses.push(clause.into());
        self
    }

    /// Build the SQL query string
    #[must_use] 
    pub fn build(&self) -> String {
        let mut query = format!(
            "UPDATE {} SET {}",
            self.table,
            self.set_clauses.join(", ")
        );
        
        if !self.where_clauses.is_empty() {
            write!(&mut query, " WHERE {}", self.where_clauses.join(" AND "))
                .expect("Failed to write WHERE clause");
        }
        
        query
    }
}

/// Builder for DELETE queries
#[derive(Debug, Clone)]
pub struct DeleteQueryBuilder {
    table: String,
    where_clauses: Vec<String>,
}

impl DeleteQueryBuilder {
    /// Create a new DELETE query builder
    pub fn new(table: impl Into<String>) -> Self {
        Self {
            table: table.into(),
            where_clauses: Vec::new(),
        }
    }

    /// Add a WHERE clause
    pub fn where_clause(mut self, clause: impl Into<String>) -> Self {
        self.where_clauses.push(clause.into());
        self
    }

    /// Build the SQL query string
    #[must_use] 
    pub fn build(&self) -> String {
        let mut query = format!("DELETE FROM {}", self.table);
        
        if !self.where_clauses.is_empty() {
            write!(&mut query, " WHERE {}", self.where_clauses.join(" AND "))
                .expect("Failed to write WHERE clause");
        }
        
        query
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_select_query_builder() {
        let query = SelectQueryBuilder::new("transactions")
            .columns(&["id", "total", "status"])
            .where_clause("status = ?")
            .order_by("created_at", false)
            .limit(10)
            .offset(5)
            .build();
        
        assert_eq!(
            query,
            "SELECT id, total, status FROM transactions WHERE status = ? ORDER BY created_at DESC LIMIT 10 OFFSET 5"
        );
    }

    #[test]
    fn test_select_all_columns() {
        let query = SelectQueryBuilder::new("products")
            .where_clause("price > ?")
            .build();
        
        assert_eq!(query, "SELECT * FROM products WHERE price > ?");
    }

    #[test]
    fn test_insert_query_builder() {
        let query = InsertQueryBuilder::new("transactions")
            .column("id")
            .column("total")
            .column("status")
            .build();
        
        assert_eq!(
            query,
            "INSERT INTO transactions (id, total, status) VALUES (?, ?, ?)"
        );
    }

    #[test]
    fn test_update_query_builder() {
        let query = UpdateQueryBuilder::new("transactions")
            .set("status")
            .set("finalized_at")
            .where_clause("id = ?")
            .build();
        
        assert_eq!(
            query,
            "UPDATE transactions SET status = ?, finalized_at = ? WHERE id = ?"
        );
    }

    #[test]
    fn test_delete_query_builder() {
        let query = DeleteQueryBuilder::new("transactions")
            .where_clause("status = ?")
            .where_clause("created_at < ?")
            .build();
        
        assert_eq!(
            query,
            "DELETE FROM transactions WHERE status = ? AND created_at < ?"
        );
    }

    #[test]
    fn test_multiple_where_clauses() {
        let query = SelectQueryBuilder::new("products")
            .where_clause("category = ?")
            .where_clause("price > ?")
            .where_clause("in_stock = ?")
            .build();
        
        assert_eq!(
            query,
            "SELECT * FROM products WHERE category = ? AND price > ? AND in_stock = ?"
        );
    }

    #[test]
    fn test_multiple_order_by() {
        let query = SelectQueryBuilder::new("products")
            .order_by("category", true)
            .order_by("price", false)
            .build();
        
        assert_eq!(
            query,
            "SELECT * FROM products ORDER BY category ASC, price DESC"
        );
    }
}
