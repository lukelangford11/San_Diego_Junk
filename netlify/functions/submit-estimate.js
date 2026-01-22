import { insertLead } from './lib/supabase-client.js';
import { validateLeadSubmission, normalizePhone, normalizeZipCode, sanitizeText } from './lib/validator.js';
import { checkRateLimit, getClientIp } from './lib/rate-limiter.js';
import { estimatePrice } from './lib/price-estimator.js';
import { sendLeadNotification } from './lib/email-notifier.js';
import { analyzePhotos, isVisionEnabled } from './lib/vision-analyzer.js';

/**
 * Netlify Function: Submit Estimate
 * POST /api/submit-estimate
 * 
 * Accepts lead submission, runs AI estimator, stores in database
 */

export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    // Extract and validate data
    const {
      customer_name,
      customer_phone,
      customer_email,
      zip_code,
      photo_urls,
      item_types,
      service_type,              // NEW: User-confirmed service type
      couch_size_override,       // NEW: User-selected couch size (estimator-only)
      additional_notes,
      preferred_pickup_start,
      preferred_pickup_end,
      honeypot // Spam trap field
    } = body;

    // Step 1: Validate input
    const validation = validateLeadSubmission({
      customer_name,
      customer_phone,
      customer_email,
      zip_code,
      photo_urls,
      item_types,
      honeypot
    });

    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          errors: validation.errors
        })
      };
    }

    // Step 2: Rate limiting check
    const clientIp = getClientIp(event.headers);
    const rateLimit = await checkRateLimit(clientIp, 'submit-estimate');

    if (!rateLimit.allowed) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimit.resetAt - new Date()) / 1000)
        },
        body: JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimit.resetAt.toISOString()
        })
      };
    }

    // Step 3: Analyze photos with Vision AI (if enabled)
    let visionData = null;
    if (isVisionEnabled() && photo_urls && photo_urls.length > 0) {
      try {
        console.log('Running Vision AI analysis on', photo_urls.length, 'photos...');
        visionData = await analyzePhotos(photo_urls);
        console.log('Vision AI analysis complete:', visionData);
      } catch (visionError) {
        console.error('Vision AI failed, falling back to legacy pricing:', visionError);
        // Continue without vision data - will use legacy method
      }
    }

    // Step 4: Run AI price estimator (with vision data if available)
    const estimate = estimatePrice({
      visionData: visionData,
      userServiceType: service_type,
      userAccessType: service_type,
      userCouchSize: couch_size_override,
      photoCount: photo_urls.length,
      itemTypes: item_types || [],
      zipCode: zip_code,
      notes: additional_notes || ''
    });

    // Step 5: Prepare lead data for database
    const leadData = {
      // Customer info (normalized)
      customer_name: sanitizeText(customer_name),
      customer_phone: normalizePhone(customer_phone),
      customer_email: customer_email ? sanitizeText(customer_email) : null,
      zip_code: normalizeZipCode(zip_code),

      // Job details
      photo_urls: photo_urls,
      item_types: item_types || [],
      additional_notes: additional_notes ? sanitizeText(additional_notes) : null,
      preferred_pickup_start: preferred_pickup_start || null,
      preferred_pickup_end: preferred_pickup_end || null,

      // Estimate output
      estimated_min_price: estimate.min_price,
      estimated_max_price: estimate.max_price,
      confidence_level: estimate.confidence,
      estimate_assumptions: estimate.assumptions,
      pricing_zone: estimate.zone,
      
      // Vision AI data (if available)
      ai_volume_cubic_yards: visionData?.volumeCubicYards || null,
      ai_detected_items: visionData?.itemCategories || null,
      ai_access_difficulty: visionData?.accessDifficulty || null,
      ai_special_concerns: visionData?.specialConcerns || null,
      ai_confidence: visionData?.confidence || null,
      ai_notes: visionData?.notes || null,
      pricing_method: estimate.method || 'legacy',
      
      // NEW: Enhanced pricing fields
      service_type_inferred: visionData?.inferredServiceType || null,
      service_type_confirmed: service_type || null,
      service_type_confidence: visionData?.serviceTypeConfidence || null,
      cubic_yards_raw: visionData?.volumeCubicYards || null,
      cubic_yards_adjusted: estimate.cubic_yards_adjusted || null,
      heavy_materials_detected: estimate.heavy_materials_detected || false,
      heavy_material_type: estimate.heavy_material_type || null,
      pricing_breakdown: estimate.pricing_breakdown || null,
      vision_reasoning_tags: visionData?.visionReasoningTags || null,

      // Lead management defaults
      status: 'unclaimed',
      claimed_by: null,
      claimed_at: null,

      // Metadata
      source: 'web',
      ip_address: clientIp,
      user_agent: event.headers['user-agent'] || null
    };

    // Step 6: Insert into database
    let lead;
    try {
      lead = await insertLead(leadData);
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If DB fails, still return estimate but log error
      // Could fall back to email-only mode here
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Failed to save estimate. Please try again or call us directly.',
          estimate: {
            min_price: estimate.min_price,
            max_price: estimate.max_price,
            confidence: estimate.confidence,
            assumptions: estimate.assumptions
          }
        })
      };
    }

    // Step 7: Send email notification (non-blocking, don't fail if it errors)
    sendLeadNotification(lead).catch(emailError => {
      console.error('Email notification failed (non-critical):', emailError);
    });

    // Step 8: Return success response (iOS-ready format)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
      },
      body: JSON.stringify({
        success: true,
        lead_id: lead.id,
        
        // Customer info
        customer_name: sanitizeText(customer_name),
        zip_code: normalizeZipCode(zip_code),
        
        // Estimate details (enhanced for iOS)
        cubic_yards: estimate.cubic_yards_raw || null,
        cubic_yards_adjusted: estimate.cubic_yards_adjusted || null,
        service_type: estimate.service_type_used || 'unknown',
        service_type_source: estimate.service_type_source || 'unknown',
        access_type: service_type || null,
        
        estimate: {
          min_price: estimate.min_price,
          max_price: estimate.max_price,
          confidence: estimate.confidence,
          assumptions: estimate.assumptions
        },
        
        // Item details
        item_types: item_types || [],
        ai_detected_items: visionData?.itemCategories || [],
        detected_items: visionData?.detectedItems || [],
        heavy_materials: estimate.heavy_materials_detected || false,
        
        // Photos
        photo_urls: photo_urls,
        
        // Metadata
        created_at: new Date().toISOString(),
        zone: estimate.zone,
        pricing_method: estimate.method || 'legacy',
        
        message: 'Estimate saved successfully! We\'ll contact you soon.'
      })
    };

  } catch (error) {
    console.error('Unexpected error in submit-estimate:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'An unexpected error occurred. Please try again or contact us directly.'
      })
    };
  }
}
