/**
 * Google Drive Connector Module
 * 
 * Provides OAuth authentication and file upload capabilities for Google Drive.
 * Used for off-site backup storage.
 */

pub mod oauth;

pub use oauth::{GoogleDriveCredentials, GoogleDriveOAuth, GoogleDriveTokens};
