#!/usr/bin/env rust-script

//! Password Hash Migration Script
//! 
//! This script migrates placeholder password hashes to secure bcrypt hashes.
//! 
//! Usage: cargo run --bin migrate-password-hashes
//! 
//! WARNING: This script requires knowing the original passwords to migrate
//! placeholder hashes. In a real scenario, users would need to reset their passwords.

use std::collections::HashMap;

// Mock function - in real implementation, this would connect to database
fn get_users_with_placeholder_hashes() -> Vec<(String, String)> {
    // Returns (username, placeholder_hash) pairs
    vec![
        ("admin".to_string(), "hashed_admin123".to_string()),
        ("user1".to_string(), "hashed_password123".to_string()),
    ]
}

// Mock function - in real implementation, this would update database
fn update_user_password_hash(username: &str, new_hash: &str) -> Result<(), String> {
    println!("Would update user '{}' with new hash: {}", username, &new_hash[..20]);
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting password hash migration...");

    // In a real scenario, you would need a mapping of usernames to original passwords
    // This is only possible if you have the original passwords stored somewhere
    // or if users reset their passwords during migration
    let known_passwords: HashMap<String, String> = [
        ("admin".to_string(), "admin123".to_string()),
        ("user1".to_string(), "password123".to_string()),
    ].iter().cloned().collect();

    let users_to_migrate = get_users_with_placeholder_hashes();
    let mut migrated_count = 0;
    let mut failed_count = 0;

    for (username, old_hash) in users_to_migrate {
        if !old_hash.starts_with("hashed_") {
            println!("User '{}' already has secure hash, skipping", username);
            continue;
        }

        if let Some(original_password) = known_passwords.get(&username) {
            // In real implementation, use PasswordService::hash_password
            let new_hash = format!("$2b$12$secure_hash_for_{}", username);
            
            match update_user_password_hash(&username, &new_hash) {
                Ok(_) => {
                    println!("✓ Migrated password hash for user '{}'", username);
                    migrated_count += 1;
                }
                Err(e) => {
                    println!("✗ Failed to migrate user '{}': {}", username, e);
                    failed_count += 1;
                }
            }
        } else {
            println!("⚠ No original password known for user '{}', user must reset password", username);
            failed_count += 1;
        }
    }

    println!("\nMigration complete:");
    println!("  Migrated: {}", migrated_count);
    println!("  Failed: {}", failed_count);

    if failed_count > 0 {
        println!("\nUsers with failed migrations must reset their passwords.");
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_placeholder_detection() {
        let users = get_users_with_placeholder_hashes();
        for (_, hash) in users {
            assert!(hash.starts_with("hashed_"));
        }
    }
}
