// Performance Tests for Universal Product Catalog
// Feature: universal-product-catalog
// These tests validate performance targets specified in the requirements

#[cfg(test)]
mod performance_tests {
    use std::sync::Arc;
    use std::time::Instant;
    use sqlx::SqlitePool;
    use EasySale_server::{CreateProductRequest, ProductSearchRequest};
    use EasySale_server::SearchService;
    use EasySale_server::ProductService;
    use EasySale_server::ConfigLoader;

    // Helper function to create test database
    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        
        // Run migrations
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .unwrap();
        
        pool
    }

    // Helper function to generate test products
    async fn generate_test_products(
        pool: &SqlitePool,
        count: usize,
        tenant_id: &str,
        store_id: &str,
    ) -> Vec<String> {
        let mut product_ids = Vec::new();
        
        for i in 0..count {
            let id = uuid::Uuid::new_v4().to_string();
            let sku = format!("TEST-{:06}", i);
            let name = format!("Test Product {}", i);
            let category = match i % 5 {
                0 => "Electronics",
                1 => "Clothing",
                2 => "Food",
                3 => "Tools",
                _ => "Misc",
            };
            
            sqlx::query(
                r#"
                INSERT INTO products (
                    id, sku, name, category, unit_price, cost, quantity_on_hand,
                    attributes, images, tenant_id, store_id, is_active, sync_version,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                "#,
            )
            .bind(&id)
            .bind(&sku)
            .bind(&name)
            .bind(category)
            .bind(10.0 + (i as f64 * 0.1))
            .bind(5.0 + (i as f64 * 0.05))
            .bind(100.0)
            .bind("{}")
            .bind("[]")
            .bind(tenant_id)
            .bind(store_id)
            .bind(true)
            .bind(1)
            .execute(pool)
            .await
            .unwrap();
            
            product_ids.push(id);
        }
        
        product_ids
    }

    // ============================================================================
    // Performance Test 25.1: Search Performance with 100K Products
    // ============================================================================
    // Requirement: Search results in under 200ms for 95th percentile
    // Validates: Requirements 3.7, 14.2

    #[tokio::test]
    #[ignore] // Ignore by default due to long runtime
    async fn test_search_performance_100k_products() {
        println!("Setting up test database with 100K products...");
        let pool = setup_test_db().await;
        let tenant_id = "perf-test-tenant";
        let store_id = "perf-test-store";
        
        // Generate 100K test products
        let start = Instant::now();
        generate_test_products(&pool, 100_000, tenant_id, store_id).await;
        println!("Generated 100K products in {:?}", start.elapsed());
        
        // Create search service
        let config_loader = ConfigLoader::new("../../configs", 0, false);
        let search_service = SearchService::new(pool.clone(), config_loader);
        
        // Perform 100 search queries and measure response times
        let mut response_times = Vec::new();
        let search_terms = vec![
            "Test", "Product", "Electronics", "Clothing", "Food",
            "Tools", "Misc", "TEST-000", "TEST-050", "TEST-099",
        ];
        
        println!("Running 100 search queries...");
        for i in 0..100 {
            let query = search_terms[i % search_terms.len()];
            let request = ProductSearchRequest {
                query: Some(query.to_string()),
                category: None,
                filters: None,
                page: Some(1),
                page_size: Some(50),
                sort_by: None,
                sort_order: None,
            };
            
            let start = Instant::now();
            let _result = search_service.search_products(request, tenant_id).await;
            let elapsed = start.elapsed();
            response_times.push(elapsed.as_millis());
        }
        
        // Calculate statistics
        response_times.sort();
        let p50 = response_times[49]; // 50th percentile (median)
        let p95 = response_times[94]; // 95th percentile
        let p99 = response_times[98]; // 99th percentile
        let avg: u128 = response_times.iter().sum::<u128>() / response_times.len() as u128;
        
        println!("\n=== Search Performance Results (100K products) ===");
        println!("Average: {}ms", avg);
        println!("50th percentile (median): {}ms", p50);
        println!("95th percentile: {}ms", p95);
        println!("99th percentile: {}ms", p99);
        println!("================================================\n");
        
        // Assert performance target: < 200ms for 95th percentile
        assert!(
            p95 < 200,
            "95th percentile response time ({}ms) exceeds target of 200ms",
            p95
        );
    }

    // ============================================================================
    // Performance Test 25.2: Bulk Import Performance
    // ============================================================================
    // Requirement: Process at least 1000 products per minute
    // Validates: Requirements 14.4

    #[tokio::test]
    #[ignore] // Ignore by default due to long runtime
    async fn test_bulk_import_performance() {
        println!("Setting up test database for bulk import...");
        let pool = setup_test_db().await;
        let tenant_id = "perf-test-tenant";
        let store_id = "perf-test-store";
        
        // Create product service
        let config_loader = ConfigLoader::new("../../configs", 0, false);
        let product_service = ProductService::new(pool.clone(), config_loader);
        
        // Import 10K products and measure throughput
        let product_count = 10_000;
        println!("Importing {} products...", product_count);
        
        let start = Instant::now();
        for i in 0..product_count {
            let product = CreateProductRequest {
                sku: format!("IMPORT-{:06}", i),
                name: format!("Imported Product {}", i),
                description: None,
                category: "Test".to_string(),
                subcategory: None,
                unit_price: 10.0,
                cost: 5.0,
                quantity_on_hand: Some(100.0),
                reorder_point: Some(10.0),
                parent_id: None,
                barcode: None,
                barcode_type: None,
                store_id: store_id.to_string(),
                attributes: None,
                images: None,
            };
            
            // Note: This would use the actual bulk import API in production
            // For now, we're simulating individual inserts
            let _ = product_service
                .create_product(product, tenant_id, "perf-test-user")
                .await;
        }
        
        let elapsed = start.elapsed();
        let products_per_minute = (product_count as f64 / elapsed.as_secs_f64()) * 60.0;
        
        println!("\n=== Bulk Import Performance Results ===");
        println!("Total time: {:?}", elapsed);
        println!("Products imported: {}", product_count);
        println!("Throughput: {:.0} products/minute", products_per_minute);
        println!("======================================\n");
        
        // Assert performance target: >= 1000 products/minute
        assert!(
            products_per_minute >= 1000.0,
            "Import throughput ({:.0} products/minute) is below target of 1000 products/minute",
            products_per_minute
        );
    }

    // ============================================================================
    // Performance Test 25.3: Concurrent Operations
    // ============================================================================
    // Requirement: Support 50 concurrent users without degradation
    // Validates: Requirements 14.1

    #[tokio::test]
    #[ignore] // Ignore by default due to long runtime
    async fn test_concurrent_operations() {
        println!("Setting up test database for concurrent operations...");
        let pool = setup_test_db().await;
        let tenant_id = "perf-test-tenant";
        let store_id = "perf-test-store";
        
        // Generate 1000 test products
        generate_test_products(&pool, 1000, tenant_id, store_id).await;
        
        // Create search service
        let config_loader = ConfigLoader::new("../../configs", 0, false);
        let search_service = Arc::new(SearchService::new(pool.clone(), config_loader));
        
        // Simulate 50 concurrent users performing searches
        let concurrent_users = 50;
        let queries_per_user = 10;
        
        println!("Simulating {} concurrent users...", concurrent_users);
        
        let start = Instant::now();
        let mut handles = Vec::new();
        
        for user_id in 0..concurrent_users {
            let service = search_service.clone();
            let tenant = tenant_id.to_string();
            
            let handle = tokio::spawn(async move {
                let mut user_response_times = Vec::new();
                
                for query_num in 0..queries_per_user {
                    let request = ProductSearchRequest {
                        query: Some(format!("Product {}", (user_id * queries_per_user + query_num) % 100)),
                        category: None,
                        filters: None,
                        page: Some(1),
                        page_size: Some(50),
                        sort_by: None,
                        sort_order: None,
                    };
                    
                    let query_start = Instant::now();
                    let _ = service.search_products(request, &tenant).await;
                    user_response_times.push(query_start.elapsed().as_millis());
                }
                
                user_response_times
            });
            
            handles.push(handle);
        }
        
        // Wait for all users to complete
        let mut all_response_times = Vec::new();
        for handle in handles {
            let user_times = handle.await.unwrap();
            all_response_times.extend(user_times);
        }
        
        let total_elapsed = start.elapsed();
        
        // Calculate statistics
        all_response_times.sort();
        let total_queries = concurrent_users * queries_per_user;
        let p50 = all_response_times[total_queries / 2];
        let p95 = all_response_times[(total_queries * 95) / 100];
        let p99 = all_response_times[(total_queries * 99) / 100];
        let avg: u128 = all_response_times.iter().sum::<u128>() / all_response_times.len() as u128;
        
        println!("\n=== Concurrent Operations Performance Results ===");
        println!("Concurrent users: {}", concurrent_users);
        println!("Queries per user: {}", queries_per_user);
        println!("Total queries: {}", total_queries);
        println!("Total time: {:?}", total_elapsed);
        println!("Average response time: {}ms", avg);
        println!("50th percentile: {}ms", p50);
        println!("95th percentile: {}ms", p95);
        println!("99th percentile: {}ms", p99);
        println!("================================================\n");
        
        // Assert no significant degradation (95th percentile should still be < 500ms)
        assert!(
            p95 < 500,
            "95th percentile response time under load ({}ms) indicates performance degradation",
            p95
        );
    }
}

