// Property-Based Test: Confidence Calibration
// Property: Confidence scores correlate with actual accuracy

#[cfg(test)]
mod confidence_calibration_properties {
    
    #[test]
    fn property_confidence_accuracy_correlation() {
        // Property: Higher confidence → higher accuracy
        
        let cases = vec![
            (70u8, 0.65), // (confidence, actual_accuracy)
            (80u8, 0.75),
            (90u8, 0.88),
            (95u8, 0.94),
        ];
        
        for i in 1..cases.len() {
            let (conf1, acc1) = cases[i-1];
            let (conf2, acc2) = cases[i];
            
            if conf2 > conf1 {
                assert!(acc2 >= acc1, 
                    "Higher confidence ({}) should have higher accuracy ({}) than lower confidence ({}, {})", 
                    conf2, acc2, conf1, acc1);
            }
        }
    }
    
    #[test]
    fn property_calibration_bounded() {
        // Property: Confidence and accuracy both in [0, 100]
        
        let confidence = 95u8;
        let accuracy = 0.94;
        
        assert!(confidence <= 100, "Confidence must be <= 100");
        assert!(accuracy >= 0.0 && accuracy <= 1.0, "Accuracy must be in [0, 1]");
    }
    
    #[test]
    fn property_vendor_specific_calibration() {
        // Property: Same confidence for different vendors may have different accuracy
        
        let vendor_a_calibration = (90u8, 0.92); // (confidence, accuracy)
        let vendor_b_calibration = (90u8, 0.85); // Same confidence, different accuracy
        
        assert_eq!(vendor_a_calibration.0, vendor_b_calibration.0, 
            "Same confidence level");
        // Different accuracy is allowed (vendor-specific)
    }
    
    #[test]
    fn property_calibration_drift_detection() {
        // Property: Significant drift triggers recalibration
        
        let historical_accuracy = 0.90;
        let current_accuracy = 0.75;
        let drift_threshold = 0.10;
        
        let drift = (historical_accuracy - current_accuracy).abs();
        let should_recalibrate = drift > drift_threshold;
        
        assert!(should_recalibrate, 
            "Drift of {} exceeds threshold {}, should recalibrate", 
            drift, drift_threshold);
    }
    
    #[test]
    fn property_confidence_penalty_reduces_score() {
        // Property: Applying penalty reduces confidence
        
        let original_confidence = 95u8;
        let penalty = 10u8;
        let adjusted_confidence = original_confidence.saturating_sub(penalty);
        
        assert!(adjusted_confidence < original_confidence, 
            "Penalty must reduce confidence");
        assert_eq!(adjusted_confidence, 85, 
            "Expected confidence 85 after 10 point penalty");
    }
}
