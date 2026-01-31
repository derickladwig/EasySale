use actix_web::{delete, get, post, web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::services::credential_service::{
    CloverCredentials, CredentialService, PlatformCredentials, QuickBooksCredentials,
    QuickBooksTokens, SquareCredentials, StripeConnectCredentials, SupabaseCredentials,
    WooCommerceCredentials,
};

/// Mask Stripe account ID for display (e.g., "acct_...xxxx")
fn mask_stripe_account_id(account_id: &str) -> String {
    if account_id.len() > 8 {
        let prefix = &account_id[..5];
        let suffix = &account_id[account_id.len() - 4..];
        format!("{}...{}", prefix, suffix)
    } else {
        "****".to_string()
    }
}

/// POST /api/credentials/woocommerce
/// Store WooCommerce credentials
#[post("/api/credentials/woocommerce")]
pub async fn store_woocommerce_credentials(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let tenant_id = match req.get("tenant_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "tenant_id is required"
            }));
        }
    };

    let consumer_key = match req.get("consumer_key").and_then(|v| v.as_str()) {
        Some(key) => key.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "consumer_key is required"
            }));
        }
    };

    let consumer_secret = match req.get("consumer_secret").and_then(|v| v.as_str()) {
        Some(secret) => secret.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "consumer_secret is required"
            }));
        }
    };

    let store_url = match req.get("store_url").and_then(|v| v.as_str()) {
        Some(url) => url.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "store_url is required"
            }));
        }
    };

    tracing::info!("Storing WooCommerce credentials for tenant: {}", tenant_id);

    let service = match CredentialService::new(pool.get_ref().clone()) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create credential service: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to initialize credential service"
            }));
        }
    };

    let credentials = PlatformCredentials::WooCommerce(WooCommerceCredentials {
        consumer_key,
        consumer_secret,
        store_url,
    });

    match service.store_credentials(tenant_id, credentials).await {
        Ok(id) => HttpResponse::Created().json(serde_json::json!({
            "message": "Credentials stored successfully",
            "credential_id": id
        })),
        Err(e) => {
            tracing::error!("Failed to store credentials: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to store credentials: {}", e)
            }))
        }
    }
}

/// POST /api/credentials/quickbooks
/// Store QuickBooks credentials
#[post("/api/credentials/quickbooks")]
pub async fn store_quickbooks_credentials(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let tenant_id = match req.get("tenant_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "tenant_id is required"
            }));
        }
    };

    let client_id = match req.get("client_id").and_then(|v| v.as_str()) {
        Some(id) => id.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "client_id is required"
            }));
        }
    };

    let client_secret = match req.get("client_secret").and_then(|v| v.as_str()) {
        Some(secret) => secret.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "client_secret is required"
            }));
        }
    };

    let realm_id = match req.get("realm_id").and_then(|v| v.as_str()) {
        Some(id) => id.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "realm_id is required"
            }));
        }
    };

    tracing::info!("Storing QuickBooks credentials for tenant: {}", tenant_id);

    let service = match CredentialService::new(pool.get_ref().clone()) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create credential service: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to initialize credential service"
            }));
        }
    };

    let credentials = PlatformCredentials::QuickBooks(QuickBooksCredentials {
        client_id,
        client_secret,
        realm_id,
    });

    match service.store_credentials(tenant_id, credentials).await {
        Ok(id) => HttpResponse::Created().json(serde_json::json!({
            "message": "Credentials stored successfully",
            "credential_id": id
        })),
        Err(e) => {
            tracing::error!("Failed to store credentials: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to store credentials: {}", e)
            }))
        }
    }
}

/// POST /api/credentials/supabase
/// Store Supabase credentials
#[post("/api/credentials/supabase")]
pub async fn store_supabase_credentials(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let tenant_id = match req.get("tenant_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "tenant_id is required"
            }));
        }
    };

    let project_url = match req.get("project_url").and_then(|v| v.as_str()) {
        Some(url) => url.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "project_url is required"
            }));
        }
    };

    let service_role_key = match req.get("service_role_key").and_then(|v| v.as_str()) {
        Some(key) => key.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "service_role_key is required"
            }));
        }
    };

    tracing::info!("Storing Supabase credentials for tenant: {}", tenant_id);

    let service = match CredentialService::new(pool.get_ref().clone()) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create credential service: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to initialize credential service"
            }));
        }
    };

    let credentials = PlatformCredentials::Supabase(SupabaseCredentials {
        project_url,
        service_role_key,
    });

    match service.store_credentials(tenant_id, credentials).await {
        Ok(id) => HttpResponse::Created().json(serde_json::json!({
            "message": "Credentials stored successfully",
            "credential_id": id
        })),
        Err(e) => {
            tracing::error!("Failed to store credentials: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to store credentials: {}", e)
            }))
        }
    }
}

/// POST /api/credentials/square
/// Store Square credentials
#[post("/api/credentials/square")]
pub async fn store_square_credentials(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let tenant_id = match req.get("tenant_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "tenant_id is required"
            }));
        }
    };

    let access_token = match req.get("access_token").and_then(|v| v.as_str()) {
        Some(token) => token.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "access_token is required"
            }));
        }
    };

    let location_id = match req.get("location_id").and_then(|v| v.as_str()) {
        Some(id) => id.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "location_id is required"
            }));
        }
    };

    tracing::info!("Storing Square credentials for tenant: {}", tenant_id);

    let service = match CredentialService::new(pool.get_ref().clone()) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create credential service: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to initialize credential service"
            }));
        }
    };

    let credentials = PlatformCredentials::Square(SquareCredentials {
        access_token,
        location_id,
    });

    match service.store_credentials(tenant_id, credentials).await {
        Ok(id) => HttpResponse::Created().json(serde_json::json!({
            "message": "Credentials stored successfully",
            "credential_id": id
        })),
        Err(e) => {
            tracing::error!("Failed to store credentials: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to store credentials: {}", e)
            }))
        }
    }
}

/// POST /api/credentials/clover
/// Store Clover credentials
#[post("/api/credentials/clover")]
pub async fn store_clover_credentials(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let tenant_id = match req.get("tenant_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "tenant_id is required"
            }));
        }
    };

    let access_token = match req.get("access_token").and_then(|v| v.as_str()) {
        Some(token) => token.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "access_token is required"
            }));
        }
    };

    let merchant_id = match req.get("merchant_id").and_then(|v| v.as_str()) {
        Some(id) => id.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "merchant_id is required"
            }));
        }
    };

    tracing::info!("Storing Clover credentials for tenant: {}", tenant_id);

    let service = match CredentialService::new(pool.get_ref().clone()) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create credential service: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to initialize credential service"
            }));
        }
    };

    let credentials = PlatformCredentials::Clover(CloverCredentials {
        access_token,
        merchant_id,
    });

    match service.store_credentials(tenant_id, credentials).await {
        Ok(id) => HttpResponse::Created().json(serde_json::json!({
            "message": "Credentials stored successfully",
            "credential_id": id
        })),
        Err(e) => {
            tracing::error!("Failed to store credentials: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to store credentials: {}", e)
            }))
        }
    }
}

/// POST /api/credentials/stripe
/// Store Stripe Connect credentials (typically from OAuth callback)
#[post("/api/credentials/stripe")]
pub async fn store_stripe_credentials(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let tenant_id = match req.get("tenant_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "tenant_id is required"
            }));
        }
    };

    let stripe_user_id = match req.get("stripe_user_id").and_then(|v| v.as_str()) {
        Some(id) => id.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "stripe_user_id is required"
            }));
        }
    };

    let access_token = match req.get("access_token").and_then(|v| v.as_str()) {
        Some(token) => token.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "access_token is required"
            }));
        }
    };

    // refresh_token is optional for Stripe Connect
    let refresh_token = req
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let scope = req
        .get("scope")
        .and_then(|v| v.as_str())
        .unwrap_or("read_write")
        .to_string();

    tracing::info!("Storing Stripe Connect credentials for tenant: {}", tenant_id);

    let service = match CredentialService::new(pool.get_ref().clone()) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create credential service: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to initialize credential service"
            }));
        }
    };

    let credentials = PlatformCredentials::Stripe(StripeConnectCredentials {
        stripe_user_id,
        access_token,
        refresh_token,
        scope,
    });

    match service.store_credentials(tenant_id, credentials).await {
        Ok(id) => HttpResponse::Created().json(serde_json::json!({
            "message": "Credentials stored successfully",
            "credential_id": id
        })),
        Err(e) => {
            tracing::error!("Failed to store credentials: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to store credentials: {}", e)
            }))
        }
    }
}

/// GET /api/credentials/:tenant_id/:platform
/// Get credentials for a platform
#[get("/api/credentials/{tenant_id}/{platform}")]
pub async fn get_credentials(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (tenant_id, platform) = path.into_inner();
    tracing::info!(
        "Getting credentials for tenant {} platform {}",
        tenant_id,
        platform
    );

    let service = match CredentialService::new(pool.get_ref().clone()) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create credential service: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to initialize credential service"
            }));
        }
    };

    match service.get_credentials(&tenant_id, &platform).await {
        Ok(Some(credentials)) => {
            // Return credentials without sensitive data
            let response = match credentials {
                PlatformCredentials::WooCommerce(creds) => serde_json::json!({
                    "platform": "woocommerce",
                    "store_url": creds.store_url,
                    "has_credentials": true
                }),
                PlatformCredentials::QuickBooks(creds) => serde_json::json!({
                    "platform": "quickbooks",
                    "realm_id": creds.realm_id,
                    "has_credentials": true
                }),
                PlatformCredentials::Supabase(creds) => serde_json::json!({
                    "platform": "supabase",
                    "project_url": creds.project_url,
                    "has_credentials": true
                }),
                PlatformCredentials::Square(creds) => serde_json::json!({
                    "platform": "square",
                    "location_id": creds.location_id,
                    "has_credentials": true
                }),
                PlatformCredentials::Clover(creds) => serde_json::json!({
                    "platform": "clover",
                    "merchant_id": creds.merchant_id,
                    "has_credentials": true
                }),
                PlatformCredentials::Stripe(creds) => serde_json::json!({
                    "platform": "stripe",
                    "account_id_masked": mask_stripe_account_id(&creds.stripe_user_id),
                    "has_credentials": true
                }),
            };
            HttpResponse::Ok().json(response)
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Credentials not found"
        })),
        Err(e) => {
            tracing::error!("Failed to get credentials: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get credentials: {}", e)
            }))
        }
    }
}

/// DELETE /api/credentials/:tenant_id/:platform
/// Delete credentials for a platform
#[delete("/api/credentials/{tenant_id}/{platform}")]
pub async fn delete_credentials(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (tenant_id, platform) = path.into_inner();
    tracing::info!(
        "Deleting credentials for tenant {} platform {}",
        tenant_id,
        platform
    );

    let service = match CredentialService::new(pool.get_ref().clone()) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create credential service: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to initialize credential service"
            }));
        }
    };

    match service.delete_credentials(&tenant_id, &platform).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Credentials deleted successfully"
        })),
        Err(e) => {
            tracing::error!("Failed to delete credentials: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to delete credentials: {}", e)
            }))
        }
    }
}

/// POST /api/credentials/quickbooks/tokens
/// Store OAuth tokens for QuickBooks
#[post("/api/credentials/quickbooks/tokens")]
pub async fn store_oauth_tokens(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let tenant_id = match req.get("tenant_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "tenant_id is required"
            }));
        }
    };

    let access_token = match req.get("access_token").and_then(|v| v.as_str()) {
        Some(token) => token.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "access_token is required"
            }));
        }
    };

    let refresh_token = match req.get("refresh_token").and_then(|v| v.as_str()) {
        Some(token) => token.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "refresh_token is required"
            }));
        }
    };

    let expires_at = match req.get("expires_at").and_then(|v| v.as_i64()) {
        Some(exp) => exp,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "expires_at is required"
            }));
        }
    };

    tracing::info!("Storing OAuth tokens for tenant: {}", tenant_id);

    let service = match CredentialService::new(pool.get_ref().clone()) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create credential service: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to initialize credential service"
            }));
        }
    };

    let tokens = QuickBooksTokens {
        access_token,
        refresh_token,
        expires_at,
    };

    match service
        .store_oauth_tokens(tenant_id, "quickbooks", &tokens)
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "OAuth tokens stored successfully"
        })),
        Err(e) => {
            tracing::error!("Failed to store OAuth tokens: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to store OAuth tokens: {}", e)
            }))
        }
    }
}

/// GET /api/credentials/quickbooks/tokens/:tenant_id
/// Get OAuth tokens for QuickBooks
#[get("/api/credentials/quickbooks/tokens/{tenant_id}")]
pub async fn get_oauth_tokens(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let tenant_id = path.into_inner();
    tracing::info!("Getting OAuth tokens for tenant: {}", tenant_id);

    let service = match CredentialService::new(pool.get_ref().clone()) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create credential service: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to initialize credential service"
            }));
        }
    };

    match service.get_oauth_tokens(&tenant_id, "quickbooks").await {
        Ok(Some(tokens)) => HttpResponse::Ok().json(serde_json::json!({
            "expires_at": tokens.expires_at,
            "has_tokens": true
        })),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "OAuth tokens not found"
        })),
        Err(e) => {
            tracing::error!("Failed to get OAuth tokens: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get OAuth tokens: {}", e)
            }))
        }
    }
}

/// Configure credential management routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(store_woocommerce_credentials)
        .service(store_quickbooks_credentials)
        .service(store_supabase_credentials)
        .service(store_square_credentials)
        .service(store_clover_credentials)
        .service(store_stripe_credentials)
        .service(get_credentials)
        .service(delete_credentials)
        .service(store_oauth_tokens)
        .service(get_oauth_tokens);
}
