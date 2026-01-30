// Property-Based Tests for VIN Decoding
// Feature: sales-customer-management, Property 20: VIN decoding extracts vehicle information
// These tests validate that VIN decoding correctly extracts vehicle information

use proptest::prelude::*;
use serde::{Deserialize, Serialize};

// ============================================================================
// VIN Decoder Service (Mock Implementation for Testing)
// ============================================================================

/// Decoded vehicle information from a VIN
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VehicleInfo {
    pub make: String,
    pub model: String,
    pub year: i32,
    pub engine: Option<String>,
    pub trim: Option<String>,
}

/// VIN decoder service
/// In a real implementation, this would call an external API or use a VIN database
pub struct VinDecoder;

impl VinDecoder {
    /// Decode a VIN to extract vehicle information
    /// 
    /// VIN structure (simplified):
    /// - Positions 1-3: World Manufacturer Identifier (WMI) - identifies manufacturer
    /// - Position 4-6: Vehicle Descriptor Section (VDS) - vehicle attributes/model
    /// - Position 7-8: Vehicle Descriptor Section (VDS) - engine/attributes
    /// - Position 9: Check digit
    /// - Position 10: Model year
    /// - Position 11: Plant code
    /// - Positions 12-17: Sequential number
    /// 
    /// For testing purposes, we use a simplified decoding scheme:
    /// - Characters 1-3: Manufacturer code (maps to make)
    /// - Characters 4-6: Model code
    /// - Character 10: Year code
    /// - Characters 7-8: Engine code (optional - if not all digits)
    /// - Characters 11-17: Plant and sequential (used for trim extraction if available)
    pub fn decode(vin: &str) -> Result<VehicleInfo, String> {
        // Validate VIN length
        if vin.len() != 17 {
            return Err(format!("Invalid VIN length: expected 17 characters, got {}", vin.len()));
        }
        
        // Validate VIN characters (alphanumeric, no I, O, Q)
        if !vin.chars().all(|c| c.is_ascii_alphanumeric() && c != 'I' && c != 'O' && c != 'Q') {
            return Err("Invalid VIN: contains invalid characters (I, O, Q not allowed)".to_string());
        }
        
        // Extract manufacturer code (WMI)
        let wmi = &vin[0..3];
        let make = Self::decode_manufacturer(wmi);
        
        // Extract model code
        let model_code = &vin[3..6];
        let model = Self::decode_model(model_code);
        
        // Extract year from position 10 (0-indexed position 9)
        let year_char = vin.chars().nth(9).unwrap();
        let year = Self::decode_year(year_char)?;
        
        // Extract optional engine code from positions 7-8
        let engine_code = &vin[6..8];
        let engine = if engine_code.chars().all(|c| c.is_ascii_digit()) {
            None // All digits means no specific engine code
        } else {
            Some(Self::decode_engine(engine_code))
        };
        
        // Extract optional trim from plant code (position 11)
        let plant_char = vin.chars().nth(10).unwrap();
        let trim = if plant_char.is_ascii_digit() {
            None // Digit means no specific trim code
        } else {
            Some(format!("Trim-{}", plant_char))
        };
        
        Ok(VehicleInfo {
            make,
            model,
            year,
            engine,
            trim,
        })
    }
    
    fn decode_manufacturer(wmi: &str) -> String {
        // Simplified manufacturer mapping
        match &wmi[0..1] {
            "1" | "4" | "5" => "Ford".to_string(),
            "2" => "GM".to_string(),
            "3" => "Chrysler".to_string(),
            "J" => "Honda".to_string(),
            "K" => "Hyundai".to_string(),
            "L" => "Toyota".to_string(),
            "S" => "Nissan".to_string(),
            "W" => "Volkswagen".to_string(),
            "Z" => "Mazda".to_string(),
            _ => format!("Manufacturer-{}", wmi),
        }
    }
    
    fn decode_model(model_code: &str) -> String {
        // Simplified model mapping
        format!("Model-{}", model_code)
    }
    
    fn decode_year(year_char: char) -> Result<i32, String> {
        // Year encoding: A=1980, B=1981, ..., Y=2000, 1=2001, 2=2002, ..., 9=2009, A=2010, etc.
        // Simplified: A-Y = 2010-2034, 1-9 = 2001-2009, 0 = 2000
        match year_char {
            '0' => Ok(2000),
            '1' => Ok(2001),
            '2' => Ok(2002),
            '3' => Ok(2003),
            '4' => Ok(2004),
            '5' => Ok(2005),
            '6' => Ok(2006),
            '7' => Ok(2007),
            '8' => Ok(2008),
            '9' => Ok(2009),
            'A' => Ok(2010),
            'B' => Ok(2011),
            'C' => Ok(2012),
            'D' => Ok(2013),
            'E' => Ok(2014),
            'F' => Ok(2015),
            'G' => Ok(2016),
            'H' => Ok(2017),
            'J' => Ok(2018), // I is not used
            'K' => Ok(2019),
            'L' => Ok(2020),
            'M' => Ok(2021),
            'N' => Ok(2022),
            'P' => Ok(2023), // O is not used
            'R' => Ok(2024),
            'S' => Ok(2025),
            'T' => Ok(2026),
            'U' => Ok(2027),
            'V' => Ok(2028),
            'W' => Ok(2029),
            'X' => Ok(2030),
            'Y' => Ok(2031),
            _ => Err(format!("Invalid year character: {}", year_char)),
        }
    }
    
    fn decode_engine(engine_code: &str) -> String {
        format!("Engine-{}", engine_code)
    }
}

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a valid VIN character (alphanumeric except I, O, Q)
fn arb_vin_char() -> impl Strategy<Value = char> {
    prop_oneof![
        (48u8..=57u8).prop_map(|c| c as char),  // 0-9
        (65u8..=72u8).prop_map(|c| c as char),  // A-H
        Just('J'),
        (75u8..=78u8).prop_map(|c| c as char),  // K-N
        Just('P'),
        (82u8..=90u8).prop_map(|c| c as char),  // R-Z
    ]
}

/// Generate a valid year character for position 10
fn arb_year_char() -> impl Strategy<Value = char> {
    prop_oneof![
        (48u8..=57u8).prop_map(|c| c as char),  // 0-9
        (65u8..=72u8).prop_map(|c| c as char),  // A-H
        Just('J'),
        (75u8..=78u8).prop_map(|c| c as char),  // K-N
        Just('P'),
        (82u8..=89u8).prop_map(|c| c as char),  // R-Y (includes U)
    ]
}

/// Generate a valid manufacturer code (WMI)
fn arb_wmi() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("1FA".to_string()), // Ford
        Just("1G1".to_string()), // GM
        Just("2G1".to_string()), // GM
        Just("3C4".to_string()), // Chrysler
        Just("JHM".to_string()), // Honda
        Just("KMH".to_string()), // Hyundai
        Just("LVG".to_string()), // Toyota
        Just("SJN".to_string()), // Nissan
        Just("WVW".to_string()), // Volkswagen
        Just("ZFF".to_string()), // Mazda
    ]
}

/// Generate a valid model code (3 characters, no I, O, Q)
fn arb_model_code() -> impl Strategy<Value = String> {
    prop::collection::vec(
        prop_oneof![
            (48u8..=57u8).prop_map(|c| c as char),  // 0-9
            (65u8..=72u8).prop_map(|c| c as char),  // A-H
            Just('J'),
            (75u8..=78u8).prop_map(|c| c as char),  // K-N
            Just('P'),
            (82u8..=90u8).prop_map(|c| c as char),  // R-Z
        ],
        3..=3
    ).prop_map(|chars| chars.into_iter().collect())
}

/// Generate a valid engine code (may be digits or alphanumeric, no I, O, Q)
fn arb_engine_code() -> impl Strategy<Value = String> {
    prop_oneof![
        // All digits - no engine info
        prop::collection::vec((48u8..=57u8).prop_map(|c| c as char), 2..=2)
            .prop_map(|chars| chars.into_iter().collect()),
        // Alphanumeric engine code
        prop::collection::vec(
            prop_oneof![
                (48u8..=57u8).prop_map(|c| c as char),  // 0-9
                (65u8..=72u8).prop_map(|c| c as char),  // A-H
                Just('J'),
                (75u8..=78u8).prop_map(|c| c as char),  // K-N
                Just('P'),
                (82u8..=90u8).prop_map(|c| c as char),  // R-Z
            ],
            2..=2
        ).prop_map(|chars| chars.into_iter().collect())
            .prop_filter("Must have at least one letter", |s: &String| s.chars().any(|c| c.is_ascii_alphabetic())),
    ]
}

/// Generate a valid check digit
fn arb_check_digit() -> impl Strategy<Value = char> {
    prop_oneof![
        (48u8..=57u8).prop_map(|c| c as char),  // 0-9
        Just('X'),
    ]
}

/// Generate a valid plant code and sequential number (6 characters)
fn arb_plant_and_sequential() -> impl Strategy<Value = String> {
    prop::collection::vec(
        prop_oneof![
            (48u8..=57u8).prop_map(|c| c as char),  // 0-9
            (65u8..=72u8).prop_map(|c| c as char),  // A-H
            Just('J'),
            (75u8..=78u8).prop_map(|c| c as char),  // K-N
            Just('P'),
            (82u8..=90u8).prop_map(|c| c as char),  // R-Z
        ],
        6..=6
    ).prop_map(|chars| chars.into_iter().collect())
}

/// Generate a complete valid VIN (17 characters total)
/// Structure: WMI(3) + Model(3) + Engine(2) + Check(1) + Year(1) + Plant(1) + Sequential(6)
fn arb_valid_vin() -> impl Strategy<Value = String> {
    (
        arb_wmi(),                      // 3 chars
        arb_model_code(),               // 3 chars
        arb_engine_code(),              // 2 chars
        arb_check_digit(),              // 1 char
        arb_year_char(),                // 1 char
        arb_vin_char(),                 // 1 char (plant code)
        arb_plant_and_sequential(),     // 6 chars
    ).prop_map(|(wmi, model, engine, check, year, plant, seq)| {
        format!("{}{}{}{}{}{}{}", wmi, model, engine, check, year, plant, seq)
    })
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 20: VIN decoding extracts vehicle information
// For any valid VIN, decoding should extract make, model, year, and optionally 
// engine and trim information
// **Validates: Requirements 7.1**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_20_vin_decoding_extracts_vehicle_information(
        vin in arb_valid_vin()
    ) {
        // Decode the VIN
        let result = VinDecoder::decode(&vin);
        
        // Verify decoding succeeded
        prop_assert!(result.is_ok(), "VIN decoding should succeed for valid VIN: {}", vin);
        
        let vehicle_info = result.unwrap();
        
        // Verify required fields are populated
        prop_assert!(!vehicle_info.make.is_empty(), "Make should be extracted");
        prop_assert!(!vehicle_info.model.is_empty(), "Model should be extracted");
        prop_assert!(vehicle_info.year >= 2000 && vehicle_info.year <= 2031, 
                    "Year should be in valid range: {}", vehicle_info.year);
        
        // Engine and trim are optional, but if present should not be empty
        if let Some(ref engine) = vehicle_info.engine {
            prop_assert!(!engine.is_empty(), "Engine, if present, should not be empty");
        }
        
        if let Some(ref trim) = vehicle_info.trim {
            prop_assert!(!trim.is_empty(), "Trim, if present, should not be empty");
        }
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_vin_decoding_rejects_invalid_length(
        vin_length in 1..30usize,
    ) {
        // Skip valid length
        prop_assume!(vin_length != 17);
        
        // Generate a VIN with invalid length
        let invalid_vin: String = (0..vin_length)
            .map(|_| 'A')
            .collect();
        
        // Attempt to decode
        let result = VinDecoder::decode(&invalid_vin);
        
        // Verify decoding fails
        prop_assert!(result.is_err(), "VIN decoding should fail for invalid length");
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_vin_decoding_rejects_invalid_characters(
        valid_prefix in "[A-Z0-9]{10}",
        invalid_char in prop_oneof![Just('I'), Just('O'), Just('Q')],
        valid_suffix in "[A-Z0-9]{6}",
    ) {
        // Create VIN with invalid character
        let invalid_vin = format!("{}{}{}", valid_prefix, invalid_char, valid_suffix);
        
        // Attempt to decode
        let result = VinDecoder::decode(&invalid_vin);
        
        // Verify decoding fails
        prop_assert!(result.is_err(), 
                    "VIN decoding should fail for invalid characters (I, O, Q): {}", 
                    invalid_vin);
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_vin_decoding_is_deterministic(
        vin in arb_valid_vin()
    ) {
        // Decode the same VIN twice
        let result1 = VinDecoder::decode(&vin);
        let result2 = VinDecoder::decode(&vin);
        
        // Both should succeed
        prop_assert!(result1.is_ok() && result2.is_ok(), 
                    "VIN decoding should be consistent");
        
        // Results should be identical
        let info1 = result1.unwrap();
        let info2 = result2.unwrap();
        
        prop_assert_eq!(info1, info2, "VIN decoding should be deterministic");
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_vin_decoding_extracts_correct_year(
        wmi in arb_wmi(),
        model in arb_model_code(),
        engine in arb_engine_code(),
        check in arb_check_digit(),
        year_char in arb_year_char(),
        plant in arb_vin_char(),
        sequential in arb_plant_and_sequential(),
    ) {
        // Construct VIN with known year character (17 chars total)
        let vin = format!("{}{}{}{}{}{}{}", wmi, model, engine, check, year_char, plant, sequential);
        
        // Verify VIN is exactly 17 characters
        prop_assert_eq!(vin.len(), 17, "VIN should be exactly 17 characters");
        
        // Decode VIN
        let result = VinDecoder::decode(&vin);
        prop_assert!(result.is_ok(), "VIN decoding should succeed for VIN: {}", vin);
        
        let vehicle_info = result.unwrap();
        
        // Verify year is correctly extracted based on year character
        let expected_year = match year_char {
            '0' => 2000, '1' => 2001, '2' => 2002, '3' => 2003, '4' => 2004,
            '5' => 2005, '6' => 2006, '7' => 2007, '8' => 2008, '9' => 2009,
            'A' => 2010, 'B' => 2011, 'C' => 2012, 'D' => 2013, 'E' => 2014,
            'F' => 2015, 'G' => 2016, 'H' => 2017, 'J' => 2018, 'K' => 2019,
            'L' => 2020, 'M' => 2021, 'N' => 2022, 'P' => 2023, 'R' => 2024,
            'S' => 2025, 'T' => 2026, 'U' => 2027, 'V' => 2028, 'W' => 2029,
            'X' => 2030, 'Y' => 2031,
            _ => unreachable!(),
        };
        
        prop_assert_eq!(vehicle_info.year, expected_year, 
                       "Year should match expected value for character '{}'", year_char);
    }
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[test]
    fn test_decode_valid_vin_with_all_fields() {
        // Example VIN: 1FAHP3K20CL234567 (17 chars)
        // 1FA = Ford, HP3 = Model, K2 = Engine, 0 = Check, C = 2012, L = Plant, 234567 = Sequential
        let vin = "1FAHP3K20CL234567";
        let result = VinDecoder::decode(vin);
        
        assert!(result.is_ok(), "Failed to decode VIN: {:?}", result.err());
        let info = result.unwrap();
        
        assert_eq!(info.make, "Ford");
        assert!(!info.model.is_empty());
        assert_eq!(info.year, 2012);
        assert!(info.engine.is_some());
        assert!(info.trim.is_some()); // Plant code 'L' is not a digit
    }

    #[test]
    fn test_decode_valid_vin_without_optional_fields() {
        // VIN with all-digit engine code and digit plant code (no optional info)
        // Structure: WMI(3) + Model(3) + Engine(2) + Check(1) + Year(1) + Plant(1) + Sequential(6)
        // Year character 'C' at position 10 (0-indexed 9) = 2012
        let vin = "1FA123000C0123456";
        let result = VinDecoder::decode(vin);
        
        assert!(result.is_ok(), "Failed to decode VIN: {:?}", result.err());
        let info = result.unwrap();
        
        assert_eq!(info.make, "Ford");
        assert!(!info.model.is_empty());
        assert_eq!(info.year, 2012);
        assert!(info.engine.is_none());
        assert!(info.trim.is_none());
    }

    #[test]
    fn test_decode_invalid_length() {
        let short_vin = "1FA123";
        let result = VinDecoder::decode(short_vin);
        assert!(result.is_err());
        
        let long_vin = "1FA1230CL123456789";
        let result = VinDecoder::decode(long_vin);
        assert!(result.is_err());
    }

    #[test]
    fn test_decode_invalid_characters() {
        // VIN with 'I' (17 characters)
        let vin_with_i = "1FAI2300001234567";
        assert_eq!(vin_with_i.len(), 17);
        let result = VinDecoder::decode(vin_with_i);
        assert!(result.is_err());
        
        // VIN with 'O' (17 characters)
        let vin_with_o = "1FAO2300001234567";
        assert_eq!(vin_with_o.len(), 17);
        let result = VinDecoder::decode(vin_with_o);
        assert!(result.is_err());
        
        // VIN with 'Q' (17 characters)
        let vin_with_q = "1FAQ2300001234567";
        assert_eq!(vin_with_q.len(), 17);
        let result = VinDecoder::decode(vin_with_q);
        assert!(result.is_err());
    }

    #[test]
    fn test_decode_different_manufacturers() {
        // Structure: WMI(3) + Model(3) + Engine(2) + Check(1) + Year(1) + Plant(1) + Sequential(6)
        let test_cases = vec![
            ("1FA123000C0123456", "Ford"),
            ("2G1123000C0123456", "GM"),
            ("3C4123000C0123456", "Chrysler"),
            ("JHM123000C0123456", "Honda"),
            ("KMH123000C0123456", "Hyundai"),
            ("LVG123000C0123456", "Toyota"),
            ("SJN123000C0123456", "Nissan"),
            ("WVW123000C0123456", "Volkswagen"),
            ("ZFF123000C0123456", "Mazda"),
        ];
        
        for (vin, expected_make) in test_cases {
            assert_eq!(vin.len(), 17, "VIN should be 17 characters: {}", vin);
            let result = VinDecoder::decode(vin);
            assert!(result.is_ok(), "Failed to decode VIN: {}", vin);
            let info = result.unwrap();
            assert_eq!(info.make, expected_make, "Wrong make for VIN: {}", vin);
        }
    }

    #[test]
    fn test_decode_different_years() {
        // Structure: WMI(3) + Model(3) + Engine(2) + Check(1) + Year(1) + Plant(1) + Sequential(6)
        // Total = 17 characters, Year character is at position 10 (0-indexed 9)
        let test_cases = vec![
            ("1FA12300000123456", 2000),  // Year char '0' at position 9
            ("1FA12300010123456", 2001),  // Year char '1' at position 9
            ("1FA12300020123456", 2002),  // Year char '2' at position 9
            ("1FA123000A0123456", 2010),  // Year char 'A' at position 9
            ("1FA123000B0123456", 2011),  // Year char 'B' at position 9
            ("1FA123000C0123456", 2012),  // Year char 'C' at position 9
            ("1FA123000L0123456", 2020),  // Year char 'L' at position 9
            ("1FA123000P0123456", 2023),  // Year char 'P' at position 9
        ];
        
        for (vin, expected_year) in test_cases {
            assert_eq!(vin.len(), 17, "VIN should be 17 characters: {}", vin);
            let result = VinDecoder::decode(vin);
            assert!(result.is_ok(), "Failed to decode VIN: {}", vin);
            let info = result.unwrap();
            assert_eq!(info.year, expected_year, "Wrong year for VIN: {}", vin);
        }
    }
}
