//! Detection algorithms for the Document Cleanup Engine

pub mod logo;
pub mod multi_page;
pub mod repetitive;
pub mod watermark;

#[cfg(test)]
mod multi_page_property_tests;

pub use logo::detect_logos;
#[allow(unused_imports)]
pub use multi_page::{
    calculate_confidence_boost, detect_multi_page_strips, MultiPageConfig, MultiPageStripResult,
};
pub use repetitive::detect_repetitive_regions;
pub use watermark::detect_watermarks;
