// Integration test for OrientationService
// Only compiled when ocr feature is enabled
#![cfg(feature = "ocr")]

use easysale_server::services::{OrientationService, OrientationConfig};

#[test]
fn test_orientation_service_compiles() {
    let config = OrientationConfig::default();
    let _service = OrientationService::new(config);
    assert!(true);
}
