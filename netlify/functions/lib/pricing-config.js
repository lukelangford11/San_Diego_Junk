/**
 * Pricing Configuration Module
 * Centralizes ALL pricing logic for easy tuning without code changes
 * Anchored to Fred's Junk Removal competitor pricing
 */

// COUCH SIZING MODEL (estimator-only, non-editable)
// Seat-based volume baselines in cubic yards
export const COUCH_SIZES = {
  '2_seat': { yards: 1.0, label: '2-seat loveseat' },
  '3_seat': { yards: 1.5, label: '3-seat sofa' },
  '4_seat': { yards: 2.0, label: '4-seat sofa' },
  'small_sectional': { yards: 2.5, label: 'Small sectional' },
  'large_sectional': { yards: 3.25, label: 'Large sectional' }
};

/**
 * ITEM BASELINES (estimator-only, single source of truth)
 * Maps canonical item types to volume and display info
 * DO NOT expose yards to users directly - used for internal calculation only
 */
export const ITEM_BASELINES = {
  // Furniture
  loveseat_2_seat: { yards: 1.0, label: '2-seat loveseat', minQty: 1, maxQty: 5 },
  sofa_3_seat: { yards: 1.5, label: '3-seat sofa', minQty: 1, maxQty: 5 },
  sofa_4_seat: { yards: 2.0, label: '4-seat sofa', minQty: 1, maxQty: 3 },
  sectional_small: { yards: 2.5, label: 'Sectional (small)', minQty: 1, maxQty: 2 },
  sectional_large: { yards: 3.25, label: 'Sectional (large)', minQty: 1, maxQty: 2 },
  recliner: { yards: 0.75, label: 'Recliner', minQty: 1, maxQty: 6 },
  dining_chair: { yards: 0.25, label: 'Dining chair', minQty: 1, maxQty: 12 },
  dining_table: { yards: 1.0, label: 'Dining table', minQty: 1, maxQty: 3 },
  coffee_table: { yards: 0.5, label: 'Coffee table', minQty: 1, maxQty: 4 },
  end_table: { yards: 0.25, label: 'End table', minQty: 1, maxQty: 6 },
  desk: { yards: 0.75, label: 'Desk', minQty: 1, maxQty: 4 },
  office_chair: { yards: 0.35, label: 'Office chair', minQty: 1, maxQty: 8 },
  bookshelf: { yards: 0.75, label: 'Bookshelf', minQty: 1, maxQty: 6 },
  dresser: { yards: 1.0, label: 'Dresser', minQty: 1, maxQty: 4 },
  nightstand: { yards: 0.25, label: 'Nightstand', minQty: 1, maxQty: 6 },
  bed_frame_twin: { yards: 0.5, label: 'Bed frame (twin)', minQty: 1, maxQty: 4 },
  bed_frame_full: { yards: 0.75, label: 'Bed frame (full)', minQty: 1, maxQty: 3 },
  bed_frame_queen: { yards: 1.0, label: 'Bed frame (queen)', minQty: 1, maxQty: 3 },
  bed_frame_king: { yards: 1.25, label: 'Bed frame (king)', minQty: 1, maxQty: 2 },
  
  // Mattresses
  mattress_twin: { yards: 0.5, label: 'Mattress (twin)', minQty: 1, maxQty: 6 },
  mattress_full: { yards: 0.75, label: 'Mattress (full)', minQty: 1, maxQty: 4 },
  mattress_queen: { yards: 1.0, label: 'Mattress (queen)', minQty: 1, maxQty: 4 },
  mattress_king: { yards: 1.25, label: 'Mattress (king)', minQty: 1, maxQty: 3 },
  mattress_boxspring: { yards: 1.0, label: 'Mattress + box spring', minQty: 1, maxQty: 4 },
  
  // Appliances
  refrigerator: { yards: 1.75, label: 'Refrigerator', minQty: 1, maxQty: 3 },
  washer: { yards: 0.75, label: 'Washer', minQty: 1, maxQty: 3 },
  dryer: { yards: 0.75, label: 'Dryer', minQty: 1, maxQty: 3 },
  washer_dryer_pair: { yards: 1.5, label: 'Washer & dryer', minQty: 1, maxQty: 2 },
  dishwasher: { yards: 0.5, label: 'Dishwasher', minQty: 1, maxQty: 3 },
  stove: { yards: 0.75, label: 'Stove/range', minQty: 1, maxQty: 3 },
  microwave: { yards: 0.15, label: 'Microwave', minQty: 1, maxQty: 5 },
  window_ac: { yards: 0.25, label: 'Window AC unit', minQty: 1, maxQty: 6 },
  water_heater: { yards: 0.75, label: 'Water heater', minQty: 1, maxQty: 2 },
  
  // Electronics
  tv_small: { yards: 0.15, label: 'TV (small)', minQty: 1, maxQty: 8 },
  tv_large: { yards: 0.35, label: 'TV (large/flat)', minQty: 1, maxQty: 6 },
  computer_desktop: { yards: 0.15, label: 'Desktop computer', minQty: 1, maxQty: 8 },
  computer_monitor: { yards: 0.1, label: 'Monitor', minQty: 1, maxQty: 10 },
  printer: { yards: 0.15, label: 'Printer', minQty: 1, maxQty: 6 },
  
  // Misc household
  trash_bag: { yards: 0.125, label: 'Trash bag', minQty: 1, maxQty: 40 },
  box_small: { yards: 0.1, label: 'Box (small)', minQty: 1, maxQty: 30 },
  box_medium: { yards: 0.2, label: 'Box (medium)', minQty: 1, maxQty: 25 },
  box_large: { yards: 0.35, label: 'Box (large)', minQty: 1, maxQty: 20 },
  bin_95_gal: { yards: 0.5, label: '95-gal bin', minQty: 1, maxQty: 10 },
  
  // Yard waste
  yard_debris_pile: { yards: 1.0, label: 'Yard debris pile', minQty: 1, maxQty: 10 },
  tree_branches: { yards: 0.5, label: 'Tree branches (bundle)', minQty: 1, maxQty: 15 },
  
  // Construction
  construction_debris: { yards: 1.0, label: 'Construction debris', minQty: 1, maxQty: 15 },
  drywall_sheet: { yards: 0.1, label: 'Drywall sheet', minQty: 1, maxQty: 30 },
  lumber_bundle: { yards: 0.5, label: 'Lumber bundle', minQty: 1, maxQty: 10 },
  
  // Special
  hot_tub: { yards: 4.0, label: 'Hot tub', minQty: 1, maxQty: 2 },
  piano_upright: { yards: 2.0, label: 'Piano (upright)', minQty: 1, maxQty: 2 },
  piano_grand: { yards: 4.0, label: 'Piano (grand)', minQty: 1, maxQty: 1 },
  treadmill: { yards: 1.0, label: 'Treadmill', minQty: 1, maxQty: 3 },
  elliptical: { yards: 1.0, label: 'Elliptical', minQty: 1, maxQty: 3 },
  
  // Generic fallbacks
  misc_furniture: { yards: 0.75, label: 'Misc furniture', minQty: 1, maxQty: 10 },
  misc_appliance: { yards: 0.5, label: 'Misc appliance', minQty: 1, maxQty: 10 },
  misc_items: { yards: 0.25, label: 'Misc items', minQty: 1, maxQty: 20 }
};

/**
 * Get item baseline by canonical type
 */
export function getItemBaseline(canonicalType) {
  return ITEM_BASELINES[canonicalType] || ITEM_BASELINES.misc_items;
}

export const PRICING_CONFIG = {
  // Service type base rates (Fred's competitor anchor)
  serviceTypes: {
    curbside: {
      base_rate_per_yard: 30,        // Fred's anchor: $30/yd
      min_charge: 79,                 // Safety floor (above Fred's $60 2yd min)
      min_cubic_yards: 2,             // Competitor standard
      name_display: "Curbside Pickup"
    },
    full_service: {
      base_rate_per_yard: 40,        // Fred's anchor: $40/yd
      min_charge: 119,                // Safety floor
      min_cubic_yards: 2,
      name_display: "Full Service (garage/home)"
    }
  },
  
  // Market positioning (future use)
  pricingModel: "budget_competitive", // or "premium"
  premiumMultiplier: 1.25,            // For premium model
  
  // Heavy material overrides
  heavyMaterials: {
    construction: {
      rate_multiplier: 1.5,           // +50% for heavy demo/concrete
      add_on_min: 50,                 // Additional fee range
      add_on_max: 150,
      triggers: ["construction", "concrete", "drywall", "lumber"]
    },
    yard_debris: {
      rate_multiplier: 1.2,           // +20% for heavy branches
      add_on_min: 0,
      add_on_max: 75,
      triggers: ["yard_waste", "branches", "tree"]
    },
    appliances_heavy: {
      rate_multiplier: 1.0,           // Base rate
      add_on_min: 30,                 // Per-item add-on
      add_on_max: 100,
      triggers: ["appliances", "refrigerator", "washer", "dryer", "stove"]
    },
    special_items: {
      rate_multiplier: 1.3,
      add_on_min: 75,
      add_on_max: 200,
      triggers: ["hot_tub", "piano", "safe"]
    }
  },
  
  // Access difficulty multipliers
  accessMultipliers: {
    curbside: 1.0,                    // Already easy
    ground_garage: 1.0,               // No stairs
    inside_home: 1.2,                 // +20% for interior
    upstairs: 1.35                    // +35% for stairs
  },
  
  // Confidence-based range widening
  rangeWidthFactors: {
    high_confidence: 0.15,            // ±15% range
    medium_confidence: 0.25,          // ±25% range  
    low_confidence: 0.40,             // ±40% range
    heavy_materials_bonus: 0.10,      // Add ±10% if heavy
    service_type_unknown_bonus: 0.15  // Add ±15% if user didn't confirm
  },
  
  // Absolute safety bounds
  absolute_min_price: 59,             // Never quote below this
  absolute_max_price: 1500,           // Cap outliers
};

/**
 * Get service type configuration
 */
export function getServiceTypeConfig(serviceType) {
  // Normalize service type to base types (curbside or full_service)
  const normalizedType = normalizeServiceType(serviceType);
  return PRICING_CONFIG.serviceTypes[normalizedType];
}

/**
 * Normalize various service type values to base types
 */
export function normalizeServiceType(serviceType) {
  const typeMap = {
    'curbside': 'curbside',
    'ground_garage': 'full_service',
    'inside_home': 'full_service',
    'upstairs': 'full_service',
    'full_service': 'full_service'
  };
  
  return typeMap[serviceType] || 'full_service'; // Default to full_service (safer)
}

/**
 * Detect heavy materials from item categories and detected items
 */
export function detectHeavyMaterials(itemCategories = [], detectedItems = []) {
  const allItems = [...itemCategories, ...detectedItems].map(item => 
    item.toLowerCase()
  );
  
  let heavyMaterialType = null;
  let matchedTriggers = [];
  
  // Check each heavy material category
  for (const [materialType, config] of Object.entries(PRICING_CONFIG.heavyMaterials)) {
    const matches = config.triggers.filter(trigger => 
      allItems.some(item => item.includes(trigger))
    );
    
    if (matches.length > 0) {
      // Use the most severe multiplier if multiple categories match
      if (!heavyMaterialType || 
          config.rate_multiplier > PRICING_CONFIG.heavyMaterials[heavyMaterialType].rate_multiplier) {
        heavyMaterialType = materialType;
        matchedTriggers = matches;
      }
    }
  }
  
  return {
    detected: !!heavyMaterialType,
    type: heavyMaterialType,
    config: heavyMaterialType ? PRICING_CONFIG.heavyMaterials[heavyMaterialType] : null,
    triggers: matchedTriggers
  };
}

/**
 * Get access multiplier for user-confirmed access type
 */
export function getAccessMultiplier(accessType) {
  return PRICING_CONFIG.accessMultipliers[accessType] || 
         PRICING_CONFIG.accessMultipliers.inside_home; // Default to higher multiplier
}

/**
 * Get default couch size based on AI-detected cushion count
 * Estimator-only logic: maps detection to size key
 */
export function getDefaultCouchSize(cushionCount, hasLShape = false) {
  if (hasLShape || cushionCount >= 5) {
    return 'small_sectional';
  }
  if (cushionCount === 2) {
    return '2_seat';
  }
  if (cushionCount === 4) {
    return '4_seat';
  }
  // Default to 3-seat for uncertain/3 cushions
  return '3_seat';
}

/**
 * Validate couch size ordering for safety (estimator-only)
 * Returns true if sizeA >= sizeB in volume ordering
 */
export function validateCouchSizeOrdering(sizeA, sizeB) {
  const yardsA = COUCH_SIZES[sizeA]?.yards || 0;
  const yardsB = COUCH_SIZES[sizeB]?.yards || 0;
  return yardsA >= yardsB;
}

/**
 * Calculate range width factor based on confidence and conditions
 */
export function calculateRangeWidthFactor(confidence, hasHeavyMaterials, serviceTypeSource) {
  const factors = PRICING_CONFIG.rangeWidthFactors;
  
  // Base range from confidence
  let baseRange = factors.medium_confidence; // Default
  if (confidence === 'high') {
    baseRange = factors.high_confidence;
  } else if (confidence === 'low') {
    baseRange = factors.low_confidence;
  }
  
  // Add bonuses
  let totalRange = baseRange;
  
  if (hasHeavyMaterials) {
    totalRange += factors.heavy_materials_bonus;
  }
  
  if (serviceTypeSource !== 'user_confirmed') {
    totalRange += factors.service_type_unknown_bonus;
  }
  
  return totalRange;
}
