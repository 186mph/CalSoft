// Asset Testing History Types

export interface AssetTestingHistory {
  id: string;
  created_at: string;
  updated_at: string;
  
  // Asset identification
  asset_id: string;
  job_id?: string | null;
  
  // Test information
  test_date: string;
  test_type: string;
  test_performed_by?: string | null;
  
  // Test results
  pass_fail_status: 'PASS' | 'FAIL' | 'CONDITIONAL';
  test_measurements?: TestMeasurements | null;
  notes?: string | null;
  
  // Equipment condition assessment
  condition_rating?: number | null; // 1-10 scale
  degradation_notes?: string | null;
  
  // Reference data
  test_standards?: string | null;
  environmental_conditions?: EnvironmentalConditions | null;
  
  // Metadata
  created_by?: string | null;
}

export interface TestMeasurements {
  // Common electrical measurements
  insulation_resistance?: {
    value: number;
    unit: string; // 'MΩ', 'GΩ', etc.
    test_voltage?: number;
  };
  
  continuity?: {
    value: number;
    unit: string; // 'Ω', 'mΩ', etc.
  };
  
  voltage?: {
    phase_a?: number;
    phase_b?: number;
    phase_c?: number;
    unit: string; // 'V', 'kV', etc.
  };
  
  current?: {
    phase_a?: number;
    phase_b?: number;
    phase_c?: number;
    unit: string; // 'A', 'mA', etc.
  };
  
  power?: {
    real_power?: number;
    reactive_power?: number;
    apparent_power?: number;
    power_factor?: number;
    unit: string; // 'W', 'kW', 'MW', etc.
  };
  
  // Temperature measurements
  temperature?: {
    ambient?: number;
    equipment?: number;
    unit: string; // '°C', '°F'
  };
  
  // Calibration specific measurements
  accuracy?: {
    measured_value: number;
    reference_value: number;
    error_percentage: number;
    tolerance: number;
  };
  
  // Visual inspection results
  visual_inspection?: {
    physical_damage: boolean;
    corrosion: boolean;
    wear_level: 'none' | 'light' | 'moderate' | 'severe';
    cleanliness: 'excellent' | 'good' | 'fair' | 'poor';
  };
  
  // Custom measurements for specific equipment types
  custom?: Record<string, any>;
}

export interface EnvironmentalConditions {
  temperature?: {
    value: number;
    unit: string; // '°C', '°F'
  };
  
  humidity?: {
    value: number;
    unit: string; // '%'
  };
  
  pressure?: {
    value: number;
    unit: string; // 'kPa', 'psi', etc.
  };
  
  location?: string;
  weather_conditions?: string;
}

export interface TestingHistoryStats {
  total_tests: number;
  pass_rate: number;
  average_condition_rating: number;
  latest_test_date: string;
  degradation_trend: 'improving' | 'stable' | 'declining' | 'unknown';
  tests_per_year: number;
}

export interface AssetWithTestingHistory {
  // Asset basic info
  id: string;
  name: string;
  file_url: string;
  created_at: string;
  asset_id?: string;
  job_id: string;
  
  // Testing history
  testing_history: AssetTestingHistory[];
  testing_stats: TestingHistoryStats;
  
  // Latest test info for quick display
  latest_test?: AssetTestingHistory;
  latest_condition_rating?: number;
  latest_pass_fail?: 'PASS' | 'FAIL' | 'CONDITIONAL';
}

export interface AddTestRecordData {
  asset_id: string;
  job_id?: string;
  test_type: string;
  test_date: string;
  pass_fail_status: 'PASS' | 'FAIL' | 'CONDITIONAL';
  test_measurements?: TestMeasurements;
  notes?: string;
  condition_rating?: number;
  degradation_notes?: string;
  test_standards?: string;
  environmental_conditions?: EnvironmentalConditions;
}

// Predefined test types for different asset categories
export const TEST_TYPES = {
  ELECTRICAL: [
    'insulation_resistance',
    'continuity',
    'voltage_measurement',
    'current_measurement',
    'power_measurement',
    'phase_sequence',
    'grounding_verification'
  ],
  CALIBRATION: [
    'accuracy_verification',
    'linearity_test',
    'repeatability_test',
    'hysteresis_test',
    'drift_analysis',
    'functional_test'
  ],
  VISUAL: [
    'visual_inspection',
    'physical_condition',
    'mounting_security',
    'labeling_verification',
    'documentation_review'
  ],
  SAFETY: [
    'safety_feature_test',
    'emergency_stop_test',
    'protective_device_test',
    'lockout_tagout_verification'
  ]
} as const;

export type TestTypeCategory = keyof typeof TEST_TYPES;
export type TestType = typeof TEST_TYPES[TestTypeCategory][number]; 