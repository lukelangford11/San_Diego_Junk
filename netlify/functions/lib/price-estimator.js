import { getZoneMultiplier } from './zone-config.js';
import { 
  PRICING_CONFIG,
  COUCH_SIZES,
  getServiceTypeConfig,
  normalizeServiceType,
  detectHeavyMaterials,
  getAccessMultiplier,
  calculateRangeWidthFactor,
  getDefaultCouchSize,
  validateCouchSizeOrdering
} from './pricing-config.js';

/**
 * AI Price Estimator Module - Enhanced Version
 * Competitor-anchored pricing with service type inference, heavy material overrides,
 * confidence-based ranges, and full configurability
 */

/**
 * Main estimation function with enhanced pricing logic
 */
export function estimatePrice({
  visionData = null,
  userServiceType = null,      // User-confirmed type (overrides inference)
  userAccessType = null,        // User-selected access difficulty
  userCouchSize = null,         // User-selected couch size (estimator-only)
  photoCount = 0,
  itemTypes = [],
  zipCode,
  notes = ''
}) {
  // If vision data is available, use the enhanced pricing method
  if (visionData && visionData.volumeCubicYards) {
    return estimatePriceWithVision({
      visionData,
      userServiceType,
      userAccessType,
      userCouchSize,
      zipCode,
      notes
    });
  }
  
  // Otherwise, fall back to legacy photo-count method
  return estimatePriceLegacy({ photoCount, itemTypes, zipCode, notes });
}

/**
 * Vision-powered estimation with competitor-anchored tiered pricing
 */
function estimatePriceWithVision({
  visionData,
  userServiceType,
  userAccessType,
  userCouchSize,
  zipCode,
  notes
}) {
  const {
    volumeCubicYards,
    itemCategories,
    inferredServiceType,
    serviceTypeConfidence,
    confidence: visionConfidence,
    specialConcerns,
    visionReasoningTags,
    couchCushionCount,
    couchIsSectional,
    notes: visionNotes
  } = visionData;
  
  // Step 1: Determine service type (user > inferred > default to full_service)
  let serviceType = userServiceType || inferredServiceType || 'full_service';
  const serviceTypeSource = userServiceType ? 'user_confirmed' : 
                            (inferredServiceType && inferredServiceType !== 'unknown' ? 'ai_inferred' : 'default');
  
  // Normalize to base type (curbside or full_service)
  const normalizedServiceType = normalizeServiceType(serviceType);
  const serviceConfig = getServiceTypeConfig(normalizedServiceType);
  
  // Step 2: Apply couch blending logic (estimator-only)
  // Defensive blending: finalCouchYards = max(aiDetectedCouchYards * 0.9, selectedCouchBaseline)
  let volumeAdjustment = 0;
  let couchSizeUsed = null;
  
  if (itemCategories.includes('furniture') && (couchCushionCount || userCouchSize)) {
    // Determine couch size: user selection overrides AI detection
    const detectedSize = getDefaultCouchSize(couchCushionCount, couchIsSectional);
    const selectedSize = userCouchSize || detectedSize;
    couchSizeUsed = selectedSize;
    
    // SAFETY CHECK 1: Validate couch size key exists
    if (!COUCH_SIZES[selectedSize]) {
      console.error(`[ESTIMATOR] Invalid couch size: ${selectedSize}`);
      couchSizeUsed = '3_seat'; // Fallback to default
    }
    
    // Get baseline volume for selected couch size
    const couchBaseline = COUCH_SIZES[couchSizeUsed]?.yards || 1.5;
    
    // SAFETY CHECK 2: Ensure couch size ordering is monotonic (larger = more volume)
    const sizeOrder = ['2_seat', '3_seat', '4_seat', 'small_sectional', 'large_sectional'];
    const detectedIndex = sizeOrder.indexOf(detectedSize);
    const selectedIndex = sizeOrder.indexOf(couchSizeUsed);
    if (detectedIndex >= 0 && selectedIndex < detectedIndex) {
      console.warn(`[ESTIMATOR] User selected smaller couch than detected: ${couchSizeUsed} < ${detectedSize}`);
    }
    
    // Estimate AI-detected couch volume as portion of total (assume couch is ~30-50% of furniture)
    const aiCouchEstimate = volumeCubicYards * 0.4;
    
    // Defensive blending: use max of (AI * 0.9) and baseline
    // This prevents gaming while respecting AI when it detects larger volumes
    const blendedCouchVolume = Math.max(aiCouchEstimate * 0.9, couchBaseline);
    
    // SAFETY CHECK 3: Ensure blended volume never decreases with larger size selection
    if (selectedIndex > detectedIndex && blendedCouchVolume < couchBaseline) {
      console.error(`[ESTIMATOR] Blended volume decreased for larger couch: ${blendedCouchVolume} < ${couchBaseline}`);
    }
    
    // Adjust total volume: replace AI's implicit couch volume with blended volume
    volumeAdjustment = blendedCouchVolume - aiCouchEstimate;
  }
  
  // Step 2b: Apply minimum volume (competitor standard: 2 cubic yards)
  const adjustedVolume = Math.max(volumeCubicYards + volumeAdjustment, serviceConfig.min_cubic_yards);
  
  // Step 3: Detect heavy materials
  const heavyMaterial = detectHeavyMaterials(itemCategories, specialConcerns);
  
  // Step 4: Base calculation using service type rate
  let basePrice = adjustedVolume * serviceConfig.base_rate_per_yard;
  
  // Step 5: Apply heavy material overrides
  if (heavyMaterial.detected) {
    const heavyConfig = heavyMaterial.config;
    basePrice *= heavyConfig.rate_multiplier;
    
    // Add heavy material add-on fee (use midpoint for base calculation)
    const addOnMidpoint = (heavyConfig.add_on_min + heavyConfig.add_on_max) / 2;
    basePrice += addOnMidpoint;
  }
  
  // Step 6: Apply access multiplier (from user selection or default)
  const accessType = userAccessType || (normalizedServiceType === 'curbside' ? 'curbside' : 'ground_garage');
  const accessMultiplier = getAccessMultiplier(accessType);
  basePrice *= accessMultiplier;
  
  // Step 7: Apply zone-based pricing
  const { zone, multiplier: zoneMultiplier, label: zoneLabel } = getZoneMultiplier(zipCode);
  basePrice *= zoneMultiplier;
  
  // Step 8: Calculate range width factor
  const rangeWidthFactor = calculateRangeWidthFactor(
    visionConfidence,
    heavyMaterial.detected,
    serviceTypeSource
  );
  
  // Step 9: Apply range to get min/max
  let calculatedMin = basePrice * (1 - rangeWidthFactor);
  let calculatedMax = basePrice * (1 + rangeWidthFactor);
  
  // Step 10: Apply safety floors and ceilings
  const finalMin = Math.max(
    serviceConfig.min_charge,
    PRICING_CONFIG.absolute_min_price,
    Math.round(calculatedMin)
  );
  
  const finalMax = Math.min(
    PRICING_CONFIG.absolute_max_price,
    Math.round(calculatedMax)
  );
  
  // Ensure min < max
  const safeMin = Math.min(finalMin, finalMax);
  const safeMax = Math.max(finalMin, finalMax);
  
  // SAFETY CHECK 4: Final price validation
  if (safeMin > safeMax) {
    console.error(`[ESTIMATOR] Price range invalid: min=${safeMin} > max=${safeMax}`);
  }
  if (safeMin < PRICING_CONFIG.absolute_min_price) {
    console.error(`[ESTIMATOR] Price below absolute minimum: ${safeMin} < ${PRICING_CONFIG.absolute_min_price}`);
  }
  
  // SAFETY CHECK 5: Sectional couch pricing validation
  if (couchSizeUsed && (couchSizeUsed.includes('sectional'))) {
    // Ensure sectionals never price below standard sofas
    if (!validateCouchSizeOrdering(couchSizeUsed, '3_seat')) {
      console.error(`[ESTIMATOR] Sectional couch priced below standard sofa: ${couchSizeUsed}`);
    }
  }
  
  // Step 11: Generate detailed pricing breakdown for calibration
  const pricingBreakdown = {
    base_rate: serviceConfig.base_rate_per_yard,
    adjusted_volume: adjustedVolume,
    service_type: normalizedServiceType,
    heavy_material_multiplier: heavyMaterial.detected ? heavyMaterial.config.rate_multiplier : 1.0,
    heavy_material_addon: heavyMaterial.detected ? 
      (heavyMaterial.config.add_on_min + heavyMaterial.config.add_on_max) / 2 : 0,
    access_multiplier: accessMultiplier,
    zone_multiplier: zoneMultiplier,
    range_width_percent: Math.round(rangeWidthFactor * 100)
  };
  
  // Step 12: Generate human-readable assumptions
  const assumptions = generateEnhancedAssumptions({
    adjustedVolume,
    volumeCubicYards,
    serviceType: normalizedServiceType,
    serviceTypeSource,
    itemCategories,
    accessType,
    heavyMaterial,
    zone,
    zoneLabel,
    zoneMultiplier,
    visionConfidence,
    couchSizeUsed,
    visionNotes
  });
  
  return {
    min_price: safeMin,
    max_price: safeMax,
    confidence: visionConfidence,
    assumptions,
    zone,
    method: 'vision',
    
    // Enhanced fields for iOS API and calibration
    service_type_used: normalizedServiceType,
    service_type_source: serviceTypeSource,
    cubic_yards_raw: volumeCubicYards,
    cubic_yards_adjusted: adjustedVolume,
    heavy_materials_detected: heavyMaterial.detected,
    heavy_material_type: heavyMaterial.type,
    access_type: accessType,
    couch_size_used: couchSizeUsed,
    pricing_breakdown: pricingBreakdown
  };
}

/**
 * Legacy estimation function (photo count method)
 * Used as fallback when vision is unavailable
 */
function estimatePriceLegacy({ photoCount, itemTypes = [], zipCode, notes = '' }) {
  // Base pricing constants (legacy method)
  const BASE_PRICE_PER_PHOTO_MIN = 65;
  const BASE_PRICE_PER_PHOTO_MAX = 110;
  const ABSOLUTE_MIN_PRICE = 120;
  const ABSOLUTE_MAX_PRICE = 1200;
  
  // Item type multipliers
  const ITEM_TYPE_MULTIPLIERS = {
    furniture: 1.0,
    appliances: 1.2,
    yard_waste: 0.9,
    hot_tub: 1.5,
    construction: 1.3,
    electronics: 1.1,
    other: 1.0
  };
  
  // Step 1: Base volume calculation (photos as proxy for volume)
  let baseMin = photoCount * BASE_PRICE_PER_PHOTO_MIN;
  let baseMax = photoCount * BASE_PRICE_PER_PHOTO_MAX;

  // Step 2: Apply item type multipliers
  const itemMultiplier = calculateItemTypeMultiplier(itemTypes, ITEM_TYPE_MULTIPLIERS);
  baseMin *= itemMultiplier;
  baseMax *= itemMultiplier;

  // Step 3: Apply zone-based pricing
  const { zone, multiplier: zoneMultiplier, label: zoneLabel } = getZoneMultiplier(zipCode);
  baseMin *= zoneMultiplier;
  baseMax *= zoneMultiplier;

  // Step 4: Apply floors and ceilings
  const finalMin = Math.max(ABSOLUTE_MIN_PRICE, Math.round(baseMin));
  const finalMax = Math.min(ABSOLUTE_MAX_PRICE, Math.round(baseMax));

  // Ensure min < max
  const safeMin = Math.min(finalMin, finalMax);
  const safeMax = Math.max(finalMin, finalMax);

  // Step 5: Calculate confidence level
  const confidence = calculateConfidence(photoCount, itemTypes, notes);

  // Step 6: Generate human-readable assumptions
  const assumptions = generateLegacyAssumptions({
    photoCount,
    itemTypes,
    itemMultiplier,
    zone,
    zoneLabel,
    zoneMultiplier,
    confidence,
    notes
  });

  return {
    min_price: safeMin,
    max_price: safeMax,
    confidence,
    assumptions,
    zone,
    method: 'legacy',
    service_type_used: 'unknown',
    service_type_source: 'legacy_fallback'
  };
}

/**
 * Calculate average item type multiplier (legacy method)
 */
function calculateItemTypeMultiplier(itemTypes, multipliers) {
  if (!itemTypes || itemTypes.length === 0) {
    return 1.0;
  }

  const sum = itemTypes.reduce((total, type) => {
    return total + (multipliers[type] || 1.0);
  }, 0);

  return sum / itemTypes.length;
}

/**
 * Calculate confidence level (legacy method)
 */
function calculateConfidence(photoCount, itemTypes, notes) {
  let score = 0;

  if (photoCount >= 4) {
    score += 3;
  } else if (photoCount >= 2) {
    score += 2;
  } else {
    score += 1;
  }

  if (itemTypes && itemTypes.length > 0) {
    score += 2;
  }

  if (notes && notes.trim().length > 20) {
    score += 1;
  }

  if (score <= 2) return 'low';
  if (score <= 4) return 'medium';
  return 'high';
}

/**
 * Generate enhanced assumptions string for vision-powered estimates
 */
function generateEnhancedAssumptions({
  adjustedVolume,
  volumeCubicYards,
  serviceType,
  serviceTypeSource,
  itemCategories,
  accessType,
  heavyMaterial,
  zone,
  zoneLabel,
  zoneMultiplier,
  visionConfidence,
  couchSizeUsed,
  visionNotes
}) {
  const parts = [];
  
  // Volume description
  const volumeDesc = adjustedVolume <= 2 ? 'small load' :
                     adjustedVolume <= 5 ? 'moderate load' :
                     adjustedVolume <= 10 ? 'substantial load' : 'large load';
  
  let volumeText = `AI-analyzed volume: ~${adjustedVolume} cubic yards (${volumeDesc})`;
  if (adjustedVolume > volumeCubicYards) {
    volumeText += ` - adjusted from ${volumeCubicYards} yd to meet 2 yd minimum`;
  }
  parts.push(volumeText);
  
  // Service type
  const serviceTypeConfig = getServiceTypeConfig(serviceType);
  let serviceText = `Service: ${serviceTypeConfig.name_display}`;
  if (serviceTypeSource === 'user_confirmed') {
    serviceText += ' (confirmed by you)';
  } else if (serviceTypeSource === 'ai_inferred') {
    serviceText += ' (AI detected)';
  } else {
    serviceText += ' (default - please confirm location)';
  }
  parts.push(serviceText);
  
  // Access type
  const accessLabels = {
    curbside: 'Curbside/driveway access',
    ground_garage: 'Ground-level garage',
    inside_home: 'Inside home',
    upstairs: 'Upstairs/multi-level'
  };
  parts.push(`Access: ${accessLabels[accessType] || 'Standard'}`);
  
  // Detected items (with specific couch size if applicable)
  if (itemCategories && itemCategories.length > 0) {
    const itemList = itemCategories
      .map(item => {
        // Replace generic "furniture" with specific couch size
        if (item === 'furniture' && couchSizeUsed) {
          return COUCH_SIZES[couchSizeUsed]?.label || 'furniture';
        }
        return formatItemType(item);
      })
      .join(', ');
    parts.push(`Items detected: ${itemList}`);
  }
  
  // Heavy materials flag
  if (heavyMaterial.detected) {
    parts.push(`Heavy materials: ${formatHeavyMaterialType(heavyMaterial.type)} (+${Math.round((heavyMaterial.config.rate_multiplier - 1) * 100)}% rate)`);
  }
  
  // Location
  if (zoneMultiplier === 1.0) {
    parts.push(`Location: ${zoneLabel} (standard pricing)`);
  } else {
    parts.push(`Location: ${zoneLabel} (+${Math.round((zoneMultiplier - 1) * 100)}% distance fee)`);
  }
  
  // Confidence
  if (visionConfidence === 'high') {
    parts.push('AI confidence: High - Clear photos, accurate estimate');
  } else if (visionConfidence === 'medium') {
    parts.push('AI confidence: Medium - Good estimate, on-site verification recommended');
  } else {
    parts.push('AI confidence: Low - Wide range due to photo quality, on-site assessment recommended');
  }
  
  // Vision notes
  if (visionNotes && visionNotes.length > 0) {
    parts.push(visionNotes);
  }
  
  return parts.join('. ') + '.';
}

/**
 * Generate legacy assumptions string
 */
function generateLegacyAssumptions({
  photoCount,
  itemTypes,
  itemMultiplier,
  zone,
  zoneLabel,
  zoneMultiplier,
  confidence,
  notes
}) {
  const parts = [];

  if (photoCount === 1) {
    parts.push('Based on 1 photo showing minimal volume');
  } else if (photoCount <= 3) {
    parts.push(`Based on ${photoCount} photos showing moderate volume`);
  } else {
    parts.push(`Based on ${photoCount} photos showing substantial volume`);
  }

  if (itemTypes && itemTypes.length > 0) {
    const itemList = itemTypes.map(formatItemType).join(', ');
    parts.push(`including ${itemList}`);
  } else {
    parts.push('with unspecified item types');
  }

  if (zoneMultiplier === 1.0) {
    parts.push(`in ${zoneLabel} (standard pricing)`);
  } else {
    parts.push(`in ${zoneLabel} (${Math.round((zoneMultiplier - 1) * 100)}% distance surcharge)`);
  }

  if (confidence === 'low') {
    parts.push('Low confidence - recommend on-site assessment');
  } else if (confidence === 'high') {
    parts.push('High confidence estimate');
  }

  parts.push('Assumes ground-level access and standard disposal');

  return parts.join('. ') + '.';
}

/**
 * Format item type for display
 */
function formatItemType(type) {
  const labels = {
    furniture: 'furniture',
    appliances: 'appliances',
    yard_waste: 'yard waste',
    hot_tub: 'hot tub/spa',
    construction: 'construction debris',
    electronics: 'electronics',
    other: 'miscellaneous items'
  };

  return labels[type] || type;
}

/**
 * Format heavy material type for display
 */
function formatHeavyMaterialType(type) {
  const labels = {
    construction: 'Heavy construction debris',
    yard_debris: 'Heavy yard waste',
    appliances_heavy: 'Heavy appliances',
    special_items: 'Special heavy items'
  };
  
  return labels[type] || 'Heavy materials';
}
