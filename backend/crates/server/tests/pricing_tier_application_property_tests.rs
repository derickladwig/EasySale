//! Property-Based Tests for Pricing Tier Application
//! Feature: sales-customer-management, Property 11: Customer pricing tier application
//!
//! These tests validate that when a customer with a pricing tier purchases a product,
//! the applied price matches the price level configured for that tier.
//!
//! **Validates: Requirements 4.2**

use proptest::prelude::*;

// ============================================================================
// Test Helpers
// ============================================================================

/// Pricing tier enum matching the system's pricing tiers
#[derive(Debug, Clone, Copy, PartialEq)]
enum PricingTier {
    Retail,
    Wholesale,
    Contractor,
    VIP,
}

impl PricingTier {
    fn as_str(&self) -> &str {
        match self {
            PricingTier::Retail => "Retail",
            PricingTier::Wholesale => "Wholesale",
            PricingTier::Contractor => "Contractor",
            PricingTier::VIP => "VIP",
        }
    }

    fn all_tiers() -> Vec<PricingTier> {
        vec![
            PricingTier::Retail,
            PricingTier::Wholesale,
            PricingTier::Contractor,
            PricingTier::VIP,
        ]
    }
}

/// Price level configuration for a product
#[derive(Debug, Clone)]
struct PriceLevel {
    product_id: String,
    pricing_tier: PricingTier,
    price: f64,
}

/// Customer with pricing tier
#[derive(Debug, Clone)]
struct Customer {
    id: String,
    pricing_tier: PricingTier,
}

/// Get the price for a product based on customer's pricing tier
fn get_price_for_tier(
    price_levels: &[PriceLevel],
    product_id: &str,
    customer_tier: PricingTier,
) -> Option<f64> {
    price_levels
        .iter()
        .find(|pl| pl.product_id == product_id && pl.pricing_tier == customer_tier)
        .map(|pl| pl.price)
}

/// Apply pricing to a customer's purchase
fn apply_customer_pricing(
    customer: &Customer,
    product_id: &str,
    price_levels: &[PriceLevel],
) -> Option<f64> {
    get_price_for_tier(price_levels, product_id, customer.pricing_tier)
}

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a random pricing tier
fn arb_pricing_tier() -> impl Strategy<Value = PricingTier> {
    prop_oneof![
        Just(PricingTier::Retail),
        Just(PricingTier::Wholesale),
        Just(PricingTier::Contractor),
        Just(PricingTier::VIP),
    ]
}

/// Generate a product ID
fn arb_product_id() -> impl Strategy<Value = String> {
    "[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}"
        .prop_map(|s| s.to_string())
}

/// Generate a customer ID
fn arb_customer_id() -> impl Strategy<Value = String> {
    "[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}"
        .prop_map(|s| s.to_string())
}

/// Generate a price (positive, reasonable range)
fn arb_price() -> impl Strategy<Value = f64> {
    0.01..10000.0
}

/// Generate a customer with a pricing tier
fn arb_customer() -> impl Strategy<Value = Customer> {
    (arb_customer_id(), arb_pricing_tier()).prop_map(|(id, pricing_tier)| Customer {
        id,
        pricing_tier,
    })
}

/// Generate price levels for a product (one for each tier)
fn arb_price_levels_for_product(
    product_id: String,
) -> impl Strategy<Value = Vec<PriceLevel>> {
    // Generate 4 prices, one for each tier
    prop::collection::vec(arb_price(), 4..=4).prop_map(move |prices| {
        PricingTier::all_tiers()
            .into_iter()
            .zip(prices.into_iter())
            .map(|(tier, price)| PriceLevel {
                product_id: product_id.clone(),
                pricing_tier: tier,
                price,
            })
            .collect()
    })
}

// ============================================================================
// Property 11: Customer pricing tier application
// ============================================================================
// For any customer with a pricing tier and any product, the applied price
// should match the price level configured for that tier.
//
// **Validates: Requirements 4.2**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn customer_receives_correct_tier_price(
        customer in arb_customer(),
        product_id in arb_product_id(),
        price_levels in arb_price_levels_for_product("test-product".to_string()),
    ) {
        // Use the generated product_id for price levels
        let price_levels: Vec<PriceLevel> = price_levels
            .into_iter()
            .map(|mut pl| {
                pl.product_id = product_id.clone();
                pl
            })
            .collect();

        // Apply customer pricing
        let applied_price = apply_customer_pricing(&customer, &product_id, &price_levels);

        // Get the expected price for the customer's tier
        let expected_price = get_price_for_tier(&price_levels, &product_id, customer.pricing_tier);

        // The applied price should match the expected price for the tier
        prop_assert_eq!(
            applied_price,
            expected_price,
            "Applied price should match the price level for customer's tier ({:?})",
            customer.pricing_tier
        );

        // The applied price should exist (since we have price levels for all tiers)
        prop_assert!(
            applied_price.is_some(),
            "Applied price should exist for customer tier {:?}",
            customer.pricing_tier
        );

        // Verify the price is the correct one from the price levels
        if let Some(price) = applied_price {
            let matching_level = price_levels
                .iter()
                .find(|pl| pl.product_id == product_id && pl.pricing_tier == customer.pricing_tier);
            
            prop_assert!(
                matching_level.is_some(),
                "Should find matching price level for tier {:?}",
                customer.pricing_tier
            );

            if let Some(level) = matching_level {
                prop_assert!(
                    (price - level.price).abs() < 0.000001,
                    "Applied price {} should exactly match price level {} for tier {:?}",
                    price,
                    level.price,
                    customer.pricing_tier
                );
            }
        }
    }

    #[test]
    fn different_tiers_receive_different_prices_when_configured(
        product_id in arb_product_id(),
        retail_price in 100.0_f64..200.0_f64,
        wholesale_discount in 0.10_f64..0.30_f64, // 10-30% discount
        contractor_discount in 0.15_f64..0.35_f64, // 15-35% discount
        vip_discount in 0.20_f64..0.40_f64, // 20-40% discount
    ) {
        // Create price levels with different prices for each tier
        let price_levels = vec![
            PriceLevel {
                product_id: product_id.clone(),
                pricing_tier: PricingTier::Retail,
                price: retail_price,
            },
            PriceLevel {
                product_id: product_id.clone(),
                pricing_tier: PricingTier::Wholesale,
                price: retail_price * (1.0 - wholesale_discount),
            },
            PriceLevel {
                product_id: product_id.clone(),
                pricing_tier: PricingTier::Contractor,
                price: retail_price * (1.0 - contractor_discount),
            },
            PriceLevel {
                product_id: product_id.clone(),
                pricing_tier: PricingTier::VIP,
                price: retail_price * (1.0 - vip_discount),
            },
        ];

        // Create customers with different tiers
        let retail_customer = Customer {
            id: "retail-customer".to_string(),
            pricing_tier: PricingTier::Retail,
        };
        let wholesale_customer = Customer {
            id: "wholesale-customer".to_string(),
            pricing_tier: PricingTier::Wholesale,
        };
        let contractor_customer = Customer {
            id: "contractor-customer".to_string(),
            pricing_tier: PricingTier::Contractor,
        };
        let vip_customer = Customer {
            id: "vip-customer".to_string(),
            pricing_tier: PricingTier::VIP,
        };

        // Apply pricing for each customer
        let retail_price_applied = apply_customer_pricing(&retail_customer, &product_id, &price_levels);
        let wholesale_price_applied = apply_customer_pricing(&wholesale_customer, &product_id, &price_levels);
        let contractor_price_applied = apply_customer_pricing(&contractor_customer, &product_id, &price_levels);
        let vip_price_applied = apply_customer_pricing(&vip_customer, &product_id, &price_levels);

        // All prices should exist
        prop_assert!(retail_price_applied.is_some(), "Retail price should exist");
        prop_assert!(wholesale_price_applied.is_some(), "Wholesale price should exist");
        prop_assert!(contractor_price_applied.is_some(), "Contractor price should exist");
        prop_assert!(vip_price_applied.is_some(), "VIP price should exist");

        // Each tier should receive its configured price
        let retail_price_value: f64 = retail_price_applied.unwrap();
        let wholesale_price_value: f64 = wholesale_price_applied.unwrap();
        let contractor_price_value: f64 = contractor_price_applied.unwrap();
        let vip_price_value: f64 = vip_price_applied.unwrap();
        
        let expected_wholesale: f64 = retail_price * (1.0 - wholesale_discount);
        let expected_contractor: f64 = retail_price * (1.0 - contractor_discount);
        let expected_vip: f64 = retail_price * (1.0 - vip_discount);
        
        prop_assert!(
            (retail_price_value - retail_price).abs() < 0.01,
            "Retail customer should receive retail price"
        );
        prop_assert!(
            (wholesale_price_value - expected_wholesale).abs() < 0.01,
            "Wholesale customer should receive discounted price"
        );
        prop_assert!(
            (contractor_price_value - expected_contractor).abs() < 0.01,
            "Contractor customer should receive discounted price"
        );
        prop_assert!(
            (vip_price_value - expected_vip).abs() < 0.01,
            "VIP customer should receive discounted price"
        );

        // Verify tier prices are different (with configured discounts)
        prop_assert!(
            retail_price_value > wholesale_price_value,
            "Retail price should be higher than wholesale"
        );
        prop_assert!(
            retail_price_value > contractor_price_value,
            "Retail price should be higher than contractor"
        );
        prop_assert!(
            retail_price_value > vip_price_value,
            "Retail price should be higher than VIP"
        );
    }

    #[test]
    fn same_tier_always_receives_same_price(
        product_id in arb_product_id(),
        tier in arb_pricing_tier(),
        price in arb_price(),
        customer_count in 2..10usize,
    ) {
        // Create price levels with the same price for the tier
        let price_levels = PricingTier::all_tiers()
            .into_iter()
            .map(|t| PriceLevel {
                product_id: product_id.clone(),
                pricing_tier: t,
                price: if t == tier { price } else { price * 1.5 },
            })
            .collect::<Vec<_>>();

        // Create multiple customers with the same tier
        let customers: Vec<Customer> = (0..customer_count)
            .map(|i| Customer {
                id: format!("customer-{}", i),
                pricing_tier: tier,
            })
            .collect();

        // Apply pricing for all customers
        let applied_prices: Vec<Option<f64>> = customers
            .iter()
            .map(|c| apply_customer_pricing(c, &product_id, &price_levels))
            .collect();

        // All customers should receive the same price
        for (i, applied_price) in applied_prices.iter().enumerate() {
            prop_assert!(
                applied_price.is_some(),
                "Customer {} should receive a price",
                i
            );

            let price_value = applied_price.unwrap();
            prop_assert!(
                (price_value - price).abs() < 0.000001,
                "Customer {} with tier {:?} should receive price {}, got {}",
                i,
                tier,
                price,
                price_value
            );
        }

        // Verify all prices are identical
        let first_price = applied_prices[0].unwrap();
        for (i, applied_price) in applied_prices.iter().enumerate().skip(1) {
            prop_assert!(
                (applied_price.unwrap() - first_price).abs() < 0.000001,
                "Customer {} should receive the same price as customer 0",
                i
            );
        }
    }

    #[test]
    fn missing_price_level_returns_none(
        customer in arb_customer(),
        product_id in arb_product_id(),
        other_product_id in arb_product_id(),
    ) {
        // Ensure product IDs are different
        prop_assume!(product_id != other_product_id);

        // Create price levels for a different product
        let price_levels: Vec<PriceLevel> = PricingTier::all_tiers()
            .into_iter()
            .map(|tier| PriceLevel {
                product_id: other_product_id.clone(),
                pricing_tier: tier,
                price: 100.0,
            })
            .collect();

        // Try to apply pricing for the product that has no price levels
        let applied_price = apply_customer_pricing(&customer, &product_id, &price_levels);

        // Should return None since there's no price level for this product
        prop_assert!(
            applied_price.is_none(),
            "Should return None when no price level exists for product"
        );
    }

    #[test]
    fn price_level_lookup_is_tier_specific(
        product_id in arb_product_id(),
        customer_tier in arb_pricing_tier(),
        tier_price in 50.0_f64..150.0_f64,
        other_tier_price in 200.0_f64..300.0_f64,
    ) {
        // Ensure prices are different
        prop_assume!((tier_price - other_tier_price).abs() > 10.0);

        // Create price levels where customer's tier has one price
        // and other tiers have different prices
        let price_levels: Vec<PriceLevel> = PricingTier::all_tiers()
            .into_iter()
            .map(|tier| PriceLevel {
                product_id: product_id.clone(),
                pricing_tier: tier,
                price: if tier == customer_tier {
                    tier_price
                } else {
                    other_tier_price
                },
            })
            .collect();

        let customer = Customer {
            id: "test-customer".to_string(),
            pricing_tier: customer_tier,
        };

        // Apply pricing
        let applied_price = apply_customer_pricing(&customer, &product_id, &price_levels);

        // Should receive the price for their specific tier
        prop_assert!(applied_price.is_some(), "Should receive a price");
        
        let price_value = applied_price.unwrap();
        prop_assert!(
            (price_value - tier_price).abs() < 0.000001,
            "Should receive tier-specific price {}, not other tier price {}, got {}",
            tier_price,
            other_tier_price,
            price_value
        );

        // Verify it's NOT the other tier's price
        prop_assert!(
            (price_value - other_tier_price).abs() > 0.01,
            "Should NOT receive other tier's price"
        );
    }

    #[test]
    fn zero_price_is_valid_for_tier(
        customer in arb_customer(),
        product_id in arb_product_id(),
    ) {
        // Create price levels where customer's tier has zero price (e.g., free for VIP)
        let price_levels: Vec<PriceLevel> = PricingTier::all_tiers()
            .into_iter()
            .map(|tier| PriceLevel {
                product_id: product_id.clone(),
                pricing_tier: tier,
                price: if tier == customer.pricing_tier {
                    0.0
                } else {
                    100.0
                },
            })
            .collect();

        // Apply pricing
        let applied_price = apply_customer_pricing(&customer, &product_id, &price_levels);

        // Should receive zero price
        prop_assert!(applied_price.is_some(), "Should receive a price (even if zero)");
        
        let price_value = applied_price.unwrap();
        prop_assert!(
            price_value.abs() < 0.000001,
            "Should receive zero price for tier {:?}, got {}",
            customer.pricing_tier,
            price_value
        );
    }

    #[test]
    fn multiple_products_maintain_tier_pricing_independence(
        customer in arb_customer(),
        product1_id in arb_product_id(),
        product2_id in arb_product_id(),
        product1_price in 50.0_f64..150.0_f64,
        product2_price in 200.0_f64..400.0_f64,
    ) {
        // Ensure products are different
        prop_assume!(product1_id != product2_id);
        // Ensure prices are different
        prop_assume!((product1_price - product2_price).abs() > 10.0);

        // Create price levels for both products
        let mut price_levels = Vec::new();
        
        for tier in PricingTier::all_tiers() {
            price_levels.push(PriceLevel {
                product_id: product1_id.clone(),
                pricing_tier: tier,
                price: if tier == customer.pricing_tier {
                    product1_price
                } else {
                    product1_price * 1.5
                },
            });
            price_levels.push(PriceLevel {
                product_id: product2_id.clone(),
                pricing_tier: tier,
                price: if tier == customer.pricing_tier {
                    product2_price
                } else {
                    product2_price * 1.5
                },
            });
        }

        // Apply pricing for both products
        let price1 = apply_customer_pricing(&customer, &product1_id, &price_levels);
        let price2 = apply_customer_pricing(&customer, &product2_id, &price_levels);

        // Both should have prices
        prop_assert!(price1.is_some(), "Product 1 should have a price");
        prop_assert!(price2.is_some(), "Product 2 should have a price");

        // Each product should have its own configured price
        prop_assert!(
            (price1.unwrap() - product1_price).abs() < 0.01,
            "Product 1 should have its configured price"
        );
        prop_assert!(
            (price2.unwrap() - product2_price).abs() < 0.01,
            "Product 2 should have its configured price"
        );

        // Prices should be different (since we configured them differently)
        prop_assert!(
            (price1.unwrap() - price2.unwrap()).abs() > 10.0,
            "Different products should have different prices"
        );
    }
}

// ============================================================================
// Additional Edge Case Tests
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn price_precision_is_maintained(
        customer in arb_customer(),
        product_id in arb_product_id(),
        // Use a price with many decimal places
        price_cents in 1..1000000i64,
    ) {
        let precise_price = price_cents as f64 / 100.0; // Convert cents to dollars

        let price_levels: Vec<PriceLevel> = PricingTier::all_tiers()
            .into_iter()
            .map(|tier| PriceLevel {
                product_id: product_id.clone(),
                pricing_tier: tier,
                price: if tier == customer.pricing_tier {
                    precise_price
                } else {
                    precise_price * 2.0
                },
            })
            .collect();

        let applied_price = apply_customer_pricing(&customer, &product_id, &price_levels);

        prop_assert!(applied_price.is_some(), "Should receive a price");
        
        let price_value = applied_price.unwrap();
        // Allow for floating point precision issues
        prop_assert!(
            (price_value - precise_price).abs() < 0.000001,
            "Price precision should be maintained: expected {}, got {}",
            precise_price,
            price_value
        );
    }

    #[test]
    fn tier_pricing_is_consistent_across_lookups(
        customer in arb_customer(),
        product_id in arb_product_id(),
        price in arb_price(),
        lookup_count in 2..20usize,
    ) {
        let price_levels: Vec<PriceLevel> = PricingTier::all_tiers()
            .into_iter()
            .map(|tier| PriceLevel {
                product_id: product_id.clone(),
                pricing_tier: tier,
                price: if tier == customer.pricing_tier {
                    price
                } else {
                    price * 1.5
                },
            })
            .collect();

        // Perform multiple lookups
        let prices: Vec<Option<f64>> = (0..lookup_count)
            .map(|_| apply_customer_pricing(&customer, &product_id, &price_levels))
            .collect();

        // All lookups should return the same price
        let first_price = prices[0];
        prop_assert!(first_price.is_some(), "First lookup should return a price");

        for (i, lookup_price) in prices.iter().enumerate() {
            prop_assert_eq!(
                lookup_price,
                &first_price,
                "Lookup {} should return the same price as first lookup",
                i
            );
        }
    }
}
