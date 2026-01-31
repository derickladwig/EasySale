// Data models and business entities
// This module contains all data structures used throughout the application

pub mod artifact;
pub mod backup;
pub mod commission;
pub mod confidence;
pub mod context;
pub mod credit;
pub mod customer;
pub mod errors;
pub mod external_entities;
pub mod gift_card;
pub mod layaway;
pub mod lexicon;
pub mod loyalty;
pub mod ocr_profile;
pub mod product;
pub mod promotion;
pub mod review;
pub mod review_policy;
pub mod session;
pub mod settings;
pub mod station;
pub mod store;
pub mod sync;
pub mod user;
pub mod validation;
pub mod vendor;
pub mod work_order;

pub use commission::{Commission, CommissionRule, CommissionRuleType, CreateCommissionRuleRequest};
#[allow(unused_imports)]
pub use artifact::{
    Artifact, ArtifactDecisionSource, BoundingBox, CandidateArtifact, DecisionArtifact, Evidence,
    EvidenceType, InputArtifact, OcrArtifact, OcrWord, PageArtifact, VariantArtifact,
    VariantType, ZoneArtifact, ZoneType,
};
#[allow(unused_imports)]
pub use backup::{BackupJob, BackupMode, BackupSettings};
#[allow(unused_imports)]
pub use confidence::{CandidateValue, DocumentConfidence, ExtractionMethod, FieldConfidence, SourceEvidence};
pub use context::UserContext;
pub use credit::{CreditAccount, CreditTransaction, CreditTransactionType, CreateCreditAccountRequest, RecordChargeRequest, RecordPaymentRequest};
pub use customer::{
    CreateCustomerRequest, Customer, CustomerResponse, CustomerWithStats, PricingTier, UpdateCustomerRequest,
};
pub use errors::{ApiError, ApiResult, ValidationError};
pub use external_entities::{
    InternalOrder, InternalCustomer, InternalProduct,
    OrderStatus, PaymentStatus, ProductType, DiscountType,
    Address, LineItem, TaxLine, ShippingLine, Discount,
};
pub use gift_card::{GiftCard, GiftCardStatus, GiftCardTransactionType, IssueGiftCardRequest, RedeemGiftCardRequest, ReloadGiftCardRequest};
pub use settings::{
    LocalizationSettings, NetworkSettings, PerformanceSettings, UserPreferences,
    UpdateLocalizationRequest, UpdateNetworkRequest, UpdatePerformanceRequest, UpdateUserPreferencesRequest,
};
pub use layaway::{
    CreateLayawayPaymentRequest, CreateLayawayRequest, Layaway,
    LayawayItem, LayawayPayment, LayawayResponse, LayawayStatus,
};
#[allow(unused_imports)]
pub use lexicon::{Lexicon, LexiconError, LexiconSettings, ProximityRules, ZonePriors, ConfidenceBoosters};
pub use loyalty::{LoyaltyTransaction, LoyaltyTransactionType, PriceLevel, RedeemPointsRequest};
#[allow(unused_imports)]
pub use ocr_profile::{OcrProfileConfig, OcrProfileDef, OcrProfileError, OcrSettings, ZoneDefaults};
pub use product::{
    BulkOperation, BulkOperationRequest, CreateProductRelationshipRequest, CreateProductRequest,
    CreateProductTemplateRequest, CreateProductVariantRequest, Product, ProductPriceHistory,
    ProductPriceHistoryResponse, ProductRelationship, ProductRelationshipResponse, ProductResponse,
    ProductSearchRequest, ProductSearchResponse, ProductTemplate, ProductTemplateResponse,
    ProductVariant, ProductVariantResponse, UpdateProductRequest,
    UpdateProductTemplateRequest,
};
pub use promotion::{CreatePromotionRequest, Promotion, PromotionUsage};
#[allow(unused_imports)]
pub use review::{AuditAction, AuditLog, DecisionSource, FieldDecision, InvoiceExtraction, ReviewCase, ReviewSession, ReviewState};
#[allow(unused_imports)]
pub use review_policy::{ReviewMode, ReviewPolicy, ConfidenceThresholds, TenantReviewPolicy};
pub use session::{Session};
pub use station::{CreateStationRequest, Station, UpdateStationRequest};
pub use store::{CreateStoreRequest, Store, UpdateStoreRequest};
pub use sync::{AuditLog as SyncAuditLog, ConflictResolution, CreateAuditLog, CreateSyncQueueItem, SyncConflict, SyncQueueItem, SyncState, SyncStats};
pub use user::{
    LoginRequest, LoginResponse, User, UserResponse,
};
#[allow(unused_imports)]
pub use validation::{FlagSeverity, FixAction, HardRule, SoftRule, SuggestedFix, ToleranceConfig, ValidationEngine, ValidationFlag, ValidationResult};
#[cfg(feature = "document-processing")]
pub use vendor::{
    CreateVendorRequest, UpdateVendorRequest, CreateVendorTemplateRequest,
};
pub use work_order::{
    CreateWorkOrderLineRequest, CreateWorkOrderRequest, UpdateWorkOrderRequest, WorkOrder,
    WorkOrderLine, WorkOrderLineType, WorkOrderResponse, WorkOrderStatus,
};
