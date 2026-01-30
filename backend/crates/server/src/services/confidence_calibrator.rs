// Confidence Calibrator Service
// Calibrates confidence scores to real accuracy
// Requirements: 4.3 (Confidence Calibration)

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

/// Confidence calibrator errors
#[derive(Debug, Error)]
pub enum ConfidenceCalibratorError {
    #[error("Insufficient data for calibration: {0}")]
    InsufficientDataError(String),
    
    #[error("Invalid confidence value: {0}")]
    InvalidConfidenceError(u8),
    
    #[error("Calibration failed: {0}")]
    CalibrationError(String),
}

/// Calibration data point
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationDataPoint {
    pub predicted_confidence: u8,
    pub actual_correct: bool,
    pub field_name: String,
    pub vendor_id: Option<String>,
}

/// Calibration statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationStats {
    pub total_samples: usize,
    pub accuracy_by_confidence: HashMap<u8, f64>,
    pub overall_accuracy: f64,
    pub calibration_error: f64,
}

/// Vendor-specific calibration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
struct VendorCalibration {
    vendor_id: String,
    data_points: Vec<CalibrationDataPoint>,
    stats: Option<CalibrationStats>,
}

/// Confidence calibrator service
pub struct ConfidenceCalibrator {
    global_data: Vec<CalibrationDataPoint>,
    vendor_data: HashMap<String, Vec<CalibrationDataPoint>>,
    min_samples_for_calibration: usize,
    recalibration_threshold: f64,
}

impl ConfidenceCalibrator {
    /// Create a new confidence calibrator
    pub fn new() -> Self {
        Self {
            global_data: Vec::new(),
            vendor_data: HashMap::new(),
            min_samples_for_calibration: 100,
            recalibration_threshold: 0.05, // 5% drift
        }
    }
    
    /// Create with custom settings
    pub fn with_settings(min_samples: usize, recalibration_threshold: f64) -> Self {
        Self {
            global_data: Vec::new(),
            vendor_data: HashMap::new(),
            min_samples_for_calibration: min_samples,
            recalibration_threshold,
        }
    }
    
    /// Add a calibration data point
    pub fn add_data_point(&mut self, data_point: CalibrationDataPoint) {
        // Add to global data
        self.global_data.push(data_point.clone());
        
        // Add to vendor-specific data if vendor_id present
        if let Some(vendor_id) = &data_point.vendor_id {
            self.vendor_data
                .entry(vendor_id.clone())
                .or_insert_with(Vec::new)
                .push(data_point);
        }
    }
    
    /// Calculate calibration statistics
    pub fn calculate_stats(data: &[CalibrationDataPoint]) -> CalibrationStats {
        if data.is_empty() {
            return CalibrationStats {
                total_samples: 0,
                accuracy_by_confidence: HashMap::new(),
                overall_accuracy: 0.0,
                calibration_error: 0.0,
            };
        }
        
        // Group by confidence level (in buckets of 10)
        let mut confidence_buckets: HashMap<u8, Vec<bool>> = HashMap::new();
        
        for point in data {
            let bucket = (point.predicted_confidence / 10) * 10;
            confidence_buckets
                .entry(bucket)
                .or_insert_with(Vec::new)
                .push(point.actual_correct);
        }
        
        // Calculate accuracy for each bucket
        let mut accuracy_by_confidence = HashMap::new();
        let mut total_calibration_error = 0.0;
        
        for (confidence, results) in &confidence_buckets {
            let correct_count = results.iter().filter(|&&r| r).count();
            let accuracy = correct_count as f64 / results.len() as f64;
            accuracy_by_confidence.insert(*confidence, accuracy);
            
            // Calibration error: difference between predicted and actual
            let predicted = *confidence as f64 / 100.0;
            total_calibration_error += (predicted - accuracy).abs();
        }
        
        // Overall accuracy
        let total_correct = data.iter().filter(|p| p.actual_correct).count();
        let overall_accuracy = total_correct as f64 / data.len() as f64;
        
        // Average calibration error
        let calibration_error = if !confidence_buckets.is_empty() {
            total_calibration_error / confidence_buckets.len() as f64
        } else {
            0.0
        };
        
        CalibrationStats {
            total_samples: data.len(),
            accuracy_by_confidence,
            overall_accuracy,
            calibration_error,
        }
    }
    
    /// Get global calibration statistics
    pub fn get_global_stats(&self) -> CalibrationStats {
        Self::calculate_stats(&self.global_data)
    }
    
    /// Get vendor-specific calibration statistics
    pub fn get_vendor_stats(&self, vendor_id: &str) -> Option<CalibrationStats> {
        self.vendor_data
            .get(vendor_id)
            .map(|data| Self::calculate_stats(data))
    }
    
    /// Calibrate a confidence score
    pub fn calibrate_confidence(
        &self,
        predicted_confidence: u8,
        vendor_id: Option<&str>,
    ) -> u8 {
        // Try vendor-specific calibration first
        if let Some(vid) = vendor_id {
            if let Some(vendor_data) = self.vendor_data.get(vid) {
                if vendor_data.len() >= self.min_samples_for_calibration {
                    return Self::apply_calibration(predicted_confidence, vendor_data);
                }
            }
        }
        
        // Fall back to global calibration
        if self.global_data.len() >= self.min_samples_for_calibration {
            return Self::apply_calibration(predicted_confidence, &self.global_data);
        }
        
        // Not enough data, return original
        predicted_confidence
    }
    
    /// Apply calibration to a confidence score
    fn apply_calibration(predicted_confidence: u8, data: &[CalibrationDataPoint]) -> u8 {
        let bucket = (predicted_confidence / 10) * 10;
        
        // Find actual accuracy for this confidence bucket
        let bucket_data: Vec<_> = data
            .iter()
            .filter(|p| (p.predicted_confidence / 10) * 10 == bucket)
            .collect();
        
        if bucket_data.is_empty() {
            return predicted_confidence;
        }
        
        let correct_count = bucket_data.iter().filter(|p| p.actual_correct).count();
        let actual_accuracy = correct_count as f64 / bucket_data.len() as f64;
        
        // Calibrated confidence is the actual accuracy
        (actual_accuracy * 100.0) as u8
    }
    
    /// Check if recalibration is needed
    pub fn needs_recalibration(&self, vendor_id: Option<&str>) -> bool {
        let stats = if let Some(vid) = vendor_id {
            self.get_vendor_stats(vid)
        } else {
            Some(self.get_global_stats())
        };
        
        if let Some(stats) = stats {
            stats.calibration_error > self.recalibration_threshold
        } else {
            false
        }
    }
    
    /// Export calibration data
    pub fn export_calibration_data(&self) -> HashMap<String, Vec<CalibrationDataPoint>> {
        let mut export = HashMap::new();
        export.insert("global".to_string(), self.global_data.clone());
        
        for (vendor_id, data) in &self.vendor_data {
            export.insert(vendor_id.clone(), data.clone());
        }
        
        export
    }
    
    /// Get sample count
    pub fn get_sample_count(&self, vendor_id: Option<&str>) -> usize {
        if let Some(vid) = vendor_id {
            self.vendor_data.get(vid).map(|d| d.len()).unwrap_or(0)
        } else {
            self.global_data.len()
        }
    }
    
    /// Clear calibration data
    pub fn clear_data(&mut self, vendor_id: Option<&str>) {
        if let Some(vid) = vendor_id {
            self.vendor_data.remove(vid);
        } else {
            self.global_data.clear();
            self.vendor_data.clear();
        }
    }
}

impl Default for ConfidenceCalibrator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_data_point(confidence: u8, correct: bool) -> CalibrationDataPoint {
        CalibrationDataPoint {
            predicted_confidence: confidence,
            actual_correct: correct,
            field_name: "test_field".to_string(),
            vendor_id: None,
        }
    }
    
    #[test]
    fn test_calibrator_creation() {
        let calibrator = ConfidenceCalibrator::new();
        assert_eq!(calibrator.min_samples_for_calibration, 100);
        assert_eq!(calibrator.recalibration_threshold, 0.05);
    }
    
    #[test]
    fn test_add_data_point() {
        let mut calibrator = ConfidenceCalibrator::new();
        let data_point = create_test_data_point(90, true);
        
        calibrator.add_data_point(data_point);
        
        assert_eq!(calibrator.global_data.len(), 1);
    }
    
    #[test]
    fn test_add_vendor_data_point() {
        let mut calibrator = ConfidenceCalibrator::new();
        let mut data_point = create_test_data_point(90, true);
        data_point.vendor_id = Some("vendor-abc".to_string());
        
        calibrator.add_data_point(data_point);
        
        assert_eq!(calibrator.global_data.len(), 1);
        assert_eq!(calibrator.vendor_data.get("vendor-abc").unwrap().len(), 1);
    }
    
    #[test]
    fn test_calculate_stats() {
        let data = vec![
            create_test_data_point(90, true),
            create_test_data_point(90, true),
            create_test_data_point(90, false),
            create_test_data_point(80, true),
            create_test_data_point(80, false),
        ];
        
        let stats = ConfidenceCalibrator::calculate_stats(&data);
        
        assert_eq!(stats.total_samples, 5);
        assert_eq!(stats.overall_accuracy, 0.6); // 3/5 correct
        assert!(stats.accuracy_by_confidence.contains_key(&90));
    }
    
    #[test]
    fn test_calibrate_confidence_insufficient_data() {
        let calibrator = ConfidenceCalibrator::new();
        
        // Not enough data, should return original
        let calibrated = calibrator.calibrate_confidence(90, None);
        assert_eq!(calibrated, 90);
    }
    
    #[test]
    fn test_calibrate_confidence_with_data() {
        let mut calibrator = ConfidenceCalibrator::with_settings(5, 0.05);
        
        // Add data showing 90% confidence actually achieves 80% accuracy
        for _ in 0..8 {
            calibrator.add_data_point(create_test_data_point(90, true));
        }
        for _ in 0..2 {
            calibrator.add_data_point(create_test_data_point(90, false));
        }
        
        let calibrated = calibrator.calibrate_confidence(90, None);
        
        // Should be calibrated to actual accuracy (80%)
        assert_eq!(calibrated, 80);
    }
    
    #[test]
    fn test_get_global_stats() {
        let mut calibrator = ConfidenceCalibrator::new();
        
        calibrator.add_data_point(create_test_data_point(90, true));
        calibrator.add_data_point(create_test_data_point(80, false));
        
        let stats = calibrator.get_global_stats();
        
        assert_eq!(stats.total_samples, 2);
        assert_eq!(stats.overall_accuracy, 0.5);
    }
    
    #[test]
    fn test_get_vendor_stats() {
        let mut calibrator = ConfidenceCalibrator::new();
        
        let mut data_point = create_test_data_point(90, true);
        data_point.vendor_id = Some("vendor-abc".to_string());
        calibrator.add_data_point(data_point);
        
        let stats = calibrator.get_vendor_stats("vendor-abc").unwrap();
        
        assert_eq!(stats.total_samples, 1);
    }
    
    #[test]
    fn test_needs_recalibration() {
        let mut calibrator = ConfidenceCalibrator::with_settings(5, 0.1);
        
        // Add data with high calibration error
        for _ in 0..10 {
            calibrator.add_data_point(create_test_data_point(90, false)); // 90% predicted, 0% actual
        }
        
        assert!(calibrator.needs_recalibration(None));
    }
    
    #[test]
    fn test_export_calibration_data() {
        let mut calibrator = ConfidenceCalibrator::new();
        
        calibrator.add_data_point(create_test_data_point(90, true));
        
        let mut vendor_point = create_test_data_point(80, true);
        vendor_point.vendor_id = Some("vendor-abc".to_string());
        calibrator.add_data_point(vendor_point);
        
        let exported = calibrator.export_calibration_data();
        
        assert!(exported.contains_key("global"));
        assert!(exported.contains_key("vendor-abc"));
    }
    
    #[test]
    fn test_get_sample_count() {
        let mut calibrator = ConfidenceCalibrator::new();
        
        calibrator.add_data_point(create_test_data_point(90, true));
        calibrator.add_data_point(create_test_data_point(80, true));
        
        assert_eq!(calibrator.get_sample_count(None), 2);
    }
    
    #[test]
    fn test_clear_data() {
        let mut calibrator = ConfidenceCalibrator::new();
        
        calibrator.add_data_point(create_test_data_point(90, true));
        assert_eq!(calibrator.global_data.len(), 1);
        
        calibrator.clear_data(None);
        assert_eq!(calibrator.global_data.len(), 0);
    }
}
